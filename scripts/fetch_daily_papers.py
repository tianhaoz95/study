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
import urllib.request
from datetime import datetime

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

    url = f"https://huggingface.co/api/daily_papers?date={date_str}&limit={limit}"
    print(f"Fetching papers from: {url}")
    
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            
        print(f"Found {len(data)} papers.")
        
        # Save to scratch folder
        import os
        os.makedirs('scratch', exist_ok=True)
        with open('scratch/raw_papers.json', 'w') as f:
            json.dump({
                "date": date_str,
                "papers": data
            }, f, indent=2, ensure_ascii=False)
            
        print("Raw papers successfully written to scratch/raw_papers.json")
    except Exception as e:
        print(f"Error fetching daily papers: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
