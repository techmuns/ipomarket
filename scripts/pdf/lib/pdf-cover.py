#!/usr/bin/env python3
"""Phase 5A cover-page extractor.

Pulls issue terms / BRLM / registrar from the first 3 pages of a SEBI-hosted
PDF using `pdfplumber` only. Bounded `raw_snippet` (<= 240 chars) and per-field
confidence + page reference per `phase-5-pdf-intelligence-plan.md` §6, §7.

Usage:
  pdf-cover.py <pdf_path> <out_json>

Output JSON shape (see scripts/pdf/lib/types.ts:CoverExtraction):
  {
    "mode": "cover",
    "parser_version": "5A.1",
    "page_count": int,
    "fields": {
      "company_name":   {"value": str|None, "page": int|None, "confidence": "high|medium|low|null"},
      "document_type":  {"value": str|None, "page": int|None, "confidence": "..."},
      "issue_size_cr":  {"value": float|None, "page": int|None, "confidence": "..."},
      "price_band":     {"value": {"low": float, "high": float}|None, "page": int|None, "confidence": "..."},
      "lot_size":       {"value": int|None,   "page": int|None, "confidence": "..."},
      "face_value":     {"value": float|None, "page": int|None, "confidence": "..."},
      "brlms":          {"value": [str]|None, "page": int|None, "confidence": "..."},
      "registrar":      {"value": str|None,   "page": int|None, "confidence": "..."}
    },
    "anchors_matched": int,
    "anchors_total":   int,
    "raw_snippet":     str,   # <= 240 chars near the matched anchors
    "overall_confidence": "high|medium|low",
    "ok": bool,
    "errors": [str]
  }
"""
import json
import re
import sys
import traceback

PARSER_VERSION = "5A.1"
SNIPPET_CAP = 240
ANCHOR_LABELS = [
    "price band",
    "issue size",
    "fresh issue",
    "offer for sale",
    "lot size",
    "face value",
    "brlm",
    "registrar",
]


def _empty_field():
    return {"value": None, "page": None, "confidence": None}


def _confidence_overall(matched: int, total: int) -> str:
    if matched >= 6:
        return "high"
    if matched >= 3:
        return "medium"
    return "low"


def _confidence_field(found: bool) -> str:
    # Per-field confidence on cover-page extraction is binary at this stage:
    # the field was either anchored to the source text or it wasn't. The
    # overall confidence in the result reflects breadth of matched anchors.
    return "high" if found else "low"


_NUM_INT_RE = re.compile(r"[\d,]+")
_NUM_FLOAT_RE = re.compile(r"[\d,]+(?:\.\d+)?")

# Phase 5A.1 — header-row blocklist. Cover pages in SEBI prospectuses
# commonly carry a table whose header row reads "NAME OF THE REGISTRAR
# CONTACT PERSON EMAIL AND TELEPHONE" or "LOGO OF THE BRLM NAME CONTACT
# PERSON TELEPHONE AND EMAIL". The previous heuristics captured these
# header rows as if they were values; this regex rejects them.
_HEADER_BLOCKLIST = re.compile(
    r"^(?:logo of\b|name of the\b|name of\b|contact person|"
    r"telephone\s+and\s+email|email\s+and\s+telephone|"
    r"name\s+address\s+and\s+contact|sl\.?\s*no\.?\b|s\.?\s*no\.?\b)",
    re.IGNORECASE,
)

# A line that "looks like" a firm name should carry at least one of these
# tokens. Used by BRLM and registrar to reject ALL-CAPS header rows that
# happen to match the lead regex but carry no entity signal.
_FIRM_SUFFIX = re.compile(
    r"\b(?:limited|ltd\.?|capital|securities|advisors?|advisers?|"
    r"holdings|financial|merchant|managers?|services|technologies?|"
    r"intime|kfin|kfintech|skyline|bigshare|link|cameo|maashitla|registrars?)\b",
    re.IGNORECASE,
)

# Contact / next-section stoplines for BRLM line walk. A "contact" stop
# (Tel:/E-mail:/Contact Person) halts capture mid-line but doesn't end the
# walk. A "section" stop (Registrar to / Statutory Auditors / Bankers to)
# ends the walk entirely.
_BRLM_CONTACT_STOP = re.compile(
    r"(?:\btel\.?[:\s]|\btelephone[:\s]|\be-?mail[:\s]|\bemail[:\s]|\bcontact person\b|\bphone[:\s])",
    re.IGNORECASE,
)
_BRLM_SECTION_STOP = re.compile(
    r"^(?:registrar to\b|statutory auditors?\b|bankers? to\b|"
    r"investor grievance\b|legal advisors?\b|legal counsel\b)",
    re.IGNORECASE,
)


def _looks_like_header(s: str) -> bool:
    """Return True if `s` matches a known header-row pattern OR is ALL-CAPS
    boilerplate with no firm-suffix marker."""
    if not s:
        return True
    stripped = s.strip()
    if _HEADER_BLOCKLIST.search(stripped):
        return True
    # ALL-CAPS line with no firm-suffix → likely a header row.
    is_mostly_caps = len(stripped) >= 6 and sum(
        1 for c in stripped if c.isalpha()
    ) >= 6 and stripped == stripped.upper()
    if is_mostly_caps and not _FIRM_SUFFIX.search(stripped):
        return True
    return False


def _to_float(s: str) -> float | None:
    try:
        return float(s.replace(",", "").strip())
    except Exception:
        return None


def _to_int(s: str) -> int | None:
    try:
        return int(s.replace(",", "").strip())
    except Exception:
        return None


def _extract_price_band(text: str) -> tuple[dict | None, str | None]:
    # Patterns like "Price Band: ₹73 to ₹77 per Equity Share" or "₹73 - ₹77"
    m = re.search(
        r"price\s+band[^\d]{0,40}(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)\s*(?:to|-|–|—)\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)",
        text,
        re.IGNORECASE,
    )
    if not m:
        return None, None
    low = _to_float(m.group(1))
    high = _to_float(m.group(2))
    if low is None or high is None:
        return None, None
    if low > high:
        low, high = high, low
    return {"low": low, "high": high}, m.group(0)


def _extract_issue_size(text: str) -> tuple[float | None, str | None]:
    # Issue size in Crores. SEBI documents almost always quote ₹ X.XX Cr or
    # ₹ X.XX Crores or "aggregating up to ₹ X.XX Crores".
    m = re.search(
        r"(?:aggregating(?:\s+up)?\s+to\s+)?(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)\s*(?:cr(?:ore)?s?|lakh)",
        text,
        re.IGNORECASE,
    )
    if not m:
        return None, None
    val = _to_float(m.group(1))
    unit_lakh = "lakh" in m.group(0).lower()
    if val is None:
        return None, None
    if unit_lakh:
        val = val / 100.0  # 1 Cr = 100 lakh
    return val, m.group(0)


def _extract_lot_size(text: str) -> tuple[int | None, str | None]:
    m = re.search(
        r"(?:bid\s+lot|lot\s+size|minimum\s+(?:bid|application)\s+(?:lot|size))[^\d]{0,40}([\d,]+)\s*(?:equity\s+)?shares?",
        text,
        re.IGNORECASE,
    )
    if not m:
        return None, None
    return _to_int(m.group(1)), m.group(0)


def _extract_face_value(text: str) -> tuple[float | None, str | None]:
    m = re.search(
        r"face\s+value[^\d]{0,40}(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)",
        text,
        re.IGNORECASE,
    )
    if not m:
        return None, None
    return _to_float(m.group(1)), m.group(0)


def _extract_brlms(text: str) -> tuple[list[str] | None, str | None]:
    """Line-based BRLM extraction (Phase 5A.1 rewrite).

    Finds the "Book Running Lead Manager(s)" heading line, then walks
    forward up to 25 lines, applying:
      - header-row blocklist (`_looks_like_header`)
      - section-boundary stop (`_BRLM_SECTION_STOP` → end walk)
      - contact-info trim (`_BRLM_CONTACT_STOP` → slice line at marker)
      - firm-suffix allowlist (`_FIRM_SUFFIX` must match)
    Returns up to 5 cleaned firm names.
    """
    lines = text.splitlines()
    heading_re = re.compile(r"book[\s-]+running\s+lead\s+manager[s]?", re.IGNORECASE)
    heading_idx = -1
    heading_snippet = ""
    for i, ln in enumerate(lines):
        if heading_re.search(ln):
            heading_idx = i
            heading_snippet = ln.strip()
            break
    if heading_idx < 0:
        return None, None

    candidates: list[str] = []
    end_walk = min(len(lines), heading_idx + 1 + 25)
    for j in range(heading_idx + 1, end_walk):
        raw = lines[j]
        s = raw.strip()
        if not s:
            continue
        # Section boundary: end the walk entirely.
        if _BRLM_SECTION_STOP.search(s):
            break
        # Header-row blocklist: skip but keep walking.
        if _looks_like_header(s):
            continue
        # Contact-info trim: if Tel: / E-mail: / Contact Person appears
        # inside the line, slice the firm-name prefix only.
        contact_m = _BRLM_CONTACT_STOP.search(s)
        if contact_m:
            firm = s[: contact_m.start()].strip()
            firm = firm.rstrip(".,;:").rstrip("-").strip()
            # If the trim left nothing recognizable, drop it.
            if not firm:
                continue
            s = firm
        # Firm-suffix allowlist: line must look like a firm name.
        if not _FIRM_SUFFIX.search(s):
            continue
        # Drop parenthetical continuations like "(formerly known as ...)" —
        # these are not separate firms.
        if re.match(r"^\(formerly\s+known\s+as\b", s, re.IGNORECASE):
            continue
        candidates.append(s)
        if len(candidates) >= 5:
            break

    if not candidates:
        return None, heading_snippet
    return candidates, heading_snippet


def _extract_registrar(text: str) -> tuple[str | None, str | None]:
    """Iterate up to 3 successive regex matches for the registrar anchor;
    reject any whose captured group is a header-row pattern; return the
    first survivor (or None).
    """
    patterns = [
        re.compile(
            r"registrar\s+to\s+the\s+(?:issue|offer)\s*[:\n]?\s*([A-Z][A-Za-z0-9 &().,'-]{4,80})",
            re.IGNORECASE,
        ),
        re.compile(
            r"registrar\s*[:\n]\s*([A-Z][A-Za-z0-9 &().,'-]{4,80})",
            re.IGNORECASE,
        ),
    ]
    # Try the strict-anchor pattern first; for each, walk through all matches
    # in document order, returning the first non-header capture.
    for pat in patterns:
        attempts = 0
        for m in pat.finditer(text):
            attempts += 1
            if attempts > 3:
                break
            candidate = m.group(1).strip().rstrip(".").strip()
            if _looks_like_header(candidate):
                continue
            # Optional: the actual registrar firm name almost always carries
            # a known registrar-firm token; if not, downgrade by requiring
            # a firm-suffix marker.
            if not _FIRM_SUFFIX.search(candidate):
                continue
            return candidate, m.group(0)
    return None, None


def _extract_company_name(first_lines: list[str]) -> tuple[str | None, str | None]:
    # Heuristic: first non-empty line >= 10 chars + contains "limited"/"ltd"
    # is almost always the company name on SEBI cover pages.
    for line in first_lines[:30]:
        s = line.strip()
        if len(s) < 10:
            continue
        low = s.lower()
        if " limited" in low or " ltd" in low:
            return s, s
    return None, None


def _extract_document_type(text: str) -> tuple[str | None, str | None]:
    candidates = [
        "Draft Abridged Prospectus",
        "Abridged Prospectus",
        "Draft Red Herring Prospectus",
        "Red Herring Prospectus",
        "Prospectus",
    ]
    low = text.lower()
    for c in candidates:
        if c.lower() in low:
            return c, c
    return None, None


def parse_cover(pdf_path: str, out_path: str) -> int:
    result = {
        "mode": "cover",
        "parser_version": PARSER_VERSION,
        "page_count": 0,
        "fields": {
            "company_name": _empty_field(),
            "document_type": _empty_field(),
            "issue_size_cr": _empty_field(),
            "price_band": _empty_field(),
            "lot_size": _empty_field(),
            "face_value": _empty_field(),
            "brlms": _empty_field(),
            "registrar": _empty_field(),
        },
        "anchors_matched": 0,
        "anchors_total": len(ANCHOR_LABELS),
        "raw_snippet": "",
        "overall_confidence": "low",
        "ok": False,
        # Phase 5A.1 — Python-side manual-review flag. Set to True when
        # at least one ANCHOR_LABEL was found in the text (proving the
        # cover page IS there) but the corresponding field came back null
        # after blocklist rejection (proving our extractor's heuristics
        # missed it). The orchestrator ORs this with conf === 'low' when
        # composing the audit row's manual_review_required.
        "needs_manual_review": False,
        "errors": [],
    }
    try:
        import pdfplumber  # type: ignore
        with pdfplumber.open(pdf_path) as pdf:
            result["page_count"] = len(pdf.pages)
            if result["page_count"] == 0:
                result["errors"].append("pdf has 0 pages")
                _dump(result, out_path)
                return 1

            # Concatenate text from first 3 pages; track which page each
            # match came from for the page-ref recording.
            page_texts: list[tuple[int, str]] = []
            for i, page in enumerate(pdf.pages[: min(3, result["page_count"])], start=1):
                try:
                    t = page.extract_text() or ""
                except Exception as e:
                    result["errors"].append(f"page-{i}-extract: {type(e).__name__}: {e}")
                    t = ""
                page_texts.append((i, t))
            joined = "\n".join(t for _, t in page_texts)

            # Company name from page 1's line iteration.
            first_lines = page_texts[0][1].splitlines() if page_texts else []
            cname, _ = _extract_company_name(first_lines)
            if cname:
                result["fields"]["company_name"] = {
                    "value": cname,
                    "page": 1,
                    "confidence": _confidence_field(True),
                }

            # Document type.
            dtype, _ = _extract_document_type(joined)
            if dtype:
                result["fields"]["document_type"] = {
                    "value": dtype,
                    "page": _find_page(dtype, page_texts),
                    "confidence": _confidence_field(True),
                }

            # Price band.
            pb, pb_snippet = _extract_price_band(joined)
            if pb:
                result["fields"]["price_band"] = {
                    "value": pb,
                    "page": _find_page(pb_snippet, page_texts),
                    "confidence": _confidence_field(True),
                }

            # Issue size.
            isz, isz_snippet = _extract_issue_size(joined)
            if isz is not None:
                result["fields"]["issue_size_cr"] = {
                    "value": isz,
                    "page": _find_page(isz_snippet, page_texts),
                    "confidence": _confidence_field(True),
                }

            # Lot size.
            lot, lot_snippet = _extract_lot_size(joined)
            if lot is not None:
                result["fields"]["lot_size"] = {
                    "value": lot,
                    "page": _find_page(lot_snippet, page_texts),
                    "confidence": _confidence_field(True),
                }

            # Face value.
            fv, fv_snippet = _extract_face_value(joined)
            if fv is not None:
                result["fields"]["face_value"] = {
                    "value": fv,
                    "page": _find_page(fv_snippet, page_texts),
                    "confidence": _confidence_field(True),
                }

            # BRLMs.
            brlms, brlm_snippet = _extract_brlms(joined)
            if brlms:
                result["fields"]["brlms"] = {
                    "value": brlms,
                    "page": _find_page(brlm_snippet, page_texts),
                    "confidence": _confidence_field(True),
                }

            # Registrar.
            reg, reg_snippet = _extract_registrar(joined)
            if reg:
                result["fields"]["registrar"] = {
                    "value": reg,
                    "page": _find_page(reg_snippet, page_texts),
                    "confidence": _confidence_field(True),
                }

            # Anchors-matched count (across the eight ANCHOR_LABELS).
            joined_lower = joined.lower()
            matched = sum(1 for lbl in ANCHOR_LABELS if lbl in joined_lower)
            result["anchors_matched"] = matched
            result["overall_confidence"] = _confidence_overall(matched, len(ANCHOR_LABELS))

            # Phase 5A.1 — needs_manual_review semantics.
            # When the cover-page text DOES contain a BRLM or registrar
            # anchor (so we know the section exists) but the extracted
            # field is null (blocklist rejection or regex miss), flag
            # the row for manual review. The orchestrator ORs this with
            # `overall_confidence === 'low'`.
            brlm_anchor_present = "brlm" in joined_lower
            registrar_anchor_present = "registrar" in joined_lower
            if (
                brlm_anchor_present and result["fields"]["brlms"]["value"] is None
            ) or (
                registrar_anchor_present
                and result["fields"]["registrar"]["value"] is None
            ):
                result["needs_manual_review"] = True

            # Raw snippet: the first ~SNIPPET_CAP chars after the first
            # matched anchor (so a reviewer can spot-check provenance).
            snippet = ""
            for lbl in ANCHOR_LABELS:
                idx = joined_lower.find(lbl)
                if idx >= 0:
                    snippet = joined[idx : idx + SNIPPET_CAP].strip()
                    break
            if not snippet and joined:
                snippet = joined[:SNIPPET_CAP].strip()
            result["raw_snippet"] = snippet[:SNIPPET_CAP]

            # OK if at least 3 anchors matched AND at least one extracted
            # field has a non-null value.
            any_field = any(
                result["fields"][k]["value"] is not None
                for k in result["fields"].keys()
            )
            result["ok"] = matched >= 3 and any_field
    except Exception as e:
        result["errors"].append(f"{type(e).__name__}: {e}")
        result["errors"].append(traceback.format_exc())

    _dump(result, out_path)
    return 0 if result["ok"] else 1


def _find_page(needle: str | None, page_texts: list[tuple[int, str]]) -> int | None:
    if not needle:
        return None
    for page_num, text in page_texts:
        if needle in text:
            return page_num
    return None


def _dump(obj: dict, out_path: str) -> None:
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2)


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print("Usage: pdf-cover.py <pdf_path> <out_json>", file=sys.stderr)
        return 2
    return parse_cover(argv[1], argv[2])


if __name__ == "__main__":
    sys.exit(main(sys.argv))
