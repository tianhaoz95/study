#!/usr/bin/env python3
"""
Usage:
  python3 scripts/update_presets.py

This script takes the translated and structured paper presets from
`scratch/translated_papers.json` and:
  1. Updates the `PRESET_PAPERS` declaration in DailyPaperDigest.astro.
  2. Updates date-wiring so the new date is shown as "Today":
     - Date chip buttons (Today / Yesterday)
     - Date input max & value
     - JS `currentPapers` and `activePresetDate` initial values
     - Executive summary HTML (new date visible, old today hidden)
     - `toggleExecutiveSummary()` function to handle the new date
"""

import sys
import json
import os
import re
import datetime


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def date_to_mmdd(date_str: str) -> str:
    """'YYYY-MM-DD'  →  'MMDD'  (e.g. '2026-07-02' → '0702')."""
    parts = date_str.split('-')
    return parts[1] + parts[2]


def date_to_pretty_en(date_str: str) -> str:
    """'YYYY-MM-DD'  →  'Month D, YYYY'  (e.g. 'July 2, 2026')."""
    d = datetime.datetime.strptime(date_str, '%Y-%m-%d')
    # %-d removes leading zero on Linux; use %#d on Windows.
    try:
        return d.strftime('%B %-d, %Y')
    except ValueError:
        return d.strftime('%B %#d, %Y')


# ---------------------------------------------------------------------------
# PRESET_PAPERS update
# ---------------------------------------------------------------------------

def update_preset_papers(astro_content: str, date_str: str, new_papers: list) -> str:
    """Replace the PRESET_PAPERS JS object with the updated version."""
    start_marker = "const PRESET_PAPERS = {"
    start_idx = astro_content.find(start_marker)
    if start_idx == -1:
        print("Error: Could not locate const PRESET_PAPERS in Astro component.")
        sys.exit(1)

    next_block_marker = "document.addEventListener"
    next_block_idx = astro_content.find(next_block_marker, start_idx)
    if next_block_idx == -1:
        print("Error: Could not locate document.addEventListener boundary.")
        sys.exit(1)

    end_idx = astro_content.rfind("};", start_idx, next_block_idx)
    if end_idx == -1:
        print("Error: Could not locate end of PRESET_PAPERS block.")
        sys.exit(1)
    end_idx += 2

    existing_str = astro_content[start_idx + len("const PRESET_PAPERS = "):end_idx - 1].strip()
    try:
        presets = json.loads(existing_str)
    except Exception as e:
        print(f"Error parsing existing presets JSON: {e}")
        sys.exit(1)

    presets[date_str] = new_papers
    updated_str = json.dumps(presets, indent=2, ensure_ascii=False)
    new_block = f"const PRESET_PAPERS = {updated_str};"
    return astro_content[:start_idx] + new_block + astro_content[end_idx:]


# ---------------------------------------------------------------------------
# Date-wiring update
# ---------------------------------------------------------------------------

def update_date_wiring(astro_content: str, new_date: str, summary_en: str, summary_zh: str) -> str:
    """
    Update every place in the component that hardcodes 'today's date':
      1. Date chip buttons (Today / Yesterday labels + data-preset-date)
      2. Date input max & value
      3. JS currentPapers and activePresetDate initial values
      4. Executive summary HTML (new date visible, prev today hidden)
      5. toggleExecutiveSummary() JS function
    """

    # --- Detect current active date from the chip ---
    active_match = re.search(
        r'<button class="chip active" data-preset-date="(\d{4}-\d{2}-\d{2})">', astro_content
    )
    if not active_match:
        print("Warning: Could not detect current active date chip; skipping date-wiring update.")
        return astro_content
    prev_today = active_match.group(1)

    if prev_today == new_date:
        print(f"Date wiring already points to {new_date}; no chip/JS update needed.")
        return astro_content

    prev_today_mmdd = date_to_mmdd(prev_today)   # e.g. "0701"
    new_mmdd        = date_to_mmdd(new_date)      # e.g. "0702"

    new_pretty  = date_to_pretty_en(new_date)   # "July 2, 2026"
    prev_pretty = date_to_pretty_en(prev_today)  # "July 1, 2026"

    # 1. Chip buttons ---------------------------------------------------------
    today_chip_re = re.compile(
        r'<button class="chip active" data-preset-date="' + re.escape(prev_today) + r'">'
        r'\s*<span class="lang-en">Today \([^)]+\)</span>'
        r'\s*<span class="lang-zh">今日 \([^)]+\)</span>'
        r'\s*</button>',
        re.DOTALL,
    )
    today_chip_new = (
        f'<button class="chip active" data-preset-date="{new_date}">\n'
        f'        <span class="lang-en">Today ({new_pretty})</span>\n'
        f'        <span class="lang-zh">今日 ({new_date})</span>\n'
        f'      </button>'
    )
    astro_content = today_chip_re.sub(today_chip_new, astro_content)

    yesterday_chip_re = re.compile(
        r'<button class="chip" data-preset-date="[^"]+">'
        r'\s*<span class="lang-en">Yesterday \([^)]+\)</span>'
        r'\s*<span class="lang-zh">昨日 \([^)]+\)</span>'
        r'\s*</button>',
        re.DOTALL,
    )
    yesterday_chip_new = (
        f'<button class="chip" data-preset-date="{prev_today}">\n'
        f'        <span class="lang-en">Yesterday ({prev_pretty})</span>\n'
        f'        <span class="lang-zh">昨日 ({prev_today})</span>\n'
        f'      </button>'
    )
    astro_content = yesterday_chip_re.sub(yesterday_chip_new, astro_content)

    # 2. Date input max & value -----------------------------------------------
    astro_content = re.sub(
        r'max="\d{4}-\d{2}-\d{2}" class="digest-date-input" value="\d{4}-\d{2}-\d{2}"',
        f'max="{new_date}" class="digest-date-input" value="{new_date}"',
        astro_content,
    )

    # 3. JS state variables ---------------------------------------------------
    astro_content = astro_content.replace(
        f'let currentPapers = PRESET_PAPERS["{prev_today}"];',
        f'let currentPapers = PRESET_PAPERS["{new_date}"];',
    )
    astro_content = astro_content.replace(
        f'let activePresetDate = "{prev_today}";',
        f'let activePresetDate = "{new_date}";',
    )

    # 4. Executive summary HTML -----------------------------------------------
    # a. Hide the previous today's summary divs
    astro_content = astro_content.replace(
        f'<div class="summary-text lang-en" id="summary-en-{prev_today_mmdd}">',
        f'<div class="summary-text lang-en hide" id="summary-en-{prev_today_mmdd}">',
    )
    astro_content = astro_content.replace(
        f'<div class="summary-text lang-zh" id="summary-zh-{prev_today_mmdd}">',
        f'<div class="summary-text lang-zh hide" id="summary-zh-{prev_today_mmdd}">',
    )

    # b. Insert new summary block before the old today's comment
    new_summary_block = (
        f'    <!-- {new_date} EN/ZH -->\n'
        f'    <div class="summary-text lang-en" id="summary-en-{new_mmdd}">\n'
        f'      {summary_en}\n'
        f'    </div>\n'
        f'    <div class="summary-text lang-zh" id="summary-zh-{new_mmdd}">\n'
        f'      {summary_zh}\n'
        f'    </div>\n'
    )
    old_today_comment = f'    <!-- {prev_today} EN/ZH -->'
    if old_today_comment in astro_content:
        astro_content = astro_content.replace(
            old_today_comment,
            new_summary_block + old_today_comment,
            1,
        )
    else:
        print(f"Warning: Could not find '{old_today_comment}'; executive summary block not inserted.")

    # 5. toggleExecutiveSummary JS function -----------------------------------
    # a. Add hide lines for the new date in the hide-all block.
    #    Anchor on the first hide line for the previous today.
    prev_hide_en = f"      document.getElementById('summary-en-{prev_today_mmdd}')?.classList.add('hide');"
    if prev_hide_en in astro_content:
        new_hide_block = (
            f"      document.getElementById('summary-en-{new_mmdd}')?.classList.add('hide');\n"
            f"      document.getElementById('summary-zh-{new_mmdd}')?.classList.add('hide');\n"
            f"      {prev_hide_en}"
        )
        astro_content = astro_content.replace(prev_hide_en, new_hide_block, 1)

    # b. Add new date case before the previous today's case.
    prev_case_line = f"        if (date === '{prev_today}') {{"
    if prev_case_line in astro_content:
        new_case_block = (
            f"        if (date === '{new_date}') {{\n"
            f"          document.getElementById('summary-en-{new_mmdd}')?.classList.remove('hide');\n"
            f"          document.getElementById('summary-zh-{new_mmdd}')?.classList.remove('hide');\n"
            f"        }} else if (date === '{prev_today}') {{"
        )
        astro_content = astro_content.replace(prev_case_line, new_case_block, 1)

    return astro_content


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    translated_path = 'scratch/translated_papers.json'
    astro_path = 'apps/blog/src/components/DailyPaperDigest.astro'

    if not os.path.exists(translated_path):
        print(f"Error: {translated_path} not found. Please create it first.")
        sys.exit(1)

    with open(translated_path, 'r') as f:
        data = json.load(f)

    if data.get('already_processed', False):
        print(f"Notification: Today's papers ({data.get('date')}) have already been processed. Skipping.")
        sys.exit(0)

    date_str    = data.get('date')
    new_papers  = data.get('papers', [])
    summary_en  = data.get('summaryEn', '')
    summary_zh  = data.get('summaryZh', '')

    if not date_str or not new_papers:
        print("Error: Invalid JSON format. Need 'date' and 'papers'.")
        sys.exit(1)

    if not summary_en or not summary_zh:
        print("Warning: 'summaryEn' or 'summaryZh' missing from translated_papers.json; "
              "executive summary will be empty — fill it in manually.")
        summary_en = summary_en or f"Top ML/AI papers for {date_str}."
        summary_zh = summary_zh or f"{date_str} 前沿机器学习论文摘要。"

    if not os.path.exists(astro_path):
        print(f"Error: Astro component {astro_path} not found.")
        sys.exit(1)

    with open(astro_path, 'r') as f:
        astro_content = f.read()

    # Step A: inject paper presets
    astro_content = update_preset_papers(astro_content, date_str, new_papers)

    # Step B: update all date-wiring so new date shows as "Today"
    astro_content = update_date_wiring(astro_content, date_str, summary_en, summary_zh)

    with open(astro_path, 'w') as f:
        f.write(astro_content)

    print(f"Successfully updated DailyPaperDigest.astro presets and date wiring for {date_str}!")


if __name__ == '__main__':
    main()
