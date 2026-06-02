#!/usr/bin/env python3
"""
One-time script: adds domino-spec-decoding as the ★ Latest post in index.astro.
Run once from the repo root: python3 scripts/add_domino_to_index.py
"""
import os, re, sys

INDEX = os.path.join(os.path.dirname(__file__), '..', 'apps/blog/src/pages/index.astro')
INDEX = os.path.normpath(INDEX)

if not os.path.exists(INDEX):
    print(f"ERROR: file not found: {INDEX}", file=sys.stderr)
    sys.exit(1)

with open(INDEX, 'r') as f:
    content = f.read()

# 1. Check if already patched
if "'domino-spec-decoding'" in content:
    print("Already patched — domino-spec-decoding is already in the index.")
    sys.exit(0)

# 2. Remove ★ Latest badge from whatever entry currently has it
content = re.sub(r"(\n\s+href: '/posts/[^']+/',\n)\s+badge: '★ Latest',", r"\1", content)

# 3. New entry
new_entry = """\
  {
    href: '/posts/domino-spec-decoding/',
    badge: '★ Latest',
    tags: [
      { text: 'Speculative Decoding', cls: 'tag-purple' },
      { text: 'LLM Inference', cls: 'tag-cyan' },
      { text: 'Interactive', cls: 'tag-green' },
    ],
    title: 'Domino: Causal Quality at Parallel Speed',
    desc: 'Autoregressive drafters have quality but pay a sequential tax; parallel drafters are fast but miss intra-block causal dependencies. Domino decouples these: a GRU head adds lightweight causal correction on top of a block-parallel drafter, gaining 16.6% acceptance length and 12.3% more speedup with only 2.8% extra latency — reaching 7.92× on GSM8K.',
    date: 'June 1, 2026',
    read: postReadTime('domino-spec-decoding'),
  },
"""

# 4. Insert after the opening bracket of latestPosts
marker = 'const latestPosts: Post[] = [\n'
idx = content.find(marker)
if idx == -1:
    print("ERROR: could not find latestPosts array marker", file=sys.stderr)
    sys.exit(1)

insert_at = idx + len(marker)
content = content[:insert_at] + new_entry + content[insert_at:]

with open(INDEX, 'w') as f:
    f.write(content)

print("Success: domino-spec-decoding added as ★ Latest to index.astro")
