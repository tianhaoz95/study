#!/usr/bin/env python3
"""
Usage:
  python3 scripts/fetch_daily_papers.py [--date YYYY-MM-DD] [--limit 15]

This script fetches the daily ML papers list from the Hugging Face API
for a specific date (defaults to today's date) and saves the raw data
to `scratch/raw_papers.json`.
"""

import sys
import json
import os
import urllib.request
from datetime import datetime

def is_date_already_processed(date_str):
    astro_path = 'apps/blog/src/components/DailyPaperDigest.astro'
    if not os.path.exists(astro_path):
        return False
    try:
        with open(astro_path, 'r') as f:
            content = f.read()
        start_marker = "const PRESET_PAPERS = {"
        start_idx = content.find(start_marker)
        if start_idx == -1:
            return False
        next_block_marker = "document.addEventListener"
        next_block_idx = content.find(next_block_marker, start_idx)
        if next_block_idx == -1:
            return False
        end_idx = content.rfind("};", start_idx, next_block_idx)
        if end_idx == -1:
            return False
        end_idx += 2
        existing_presets_str = content[start_idx + len("const PRESET_PAPERS = "):end_idx - 1].strip()
        presets = json.loads(existing_presets_str)
        return date_str in presets
    except Exception:
        return False

def main():
    date_str = datetime.today().strftime('%Y-%m-%d')
    limit = 15

    # Simple arg parsing
    args = sys.argv[1:]
    for i in range(len(args)):
        if args[i] == '--date' and i + 1 < len(args):
            date_str = args[i+1]
        elif args[i] == '--limit' and i + 1 < len(args):
            limit = int(args[i+1])

    os.makedirs('scratch', exist_ok=True)

    # Pre-check if date is already processed
    if is_date_already_processed(date_str):
        print(f"Notification: Today's papers ({date_str}) have already been processed in the blog presets.")
        with open('scratch/raw_papers.json', 'w') as f:
            json.dump({
                "date": date_str,
                "papers": [],
                "already_processed": True
            }, f, indent=2)
        print("Written already_processed=True status flag to scratch/raw_papers.json.")
        sys.exit(0)

    url = f"https://huggingface.co/api/daily_papers?date={date_str}&limit={limit}"
    print(f"Fetching papers from: {url}")
    
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            
        print(f"Found {len(data)} papers.")
        
        with open('scratch/raw_papers.json', 'w') as f:
            json.dump({
                "date": date_str,
                "papers": data,
                "already_processed": False
            }, f, indent=2, ensure_ascii=False)
            
        print("Raw papers successfully written to scratch/raw_papers.json")
    except Exception as e:
        print(f"Error fetching daily papers: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
