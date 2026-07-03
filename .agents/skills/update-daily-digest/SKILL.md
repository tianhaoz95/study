---
name: update-daily-digest
description: Update the Astro blog's daily paper digest presets by fetching today's new papers, generating Chinese translations and detailed summaries using LLM help, and rewriting the component presets.
---

This skill guides you through updating the Daily Paper Digest section of the tech blog monorepo homepage with the latest front-page ML/AI publications from Hugging Face.

## Step 1: Fetch Raw Papers

Run the raw paper downloader script. You can specify a date (defaults to today) and a limit of papers (defaults to 15):
```bash
python3 scripts/fetch_daily_papers.py --date 2026-07-02 --limit 15
```

This fetches papers from the Hugging Face API and writes metadata to `scratch/raw_papers.json`.

> [!IMPORTANT]
> **Interpret the output flag before continuing:**
>
> Immediately after running Step 1, open and read `scratch/raw_papers.json` and check the flag:
>
> | Flag | Meaning | What to do |
> |------|---------|------------|
> | `"already_processed": false` | Fresh run — date not yet in the preset | Continue with Steps 2–4 normally |
> | `"is_incremental": true` | Date already in preset but HuggingFace has new papers | Continue with **Incremental Mode** in Step 2 |
> | `"already_processed": true` | Date in preset and nothing new on HuggingFace | **STOP** — notify user that everything is up to date |

## Step 2: Translate and Structure (LLM Step)

Read the content of `scratch/raw_papers.json`. For each paper in `"papers"`, use your own LLM reasoning context to perform translation and summarization.

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

Also write a short **executive summary** (2–3 sentences each) covering the day's overarching themes across all papers. This goes into the top-level `summaryEn` / `summaryZh` fields.

Output the compiled dictionary structure to `scratch/translated_papers.json` with the following wrapper:
```json
{
  "date": "2026-07-02",
  "summaryEn": "2–3 sentence English overview of the day's dominant themes across all papers.",
  "summaryZh": "2–3句中文概述当日所有论文的主要研究主题。",
  "papers": [
    // Array of mapped paper objects sorted by upvotes descending
  ]
}
```

### Incremental Mode (when `is_incremental: true`)

When `raw_papers.json` contains `"is_incremental": true`, the date already has papers in the preset and only new additions need to be processed:

1. **Translate only the new papers** in `raw_papers.json["papers"]` using the format above.
2. **Assign IDs starting after the existing ones** — check `raw_papers.json["existing_papers"]` to find the highest `id` number already used (e.g. if existing papers go up to `paper-15`, new ones start at `paper-16`).
3. **Merge** — combine `existing_papers` (unchanged, from `raw_papers.json["existing_papers"]`) with the newly translated papers into one flat array.
4. **Re-sort the merged array by upvotes descending** — new high-upvote papers may rank above older ones.
5. **Update the executive summary** to reflect the full combined set of papers for the day.
6. **Write the complete merged array** (existing + new) to `scratch/translated_papers.json` — `update_presets.py` will replace the entire date entry, so it must be the full authoritative list.

## Step 3: Write Back Presets and Update Home Page Date Wiring

Run the presets updating script. It now handles **everything** in one pass — no manual date edits needed:
```bash
python3 scripts/update_presets.py
```

The script automatically:
- Injects the new date's papers into `PRESET_PAPERS`
- Bumps the **"Today"** chip button to the new date, **"Yesterday"** to the previous today
- Updates the date input `max` and `value`
- Updates the JS `currentPapers` and `activePresetDate` initial values
- Inserts the new date's executive summary (visible), marks the previous today's as hidden
- Extends `toggleExecutiveSummary()` with a case for the new date

> [!NOTE]
> For incremental updates, `update_presets.py` behaves identically — it replaces the full date entry with the merged list from `translated_papers.json`. The date-wiring update is skipped automatically (since the date is already the active one), so only the paper data changes.

## Step 4: Verify and Build

Verify that the project builds successfully after updating:
```bash
cd apps/blog
npm run build
```

## Backfilling Missing Translations

If existing preset papers already have English fields but are missing Chinese translations (empty `titleZh`, `problemZh`, `innovationZh`, `resultZh`, etc.) or have placeholder summaries (empty `problemEn`, `innovationEn`, `resultEn`), you can backfill them without re-fetching:

1. **Identify untranslated papers** — search the preset data in [DailyPaperDigest.astro](file:///Users/tianhaozhou/github/study/apps/blog/src/components/DailyPaperDigest.astro) for papers with empty `""` values in Zh or summary fields.
2. **Batch translate** — for large numbers of papers (>10), partition into batches of ~10-12 and use parallel subagents to translate simultaneously. Each subagent reads a batch JSON, fills in the fields, and writes the result.
3. **Merge back** — write a merge script that reads the translated batches and patches the preset data directly in the Astro component file, replacing only the empty fields with the translated values.
4. **Verify** — run `npm run build` in `apps/blog` to confirm no syntax errors were introduced.

> [!TIP]
> Use the paper's `abstract` field (if present) as the primary source for generating `problemEn/Zh`, `innovationEn/Zh`, and `resultEn/Zh` summaries. Each should be 1-2 concise sentences.

## Creating Custom Interactive Visualizations

Papers 1-5 (and any explicitly added IDs like `paper-7`) have dedicated interactive visualizations in the right-side "INTERACTIVE PRINCIPLE EXPLAINER" panel. Papers beyond the custom list fall back to the generic topology viz.

### Architecture

- **HTML**: Each custom viz is a `<div class="interactive-viz" id="viz-paper-N">` block placed inside `.digest-viz-panel`, before the `<!-- Generic Fallback Viz -->` comment.
- **CSS**: Styles go in the `<style is:global>` block in the same component file. Namespace with the viz ID or unique class prefixes.
- **JS**: Interactive logic (button toggles, animations) goes in the `<script>` block, typically after the existing viz init sections (look for `// --- Viz N:` comments).
- **Routing**: The `bindPaperTabEvents` function contains an `isCustomPaper` array that controls which paper IDs get routed to `viz-${paperId}` vs the generic fallback.

### Steps to Add a New Custom Viz

1. **Design the viz** based on the paper's core concept. Good patterns include:
   - Toggle/comparison views (e.g., Docker vs Dockerless pipelines)
   - Step-by-step animated flows
   - Interactive SVG diagrams with clickable regions
   - Metric comparison bars

2. **Add HTML** — insert a new `<div class="interactive-viz" id="viz-paper-N">` block before `<!-- Generic Fallback Viz -->`. Include:
   - `.viz-title-row` with bilingual `<h4>` and `.viz-status` badge
   - Interactive content (buttons, pipeline steps, charts, etc.)
   - `.viz-caption` paragraphs in both `lang-en` and `lang-zh`

3. **Add CSS** — insert styles in the `<style is:global>` block. Use unique class prefixes to avoid collisions.

4. **Update routing** — add the paper ID to the `isCustomPaper` array:
   ```js
   // Find this line in bindPaperTabEvents:
   const isCustomPaper = ['paper-1', 'paper-2', ..., 'paper-N'].includes(paperId);
   ```
   For July 1+ presets, the routing uses `viz-${paperId}` directly. For June 30 presets, there is a separate mapping block.

5. **Add JS interactivity** — add event listeners in the `<script>` block, following the pattern:
   ```js
   // --- Viz N: Description ---
   const vizN = document.getElementById('viz-paper-N');
   if (vizN) {
     // bind toggle buttons, animations, etc.
   }
   ```

> [!WARNING]
> The `.hide` class (defined globally in the component) controls visibility for toggle-based views. Use it for showing/hiding pipeline alternatives. The `fadeIn` keyframe also exists globally.

## Critical Design & Implementation Constraints

> [!IMPORTANT]
> **PDF Button Dropdown & Split-Screen Integration**:
> 1. Any PDF link inside the dynamically rendered paper cards MUST be structured as an anchor (`<a>`) with `class="hero-btn"` and the `.pdf` URL in its `href` attribute.
> 2. Because the paper cards and PDF buttons are rendered client-side dynamically, they are injected after the initial DOM load. The rendering code inside [DailyPaperDigest.astro](file:///Users/tianhaozhou/github/study/apps/blog/src/components/DailyPaperDigest.astro) MUST invoke `(window as any).bindSplitViewLinks()` immediately after writing to `papersTarget.innerHTML` to initialize the split-screen dropdown controls. Do not remove or bypass this call.

> [!NOTE]
> **Card Layout**: Paper cards (`.paper-tab-card`) are rendered dynamically into `#papers-content-target` (a plain div, not a flex container with gap). Vertical spacing between cards is controlled by `margin-bottom: 0.75rem` on `.paper-tab-card`.
