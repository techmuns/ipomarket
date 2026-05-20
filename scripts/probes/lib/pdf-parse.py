#!/usr/bin/env python3
"""Phase 0 PDF parser used by P-17 (RHP) and P-18 (anchor circular).

Usage:
  pdf-parse.py rhp <pdf_path> <out_json>
  pdf-parse.py anchor <pdf_path> <out_json>

Output JSON shape (RHP):
  {
    "mode": "rhp",
    "cover_text_first_500": str,
    "page_count": int,
    "tables_first_pages": int,
    "tables_total_estimate": int,
    "ok": bool,
    "errors": [str]
  }

Output JSON shape (anchor):
  {
    "mode": "anchor",
    "page_1_table_rows": int,
    "page_1_table_cols": int,
    "first_5_rows": [[str]],
    "ok": bool,
    "errors": [str]
  }
"""
import json
import sys
import traceback


def parse_rhp(pdf_path: str, out_path: str) -> int:
    result = {
        "mode": "rhp",
        "cover_text_first_500": "",
        "page_count": 0,
        "tables_first_pages": 0,
        "tables_total_estimate": 0,
        "ok": False,
        "errors": [],
    }
    try:
        import pdfplumber  # type: ignore
        with pdfplumber.open(pdf_path) as pdf:
            result["page_count"] = len(pdf.pages)
            cover = pdf.pages[0]
            text = (cover.extract_text() or "")[:500]
            result["cover_text_first_500"] = text
            tables_first = 0
            for p in pdf.pages[:3]:
                try:
                    ts = p.extract_tables() or []
                    tables_first += len(ts)
                except Exception as e:
                    result["errors"].append(f"page-{p.page_number}: {e}")
            result["tables_first_pages"] = tables_first
            result["tables_total_estimate"] = tables_first * max(1, len(pdf.pages) // 3)
            result["ok"] = bool(text) and result["page_count"] > 0
    except Exception as e:
        result["errors"].append(f"{type(e).__name__}: {e}")
        result["errors"].append(traceback.format_exc())
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)
    return 0 if result["ok"] else 1


def parse_anchor(pdf_path: str, out_path: str) -> int:
    result = {
        "mode": "anchor",
        "page_1_table_rows": 0,
        "page_1_table_cols": 0,
        "first_5_rows": [],
        "ok": False,
        "errors": [],
    }
    try:
        try:
            import camelot  # type: ignore
            tables = camelot.read_pdf(pdf_path, pages="1", flavor="lattice")
            if len(tables) == 0:
                tables = camelot.read_pdf(pdf_path, pages="1", flavor="stream")
            if len(tables) > 0:
                df = tables[0].df
                result["page_1_table_rows"] = int(df.shape[0])
                result["page_1_table_cols"] = int(df.shape[1])
                result["first_5_rows"] = df.head(5).values.tolist()
                result["ok"] = df.shape[0] >= 3
            else:
                result["errors"].append("camelot: no tables found on page 1")
        except ImportError:
            import pdfplumber  # type: ignore
            with pdfplumber.open(pdf_path) as pdf:
                page = pdf.pages[0]
                tables = page.extract_tables() or []
                if tables:
                    rows = tables[0]
                    result["page_1_table_rows"] = len(rows)
                    result["page_1_table_cols"] = len(rows[0]) if rows else 0
                    result["first_5_rows"] = rows[:5]
                    result["ok"] = len(rows) >= 3
                else:
                    result["errors"].append("pdfplumber: no tables on page 1")
    except Exception as e:
        result["errors"].append(f"{type(e).__name__}: {e}")
        result["errors"].append(traceback.format_exc())
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)
    return 0 if result["ok"] else 1


def main(argv):
    if len(argv) != 4:
        print("Usage: pdf-parse.py {rhp|anchor} <pdf_path> <out_json>", file=sys.stderr)
        return 2
    mode, pdf_path, out_path = argv[1], argv[2], argv[3]
    if mode == "rhp":
        return parse_rhp(pdf_path, out_path)
    if mode == "anchor":
        return parse_anchor(pdf_path, out_path)
    print(f"unknown mode: {mode}", file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
