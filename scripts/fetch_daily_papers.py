#!/usr/bin/env python3
"""
Usage:
  python3 scripts/fetch_daily_papers.py [--date YYYY-MM-DD] [--limit 15]

This script fetches the daily ML papers list from the Hugging Face API
for a specific date (defaults to today's date) and saves the raw data
to `scratch/raw_papers.json`.

Output shape depends on how many papers are already in the preset:

  Case A – date not yet in PRESET_PAPERS (fresh run):
    { "date": "...", "papers": [...all fetched...], "already_processed": false }

  Case B – date already in PRESET_PAPERS but HuggingFace has more papers now:
    { "date": "...", "papers": [...new-only...],
      "is_incremental": true, "existing_papers": [...current preset papers...] }

  Case C – date already in PRESET_PAPERS and nothing new:
    { "date": "...", "papers": [], "already_processed": true }
"""

import sys
import json
import os
import urllib.request
from datetime import datetime


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def parse_preset_papers(date_str):
    """
    Return the list of paper objects already stored in PRESET_PAPERS for
    *date_str*, or an empty list if the date is not present.
    """
    astro_path = 'apps/blog/src/components/DailyPaperDigest.astro'
    if not os.path.exists(astro_path):
        return []
    try:
        with open(astro_path, 'r') as f:
            content = f.read()
        start_marker = "const PRESET_PAPERS = {"
        start_idx = content.find(start_marker)
        if start_idx == -1:
            return []
        next_block_marker = "document.addEventListener"
        next_block_idx = content.find(next_block_marker, start_idx)
        if next_block_idx == -1:
            return []
        end_idx = content.rfind("};", start_idx, next_block_idx)
        if end_idx == -1:
            return []
        end_idx += 2
        presets_str = content[start_idx + len("const PRESET_PAPERS = "):end_idx - 1].strip()
        presets = json.loads(presets_str)
        return presets.get(date_str, [])
    except Exception:
        return []


def fetch_papers_from_hf(date_str, limit):
    """Fetch raw paper list from the Hugging Face daily papers API."""
    url = f"https://huggingface.co/api/daily_papers?date={date_str}&limit={limit}"
    print(f"Fetching papers from: {url}")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode('utf-8'))


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    date_str = datetime.today().strftime('%Y-%m-%d')
    limit = 15

    args = sys.argv[1:]
    for i in range(len(args)):
        if args[i] == '--date' and i + 1 < len(args):
            date_str = args[i + 1]
        elif args[i] == '--limit' and i + 1 < len(args):
            limit = int(args[i + 1])

    os.makedirs('scratch', exist_ok=True)

    existing_papers = parse_preset_papers(date_str)
    existing_arxiv_ids = {p.get('arxivId', '') for p in existing_papers if p.get('arxivId')}

    try:
        # Always fetch from HuggingFace — even when papers exist, there may be
        # new upvoted papers added later in the day.
        # Use a larger limit so we don't miss any late additions.
        fetch_limit = max(limit, len(existing_papers) + 10)
        raw_data = fetch_papers_from_hf(date_str, fetch_limit)
    except Exception as e:
        print(f"Error fetching daily papers: {e}")
        sys.exit(1)

    print(f"Found {len(raw_data)} papers on HuggingFace.")

    if not existing_papers:
        # Case A: fresh run – keep up to `limit` papers
        papers_to_write = raw_data[:limit]
        print(f"Fresh run: writing {len(papers_to_write)} papers.")
        with open('scratch/raw_papers.json', 'w') as f:
            json.dump({
                "date": date_str,
                "papers": papers_to_write,
                "already_processed": False,
            }, f, indent=2, ensure_ascii=False)
        print("Raw papers successfully written to scratch/raw_papers.json")
        return

    # Date already in preset — check for new papers
    new_papers = [
        p for p in raw_data
        if (p.get('paper', {}).get('id') or '') not in existing_arxiv_ids
        and (p.get('paper', {}).get('id') or '') != ''
    ]

    if not new_papers:
        # Case C: nothing new
        print(f"All {len(existing_papers)} papers for {date_str} are already in the preset. Nothing to do.")
        with open('scratch/raw_papers.json', 'w') as f:
            json.dump({
                "date": date_str,
                "papers": [],
                "already_processed": True,
            }, f, indent=2)
        print("Written already_processed=True status flag to scratch/raw_papers.json.")
        return

    # Case B: incremental — new papers found
    print(f"{len(existing_papers)} papers already in preset; {len(new_papers)} new paper(s) found.")
    with open('scratch/raw_papers.json', 'w') as f:
        json.dump({
            "date": date_str,
            "papers": new_papers,          # only the net-new papers
            "is_incremental": True,
            "existing_papers": existing_papers,  # current preset list (for merging)
        }, f, indent=2, ensure_ascii=False)
    print(f"Incremental update written to scratch/raw_papers.json "
          f"({len(new_papers)} new, {len(existing_papers)} existing).")


if __name__ == '__main__':
    main()
