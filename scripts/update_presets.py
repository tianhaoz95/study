#!/usr/bin/env python3
"""
Usage:
  python3 scripts/update_presets.py

This script takes the translated and structured paper presets from
`scratch/translated_papers.json` and updates the `PRESET_PAPERS`
declaration in `apps/blog/src/components/DailyPaperDigest.astro`.
"""

import sys
import json
import os

def main():
    translated_path = 'scratch/translated_papers.json'
    astro_path = 'apps/blog/src/components/DailyPaperDigest.astro'
    
    if not os.path.exists(translated_path):
        print(f"Error: {translated_path} not found. Please create it first.")
        sys.exit(1)
        
    with open(translated_path, 'r') as f:
        data = json.load(f)
        
    if data.get('already_processed', False):
        print(f"Notification: Today's papers ({data.get('date')}) have already been processed in presets. Skipping presets update.")
        sys.exit(0)
        
    date_str = data.get('date')
    new_papers = data.get('papers', [])
    
    if not date_str or not new_papers:
        print("Error: Invalid JSON format. Need 'date' and 'papers'.")
        sys.exit(1)
        
    if not os.path.exists(astro_path):
        print(f"Error: Astro component {astro_path} not found.")
        sys.exit(1)
        
    with open(astro_path, 'r') as f:
        astro_content = f.read()
        
    # Locate PRESET_PAPERS block
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
    
    # Extract existing PRESET_PAPERS as JSON
    existing_presets_str = astro_content[start_idx + len("const PRESET_PAPERS = "):end_idx - 1].strip()
    try:
        presets = json.loads(existing_presets_str)
    except Exception as e:
        print(f"Error parsing existing presets JSON: {e}")
        sys.exit(1)
        
    # Update or insert date entry
    presets[date_str] = new_papers
    
    # Generate new block
    updated_presets_str = json.dumps(presets, indent=2, ensure_ascii=False)
    new_preset_block = f"const PRESET_PAPERS = {updated_presets_str};"
    
    # Write back
    updated_astro_content = astro_content[:start_idx] + new_preset_block + astro_content[end_idx:]
    with open(astro_path, 'w') as f:
        f.write(updated_astro_content)
        
    print(f"Successfully updated DailyPaperDigest.astro presets with papers for {date_str}!")

if __name__ == '__main__':
    main()
