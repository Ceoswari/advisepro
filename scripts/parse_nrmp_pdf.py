"""
Parse NRMP Program Results PDF (2022-2026) into a CSV.

Layout (from x-position analysis):
  x≈19  : specialty name (on data rows) OR state/institution/city (on header rows)
  x≈208 : program code  ← key anchor; if present → data row
  x≈271 : 2026 quota
  x≈305 : 2026 filled
  x≈341 : 2025 quota
  x≈378 : 2025 filled
  x≈409 : 2024 quota
  x≈444 : 2024 filled
  x≈477 : 2023 quota
  x≈510 : 2023 filled
  x≈543 : 2022 quota
  x≈577 : 2022 filled
"""

import pdfplumber, csv, re, sys, os

PDF_PATH = "/Users/ceoswari/Downloads/Main_Match_Program_Results_2022-2026.pdf"
OUT_PATH = "/Users/ceoswari/AdvisePro/scripts/nrmp_programs.csv"

CODE_RE  = re.compile(r'^\d{7}[A-Z]\d{0,3}$')
STATE_RE = re.compile(r'^[A-Z][A-Z\s]+$')   # all uppercase

def is_code(s):
    return bool(CODE_RE.match(s.strip()))

def clean(v):
    v = v.strip()
    return '' if v in ('--', '—', '-', '') else v

def in_col(x, center, tol=18):
    return abs(x - center) < tol

def parse_pdf():
    rows = []
    state = institution = city = ''

    with pdfplumber.open(PDF_PATH) as pdf:
        total = len(pdf.pages)
        print(f"Parsing {total} pages...", flush=True)

        for page_num, page in enumerate(pdf.pages):
            # Skip front matter (cover, copyright, description, code guide, ACGME table)
            if page_num < 5:
                continue

            words = page.extract_words(x_tolerance=3, y_tolerance=3)
            if not words:
                continue

            # Group words by y-position (4px buckets — keeps same-line words together
            # even when pdfplumber reports slightly different y for adjacent words)
            lines = {}
            for w in words:
                y = int(w['top'] / 4) * 4
                lines.setdefault(y, []).append(w)

            for y in sorted(lines):
                line_words = sorted(lines[y], key=lambda w: w['x0'])

                # Skip page header / footer
                text_joined = ' '.join(w['text'] for w in line_words)
                if 'Program Results' in text_joined and 'Main Residency' in text_joined:
                    continue
                if 'Reproduction prohibited' in text_joined:
                    continue
                if re.match(r'Page \d+ of \d+', text_joined):
                    continue

                # Find program code word (x ≈ 205-225)
                code_word = next(
                    (w for w in line_words if in_col(w['x0'], 208, 22) and is_code(w['text'])),
                    None
                )

                if code_word:
                    # ── DATA ROW ──────────────────────────────────────────────
                    # Specialty = all words at x < 200
                    specialty_parts = [w['text'] for w in line_words if w['x0'] < 200]
                    specialty = ' '.join(specialty_parts).strip()

                    # Values at known x positions (quota/filled per year)
                    def val_at(cx):
                        w = next((w for w in line_words if in_col(w['x0'], cx, 22)), None)
                        return clean(w['text']) if w else ''

                    if not specialty:
                        continue
                    rows.append({
                        'state':        state,
                        'institution':  institution,
                        'city':         city,
                        'specialty':    specialty,
                        'program_code': code_word['text'],
                        'quota_2026':   val_at(271),
                        'filled_2026':  val_at(306),
                        'quota_2025':   val_at(342),
                        'filled_2025':  val_at(379),
                        'quota_2024':   val_at(410),
                        'filled_2024':  val_at(444),
                        'quota_2023':   val_at(477),
                        'filled_2023':  val_at(511),
                        'quota_2022':   val_at(544),
                        'filled_2022':  val_at(578),
                    })
                else:
                    # ── CONTEXT ROW (state / institution / city / header) ─────
                    # Pick up all text left of the program-code column (x < 205)
                    left_words = [w for w in line_words if w['x0'] < 205]
                    if not left_words:
                        continue

                    left_text = ' '.join(w['text'] for w in left_words).strip()

                    # Skip pure numeric or dashes
                    if not any(c.isalpha() for c in left_text):
                        continue
                    # Skip column header words
                    if left_text in ('Program', 'Code', 'Quota', 'Filled', 'Code'):
                        continue
                    # Skip short year strings
                    if re.match(r'^\d{4}$', left_text):
                        continue

                    # State: ALL CAPS, no digits
                    if STATE_RE.match(left_text) and not any(c.isdigit() for c in left_text):
                        state = left_text.title()
                        institution = ''
                        city = ''
                    # Institution: mixed case, appears before city
                    # Heuristic: if city is not yet set after state, this is institution
                    elif not city:
                        if not institution:
                            institution = left_text
                        else:
                            # Second non-data line after institution = city
                            city = left_text
                    else:
                        # New institution group within same state
                        institution = left_text
                        city = ''

            if (page_num + 1) % 20 == 0:
                print(f"  page {page_num+1}/{total} — {len(rows)} programs", flush=True)

    return rows

def main():
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    rows = parse_pdf()
    print(f"\nTotal: {len(rows)} program-rows")

    fieldnames = [
        'state','institution','city','specialty','program_code',
        'quota_2026','filled_2026',
        'quota_2025','filled_2025',
        'quota_2024','filled_2024',
        'quota_2023','filled_2023',
        'quota_2022','filled_2022',
    ]

    with open(OUT_PATH, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Written → {OUT_PATH}\n")
    print("Sample (first 15 rows):")
    for r in rows[:15]:
        print(f"  {r['state']:<18} | {r['institution']:<35} | {r['city']:<20} | {r['specialty']:<30} | {r['program_code']} | 2026: {r['quota_2026']}/{r['filled_2026']}")

if __name__ == '__main__':
    main()
