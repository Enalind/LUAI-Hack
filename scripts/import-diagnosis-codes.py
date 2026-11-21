"""Rebuild the pinned ICD-10-SE 2026 index from the authority's TSV.

Usage: python3 scripts/import-diagnosis-codes.py /path/to/icd-10-se.tsv
Download URL and SHA-256 are recorded in data/icd-10-se-2026.json.
"""
import csv
import hashlib
import json
import pathlib
import re
import sys

source = pathlib.Path(sys.argv[1])
codes = {}
blocked = set()
with source.open(encoding="utf-8-sig") as handle:
    for row in csv.DictReader(handle, delimiter="\t"):
        code = row["Kod"]
        if row["Ej huvuddiagnos"].strip():
            blocked.add(code)
        if re.fullmatch(r"[A-Z][0-9]{2}(?:\.[0-9A-Z]{1,2})?", code) and row["Titel"]:
            codes[code] = {"code": code, "title": row["Titel"], "parent": row["Överordnad kod"], "notPrimary": False, "selectable": True}

parents = {code.split(".")[0] for code in codes if "." in code}
for code, entry in codes.items():
    entry["selectable"] = not ("." not in code and code in parents)
    current = code
    seen = set()
    while current and current not in seen:
        seen.add(current)
        if current in blocked:
            entry["notPrimary"] = True
            break
        current = codes.get(current, {}).get("parent", "")
for entry in codes.values():
    del entry["parent"]

catalogue = {
    "system": "ICD-10-SE", "version": "2026-01-01", "publisher": "Socialstyrelsen / E-hälsomyndigheten",
    "sourceUrl": "https://samarbetsyta.ehalsomyndigheten.se/download/attachments/451267009/icd-10-se.tsv?api=v2&modificationDate=1779615619577&version=1",
    "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(), "codes": list(codes.values()),
}
output = pathlib.Path(__file__).resolve().parent.parent / "data" / "icd-10-se-2026.json"
output.write_text(json.dumps(catalogue, ensure_ascii=False, separators=(",", ":")) + "\n")
print(f"Imported {len(codes)} codes into {output.name}")
