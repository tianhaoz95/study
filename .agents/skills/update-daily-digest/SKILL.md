---
name: update-daily-digest
description: Update the Astro blog's daily paper digest presets by fetching today's new papers, generating Chinese translations and detailed summaries using LLM help, and rewriting the component presets.
---

This skill guides you through updating the Daily Paper Digest section of the tech blog monorepo homepage with the latest front-page ML/AI publications from Hugging Face.

## Step 1: Fetch Raw Papers

Run the raw paper downloader script. You can specify a date (defaults to today) and a limit of papers (defaults to 15):
```bash
python3 scripts/fetch_daily_papers.py --date 2026-07-01 --limit 15
```

This fetches the papers from the Hugging Face API and writes the metadata to `scratch/raw_papers.json`.

## Step 2: Translate and Structure (LLM Step)

Read the content of `scratch/raw_papers.json`. For each paper in the list, use your own LLM reasoning context to perform translation and summarization.

Map each raw paper to the following structured JSON format:
```json
{
  "id": "paper-<N>", // N starts from 1 up to len(papers). 
  "arxivId": "string", // arXiv ID e.g., "2606.30534"
  "upvotes": number, // upvote count
  "titleEn": "string", // Original English title
  "titleZh": "string", // Chinese translated title
  "problemEn": "string", // Concise problem description in English
  "problemZh": "string", // Concise problem description in Chinese
  "innovationEn": "string", // Tech innovation summary in English
  "innovationZh": "string", // Tech innovation summary in Chinese
  "resultEn": "string", // Result summary in English
  "resultZh": "string", // Result summary in Chinese
  "keywords": ["string"] // Array of key topics/categories e.g., ["speculative decoding", "inference"]
}
```

> [!NOTE]
> If a paper has a highly specific custom interactive visualization (like Goku, MOPD, etc.), make sure to preserve its original `id` (e.g., `paper-1` to `paper-5`) and details so the UI visualization continues to match.

Output the compiled dictionary structure to `scratch/translated_papers.json` with the following wrapper:
```json
{
  "date": "2026-07-01",
  "papers": [
    // Array of mapped paper objects sorted by upvotes descending
  ]
}
```

## Step 3: Write Back Presets

Run the presets updating script to inject the translated presets JSON directly into the Astro component [DailyPaperDigest.astro](file:///Users/tianhaozhou/github/study/apps/blog/src/components/DailyPaperDigest.astro):
```bash
python3 scripts/update_presets.py
```

## Step 4: Verify and Build

Verify that the project builds successfully after updating:
```bash
cd apps/blog
npm run build
```

## Critical Design & Implementation Constraints

> [!IMPORTANT]
> **PDF Button Dropdown & Split-Screen Integration**:
> 1. Any PDF link inside the dynamically rendered paper cards MUST be structured as an anchor (`<a>`) with `class="hero-btn"` and the `.pdf` URL in its `href` attribute.
> 2. Because the paper cards and PDF buttons are rendered client-side dynamically, they are injected after the initial DOM load. The rendering code inside [DailyPaperDigest.astro](file:///Users/tianhaozhou/github/study/apps/blog/src/components/DailyPaperDigest.astro) MUST invoke `(window as any).bindSplitViewLinks()` immediately after writing to `papersTarget.innerHTML` to initialize the split-screen dropdown controls. Do not remove or bypass this call.
