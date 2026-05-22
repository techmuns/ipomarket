#!/usr/bin/env python3
"""Phase 5A financial-table FEASIBILITY detector.

This is NOT a normalized P&L extractor. Phase 5A only asks: does this PDF
contain pages whose headings + tables look like restated financial statements
that a future Phase 5B parser could lift cleanly? Returns candidate pages,
detected table dimensions, and an overall confidence verdict per the spec in
`phase-5-pdf-intelligence-plan.md` §6 (Financial statements row).

Usage:
  pdf-financials.py <pdf_path> <out_json>

Output JSON shape (see scripts/pdf/lib/types.ts:FinancialsExtraction):
  {
    "mode": "financials_feasibility",
    "parser_version": "5A.1",
    "page_count": int,
    "candidate_pages": [
      {"page": int, "heading_match": str, "raw_snippet": str (<= 240 chars)}
    ],
    "tables_detected": [
      {
        "page": int,
        "flavor": "lattice|stream|pdfplumber",
        "rows": int,
        "cols": int,
        "header_row_sample": [str],
        "confidence_signal": "high|medium|low"
      }
    ],
    "overall_confidence": "high|medium|low",
    "ok": bool,
    "errors": [str]
  }
"""
import json
import re
import sys
import traceback

PARSER_VERSION = "5B.0"
SNIPPET_CAP = 240
MAX_PAGE_SCAN = 800  # safety cap on very large PDFs
MAX_TABLE_PROBES = 10  # don't run camelot on more than N candidate pages

# Phase 5B HARD GATE caps for `tables_with_cells[]` (enforced at extractor boundary).
# These are binding per phase-5B-financial-normalization-plan.md §8.1 — the extractor
# refuses to emit unbounded cell payloads even if downstream code would want them.
MAX_ROWS_PER_TABLE = 100
MAX_COLS_PER_TABLE = 8
MAX_CHARS_PER_CELL = 200
MAX_TOTAL_CELLS_BYTES = 200_000  # 200 KB serialised JSON per IPO
TEXT_WINDOW_CHARS = 1024  # bytes of page text emitted per qualifying table (for unit / scope / form hints)

FINANCIAL_HEADINGS = [
    "restated financial information",
    "restated statement of profit and loss",
    "restated statement of assets and liabilities",
    "restated summary statement",
    "statement of profit and loss",
    "balance sheet",
    "summary of financial information",
    "cash flow statement",
    "statement of cash flows",
]

PERIOD_PATTERNS = [
    re.compile(r"FY\s?\d{2}", re.IGNORECASE),
    re.compile(r"fiscal\s+\d{4}", re.IGNORECASE),
    re.compile(r"for the year ended", re.IGNORECASE),
    re.compile(r"as at march 31", re.IGNORECASE),
    re.compile(r"nine months ended|9M FY|H1 FY", re.IGNORECASE),
]


def _confidence_table(rows: int, cols: int, header_has_period: bool) -> str:
    if header_has_period and rows >= 5 and cols >= 3:
        return "high"
    if header_has_period and rows >= 3 and cols >= 2:
        return "medium"
    if rows >= 3 and cols >= 2:
        return "medium"
    return "low"


def _header_has_period(header_cells: list[str]) -> bool:
    joined = " ".join(header_cells or [])
    return any(p.search(joined) for p in PERIOD_PATTERNS)


def _detect_candidate_pages(pdf) -> list[dict]:
    candidates: list[dict] = []
    pages = pdf.pages
    scan_limit = min(len(pages), MAX_PAGE_SCAN)
    for i in range(scan_limit):
        try:
            text = pages[i].extract_text() or ""
        except Exception:
            continue
        low = text.lower()
        for heading in FINANCIAL_HEADINGS:
            idx = low.find(heading)
            if idx >= 0:
                snippet = text[idx : idx + SNIPPET_CAP].strip()
                candidates.append(
                    {
                        "page": i + 1,
                        "heading_match": heading,
                        "raw_snippet": snippet[:SNIPPET_CAP],
                    }
                )
                break  # one heading per page is enough
    return candidates


def _probe_tables_camelot(pdf_path: str, page_num: int) -> list[dict]:
    out: list[dict] = []
    try:
        import camelot  # type: ignore
    except ImportError:
        return out
    for flavor in ("lattice", "stream"):
        try:
            tables = camelot.read_pdf(pdf_path, pages=str(page_num), flavor=flavor)
        except Exception:
            continue
        for t in tables or []:
            try:
                df = t.df
                rows = int(df.shape[0])
                cols = int(df.shape[1])
                header = [str(x).strip() for x in df.iloc[0].tolist()] if rows > 0 else []
                has_period = _header_has_period(header)
                # Phase 5B: also capture body cells under an internal-only key
                # (`_cells`) that gets stripped before JSON write. Used by the
                # downstream tables_with_cells[] builder.
                raw_cells: list[list] = []
                try:
                    raw_cells = df.values.tolist()
                except Exception:
                    raw_cells = []
                out.append(
                    {
                        "page": page_num,
                        "flavor": flavor,
                        "rows": rows,
                        "cols": cols,
                        "header_row_sample": header[:6],
                        "confidence_signal": _confidence_table(rows, cols, has_period),
                        "_cells": raw_cells,
                    }
                )
            except Exception:
                continue
        if out:
            return out  # prefer lattice if it yielded; don't double-count stream
    return out


def _probe_tables_pdfplumber(page) -> list[dict]:
    out: list[dict] = []
    try:
        tables = page.extract_tables() or []
    except Exception:
        return out
    for tbl in tables:
        rows = len(tbl)
        cols = max((len(r) for r in tbl), default=0)
        header = [str(x).strip() if x is not None else "" for x in (tbl[0] if rows > 0 else [])]
        has_period = _header_has_period(header)
        out.append(
            {
                "page": page.page_number,
                "flavor": "pdfplumber",
                "rows": rows,
                "cols": cols,
                "header_row_sample": header[:6],
                "confidence_signal": _confidence_table(rows, cols, has_period),
                # Phase 5B: pdfplumber tables are already list-of-lists.
                "_cells": tbl if isinstance(tbl, list) else [],
            }
        )
    return out


# ─── Phase 5B helpers — tables_with_cells builder + payload cap ──────────────

def _cap_cells(rows_data: list, max_rows: int, max_cols: int, max_chars: int) -> list[list[str]]:
    """Apply the per-table HARD GATE caps. None / non-str cells coerced to str."""
    capped: list[list[str]] = []
    for row in (rows_data or [])[:max_rows]:
        if row is None:
            continue
        out_row: list[str] = []
        try:
            iterable = list(row)
        except TypeError:
            iterable = []
        for cell in iterable[:max_cols]:
            s = "" if cell is None else str(cell)
            # Phase 5B: cap each cell at MAX_CHARS_PER_CELL.
            if len(s) > max_chars:
                s = s[:max_chars] + "…"
            out_row.append(s)
        capped.append(out_row)
    return capped


def _detect_scope_hint(text: str) -> str | None:
    if not text:
        return None
    upper = text.upper()
    # Restated-prefixed forms first (more specific).
    if "RESTATED CONSOLIDATED" in upper:
        return "Consolidated"
    if "RESTATED STANDALONE" in upper:
        return "Standalone"
    has_cons = "CONSOLIDATED" in upper
    has_stand = "STANDALONE" in upper
    if has_cons and not has_stand:
        return "Consolidated"
    if has_stand and not has_cons:
        return "Standalone"
    return None


def _detect_form_hint(text: str) -> str | None:
    if not text:
        return None
    lower = text.lower()
    # Order matters: more specific phrases first.
    if "restated statement of profit and loss" in lower:
        return "Restated Statement of Profit and Loss"
    if "restated statement of assets and liabilities" in lower:
        return "Restated Statement of Assets and Liabilities"
    if "restated statement of cash flows" in lower or "restated statement of cash flow" in lower:
        return "Restated Statement of Cash Flows"
    if "restated summary statement" in lower or "restated financial information" in lower:
        return "Restated Financial Information"
    if "statement of profit and loss" in lower:
        return "Statement of Profit and Loss"
    if "balance sheet" in lower:
        return "Balance Sheet"
    if "statement of cash flows" in lower or "cash flow statement" in lower:
        return "Statement of Cash Flows"
    return None


def _build_tables_with_cells(pdf, tables: list[dict], candidates: list[dict]) -> list[dict]:
    """Build the additive `tables_with_cells[]` block.

    For each table with confidence_signal in {high, medium} AND a candidate-page
    heading match, capture bounded cells + a TEXT_WINDOW_CHARS-truncated page text
    excerpt for downstream unit / scope / form detection.
    """
    out: list[dict] = []
    candidate_page_set = {c["page"] for c in (candidates or [])}
    page_text_cache: dict[int, str] = {}
    for i, t in enumerate(tables):
        if t.get("confidence_signal") not in ("high", "medium"):
            continue
        page = t.get("page")
        if page not in candidate_page_set:
            continue
        raw_cells = t.get("_cells") or []
        if not raw_cells:
            continue
        # Fetch + cache page text window (bounded).
        if page not in page_text_cache:
            try:
                page_text_cache[page] = (pdf.pages[page - 1].extract_text() or "")[
                    :TEXT_WINDOW_CHARS
                ]
            except Exception:
                page_text_cache[page] = ""
        text_window = page_text_cache[page]
        cells = _cap_cells(
            raw_cells, MAX_ROWS_PER_TABLE, MAX_COLS_PER_TABLE, MAX_CHARS_PER_CELL
        )
        if not cells:
            continue
        out.append(
            {
                "table_index": i,
                "page": page,
                "flavor": t.get("flavor"),
                "confidence_signal": t.get("confidence_signal"),
                "scope_hint": _detect_scope_hint(text_window),
                "form_hint": _detect_form_hint(text_window),
                "page_text_window": text_window,
                "cells": cells,
            }
        )
    return out


def _apply_payload_cap(
    twc: list[dict], max_bytes: int
) -> tuple[list[dict], list[str]]:
    """Enforce the 200 KB total payload cap.

    Drops the lowest-confidence (then largest-row-count) entry until the
    serialised JSON of `tables_with_cells[]` fits within the cap. Each drop
    is recorded in the returned warnings list.
    """
    warnings: list[str] = []
    priority = {"high": 0, "medium": 1, "low": 2}
    while twc:
        encoded = json.dumps(twc, ensure_ascii=False).encode("utf-8")
        if len(encoded) <= max_bytes:
            return twc, warnings
        # Pick the worst entry: lowest confidence, then most rows (largest payload).
        worst_idx = max(
            range(len(twc)),
            key=lambda i: (
                priority.get(twc[i].get("confidence_signal", "low"), 9),
                len(twc[i].get("cells", [])),
            ),
        )
        dropped = twc.pop(worst_idx)
        warnings.append(
            f"dropped table_index={dropped.get('table_index')} "
            f"(page={dropped.get('page')}, "
            f"confidence={dropped.get('confidence_signal')}, "
            f"rows={len(dropped.get('cells', []))}) "
            f"to fit ≤ {max_bytes}-byte cells-payload cap"
        )
    return twc, warnings


def _strip_internal_keys(tables: list[dict]) -> None:
    """Remove the internal-only `_cells` key from `tables_detected[]` in place
    so the existing feasibility output stays byte-identical to Phase 5A.4
    consumers (additive-only contract)."""
    for t in tables:
        t.pop("_cells", None)


def _overall_confidence(candidates: list[dict], tables: list[dict]) -> str:
    if not candidates:
        return "low"
    high_tables = [t for t in tables if t["confidence_signal"] == "high"]
    if high_tables and len(candidates) >= 2:
        return "high"
    medium_tables = [t for t in tables if t["confidence_signal"] in ("high", "medium")]
    if medium_tables:
        return "medium"
    return "low"


def parse_financials(pdf_path: str, out_path: str) -> int:
    result = {
        "mode": "financials_feasibility",
        "parser_version": PARSER_VERSION,
        "page_count": 0,
        "candidate_pages": [],
        "tables_detected": [],
        # Phase 5B additive: bounded cell data for high/medium-confidence tables.
        # See §8.1 of phase-5B-financial-normalization-plan.md for the cap policy.
        "tables_with_cells": [],
        "tables_with_cells_truncation_warnings": [],
        "overall_confidence": "low",
        "ok": False,
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

            # Step 1 — heading-based candidate page discovery.
            candidates = _detect_candidate_pages(pdf)
            result["candidate_pages"] = candidates

            if not candidates:
                result["errors"].append(
                    "no financial-section headings matched in first %d pages"
                    % min(len(pdf.pages), MAX_PAGE_SCAN)
                )
                _dump(result, out_path)
                return 1

            # Step 2 — per-candidate table probes (capped).
            tables: list[dict] = []
            for c in candidates[:MAX_TABLE_PROBES]:
                page_num = c["page"]
                camelot_tables = _probe_tables_camelot(pdf_path, page_num)
                if camelot_tables:
                    tables.extend(camelot_tables)
                    continue
                # Fallback to pdfplumber on the same page if camelot found
                # nothing — keeps the detector useful when camelot's OpenCV
                # backend isn't available.
                try:
                    pp_tables = _probe_tables_pdfplumber(pdf.pages[page_num - 1])
                    tables.extend(pp_tables)
                except Exception as e:
                    result["errors"].append(
                        f"pdfplumber page-{page_num}: {type(e).__name__}: {e}"
                    )

            # Phase 5B: build additive `tables_with_cells[]` block (bounded per
            # §8.1) BEFORE stripping internal `_cells` from tables_detected.
            twc = _build_tables_with_cells(pdf, tables, candidates)
            twc, twc_warnings = _apply_payload_cap(twc, MAX_TOTAL_CELLS_BYTES)
            result["tables_with_cells"] = twc
            result["tables_with_cells_truncation_warnings"] = twc_warnings

            # Phase 5B: strip the internal-only `_cells` key from
            # tables_detected[] so the existing feasibility output stays
            # byte-identical to Phase 5A.4 consumers (additive contract).
            _strip_internal_keys(tables)

            result["tables_detected"] = tables
            result["overall_confidence"] = _overall_confidence(candidates, tables)

            # ok = at least one candidate page AND at least one detected table.
            result["ok"] = len(candidates) > 0 and len(tables) > 0
    except Exception as e:
        result["errors"].append(f"{type(e).__name__}: {e}")
        result["errors"].append(traceback.format_exc())

    _dump(result, out_path)
    return 0 if result["ok"] else 1


def _dump(obj: dict, out_path: str) -> None:
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2)


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print("Usage: pdf-financials.py <pdf_path> <out_json>", file=sys.stderr)
        return 2
    return parse_financials(argv[1], argv[2])


if __name__ == "__main__":
    sys.exit(main(sys.argv))
