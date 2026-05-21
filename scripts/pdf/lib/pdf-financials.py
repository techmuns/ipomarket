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

PARSER_VERSION = "5A.1"
SNIPPET_CAP = 240
MAX_PAGE_SCAN = 800  # safety cap on very large PDFs
MAX_TABLE_PROBES = 10  # don't run camelot on more than N candidate pages

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
                out.append(
                    {
                        "page": page_num,
                        "flavor": flavor,
                        "rows": rows,
                        "cols": cols,
                        "header_row_sample": header[:6],
                        "confidence_signal": _confidence_table(rows, cols, has_period),
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
            }
        )
    return out


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
