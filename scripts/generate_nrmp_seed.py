"""
Generate a SQL seed file from nrmp_programs.csv for import into Supabase.
Run: python3 scripts/generate_nrmp_seed.py
Then paste/run nrmp_seed.sql in the Supabase SQL editor.
"""

import csv, os, re

CSV_PATH = "scripts/nrmp_programs.csv"
OUT_PATH = "scripts/nrmp_seed.sql"

def esc(s):
    if not s:
        return 'NULL'
    return "'" + s.replace("'", "''") + "'"

def num(s):
    if not s:
        return 'NULL'
    try:
        return str(int(s))
    except ValueError:
        return 'NULL'

def main():
    with open(CSV_PATH, newline='', encoding='utf-8') as f:
        rows = list(csv.DictReader(f))

    print(f"Generating SQL for {len(rows)} programs...")

    lines = []
    lines.append("-- NRMP Program Results seed (2022-2026)")
    lines.append("-- Generated from Main_Match_Program_Results_2022-2026.pdf")
    lines.append("-- Run this in the Supabase SQL editor AFTER running match_risk_migration_6.sql")
    lines.append("")
    lines.append("INSERT INTO residency_programs")
    lines.append("  (program_code, specialty, institution, city, state,")
    lines.append("   quota_2022, filled_2022, quota_2023, filled_2023,")
    lines.append("   quota_2024, filled_2024, quota_2025, filled_2025,")
    lines.append("   quota_2026, filled_2026)")
    lines.append("VALUES")

    values = []
    for r in rows:
        v = (
            f"  ({esc(r['program_code'])}, {esc(r['specialty'])}, "
            f"{esc(r['institution'])}, {esc(r['city'])}, {esc(r['state'])}, "
            f"{num(r['quota_2022'])}, {num(r['filled_2022'])}, "
            f"{num(r['quota_2023'])}, {num(r['filled_2023'])}, "
            f"{num(r['quota_2024'])}, {num(r['filled_2024'])}, "
            f"{num(r['quota_2025'])}, {num(r['filled_2025'])}, "
            f"{num(r['quota_2026'])}, {num(r['filled_2026'])})"
        )
        values.append(v)

    lines.append(',\n'.join(values))
    lines.append("ON CONFLICT (program_code) DO UPDATE SET")
    lines.append("  specialty    = EXCLUDED.specialty,")
    lines.append("  institution  = EXCLUDED.institution,")
    lines.append("  city         = EXCLUDED.city,")
    lines.append("  state        = EXCLUDED.state,")
    lines.append("  quota_2022   = EXCLUDED.quota_2022,  filled_2022 = EXCLUDED.filled_2022,")
    lines.append("  quota_2023   = EXCLUDED.quota_2023,  filled_2023 = EXCLUDED.filled_2023,")
    lines.append("  quota_2024   = EXCLUDED.quota_2024,  filled_2024 = EXCLUDED.filled_2024,")
    lines.append("  quota_2025   = EXCLUDED.quota_2025,  filled_2025 = EXCLUDED.filled_2025,")
    lines.append("  quota_2026   = EXCLUDED.quota_2026,  filled_2026 = EXCLUDED.filled_2026,")
    lines.append("  updated_at   = now();")
    lines.append("")
    lines.append(f"-- {len(rows)} programs inserted/updated")

    sql = '\n'.join(lines)
    with open(OUT_PATH, 'w', encoding='utf-8') as f:
        f.write(sql)

    size_kb = os.path.getsize(OUT_PATH) / 1024
    print(f"Written → {OUT_PATH}  ({size_kb:.0f} KB)")
    print(f"Paste this file into the Supabase SQL editor to seed the database.")

if __name__ == '__main__':
    main()
