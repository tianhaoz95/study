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
> | `"is_incremental": true` | Date in preset but HuggingFace has new papers and/or upvote changes | Continue with **Incremental Mode** in Step 2 |
> | `"already_processed": true` | Date in preset, no new papers, upvotes unchanged | **STOP** — notify user that everything is up to date |

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

When `raw_papers.json` contains `"is_incremental": true`, the date already has papers in the preset. The fetch script has already:
- Refreshed the `upvotes` field on every paper in `existing_papers` from the live HuggingFace data
- Placed only the net-new papers in `papers`
- Reported how many upvote changes occurred in `upvote_changes`

Process as follows:

1. **Translate only the new papers** in `raw_papers.json["papers"]` using the format above. If `papers` is empty (upvote-only refresh), skip this step.
2. **Assign IDs starting after the existing ones** — check `raw_papers.json["existing_papers"]` to find the highest `id` number already used (e.g. if existing papers go up to `paper-15`, new ones start at `paper-16`).
3. **Merge** — combine `existing_papers` (already upvote-refreshed) with the newly translated papers into one flat array. Do **not** re-translate or modify the existing papers — their `upvotes` field is already current.
4. **Re-sort the merged array by upvotes descending** — upvote refreshes and new high-upvote papers may both change the ranking.
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

## Step 5: Generate Summary Video (HyperFrames)

**This step runs for every digest update — always generate the video.** Skip only if the user explicitly says not to.

### Prerequisites

```bash
node --version   # must be 22+
ffmpeg -version  # must be installed
brew install ffmpeg   # if missing
```

GSAP is loaded from the CDN at render time — no local install needed.

### Scene structure

A **90-second 1080×1920 MP4** (9:16 vertical — Instagram Reels, TikTok, YouTube Shorts).

| Scene | Window | Voiceover | Content |
|---|---|---|---|
| **0 — Opening** | 0–5s | ~5 words | "Today's AI Paper Digest" branded card — eyebrow, animated line, brand name |
| **1 — Overview** | 5–17s | ~30 words | Date + total paper count + 2–3 sentence executive summary of the day's themes |
| **2 — Papers** | 17–74s | ~140 words | Animated compact cards for top 10 papers, each with upvote count + title + one-line insight, staggered into view at ~5.5s per card |
| **3 — Highlight** | 74–84s | ~25 words | Spotlight the #1 paper: what makes it stand out — key result or breakthrough in one sentence |
| **4 — CTA** | 84–90s | ~15 words | "Browse all N papers at catpuccino.ai" |

**Scene 2 is the heart.** Each paper card animates in from the bottom with a brief pause. Compact card sizing (padding 16px 24px, font-size 17px title / 14px insight) lets all 10 cards fit within the 1920px frame. Voice narrates the title + one-line insight for each of the top 10 papers.

**Also generate a Chinese version** for every digest:
```
social-media/daily-digest/YYYY-MM-DD-zh/
  index.html        ← Chinese composition
  summary-zh.mp4    ← rendered output
  audio/
    scene-0.mp3  scene-1.mp3  scene-2.mp3  scene-3.mp3  scene-4.mp3
```
Chinese voiceover: `edge-tts --voice zh-CN-XiaoyiNeural --rate="-10%"`. Chinese scene 2 covering 10 papers often runs 55–75s — always check actual MP3 durations and patch `data-duration` + GSAP timestamps accordingly, then adjust the scene window and total video `data-duration`.

### File locations

> [!IMPORTANT]
> All paths are **relative to the repo root**, not to `apps/blog/`. Always `cd` to the repo root before running any video commands.

```
social-media/daily-digest/YYYY-MM-DD/       ← repo root, NOT apps/blog/social-media/
  index.html         ← English HyperFrames composition (must be index.html)
  summary.mp4        ← rendered English output
  audio/
    scene-0.mp3      ← opening voiceover       (0–5s)
    scene-1.mp3      ← overview voiceover      (5–17s)
    scene-2.mp3      ← paper list voiceover    (17–74s)
    scene-3.mp3      ← highlight voiceover     (74–84s)
    scene-4.mp3      ← CTA voiceover           (84–90s)
social-media/daily-digest/YYYY-MM-DD-zh/    ← repo root
  index.html         ← Chinese composition
  summary-zh.mp4     ← rendered Chinese output
  audio/             ← same structure, Chinese scripts
```

`social-media/` lives at the repo root and is git-ignored — videos and audio are never committed.

### Composition template

Create `social-media/daily-digest/YYYY-MM-DD/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>
    * { margin:0; padding:0; box-sizing:border-box }
    body { width:1080px; height:1920px; overflow:hidden;
           background:#0d0d14; font-family:'JetBrains Mono',monospace,'Courier New' }
    :root {
      --purple:#8b5cf6; --cyan:#06b6d4; --green:#10b981; --amber:#f59e0b;
      --text:#f0f0f8;   --muted:#6b7280; --card:#1a1a2e;  --surface:#12121f;
    }

    /* All scenes overlap; GSAP controls opacity */
    .scene { position:absolute; inset:0; display:flex; flex-direction:column;
             align-items:center; justify-content:center; padding:80px 60px;
             opacity:0; pointer-events:none }

    /* ── Scene 0: Opening card ── */
    #scene-open  { gap:36px; text-align:center; background:#0d0d14 }
    #open-glow   { position:absolute; width:700px; height:700px; border-radius:50%;
                   background:radial-gradient(circle,rgba(139,92,246,.15) 0%,rgba(0,0,0,0) 70%);
                   top:50%; left:50%; margin:-350px 0 0 -350px; pointer-events:none }
    #open-eyebrow{ font-size:18px; font-weight:700; letter-spacing:.18em;
                   text-transform:uppercase; color:var(--muted) }
    #open-line   { width:120px; height:2px;
                   background:linear-gradient(90deg,var(--purple),var(--cyan));
                   border-radius:2px; margin:0 auto }
    #open-brand  { font-size:62px; font-weight:900; letter-spacing:-.02em; line-height:1.1;
                   background:linear-gradient(135deg,var(--purple) 30%,var(--cyan));
                   -webkit-background-clip:text; -webkit-text-fill-color:transparent;
                   background-clip:text }
    #open-url    { font-size:20px; color:var(--muted); letter-spacing:.06em;
                   position:absolute; bottom:72px }

    /* ── Scene 1: Overview ── */
    #scene-overview { gap:32px; text-align:center }
    #overview-date  { font-size:16px; font-weight:700; letter-spacing:.14em;
                      text-transform:uppercase; color:var(--cyan) }
    #overview-count { font-size:80px; font-weight:900; letter-spacing:-.04em;
                      color:var(--text); line-height:1 }
    #overview-unit  { font-size:22px; color:var(--muted); margin-top:-16px }
    #overview-summary { font-size:24px; color:var(--text); line-height:1.55;
                        max-width:880px; text-align:center }

    /* ── Scene 2: Paper list (compact — 10 cards fit in 1920px) ── */
    #scene-papers   { justify-content:flex-start; padding:60px 60px 40px; gap:0 }
    #papers-label   { font-size:13px; font-weight:700; letter-spacing:.12em;
                      text-transform:uppercase; color:var(--muted); margin-bottom:18px }
    .paper-card     { width:100%; background:var(--card);
                      border:1px solid rgba(139,92,246,.2); border-radius:10px;
                      padding:16px 24px; margin-bottom:12px; opacity:0 }
    .pc-top         { display:flex; align-items:center; gap:12px; margin-bottom:6px }
    .pc-votes       { font-size:12px; font-weight:700; letter-spacing:.05em;
                      color:var(--purple); background:rgba(139,92,246,.12);
                      border:1px solid rgba(139,92,246,.3); border-radius:5px;
                      padding:3px 8px; flex-shrink:0 }
    .pc-title       { font-size:17px; font-weight:700; color:var(--text);
                      line-height:1.25; flex:1 }
    .pc-insight     { font-size:14px; color:var(--muted); line-height:1.45 }

    /* ── Scene 3: Highlight ── */
    #scene-highlight { gap:32px; text-align:center }
    #hl-eyebrow      { font-size:15px; font-weight:700; letter-spacing:.14em;
                       text-transform:uppercase; color:var(--amber) }
    #hl-title        { font-size:44px; font-weight:800; color:var(--text);
                       line-height:1.2; max-width:900px }
    #hl-result       { font-size:28px; font-weight:700; color:var(--purple);
                       max-width:860px; line-height:1.4 }
    #hl-context      { font-size:20px; color:var(--muted); max-width:820px; line-height:1.5 }

    /* ── Scene 4: CTA ── */
    #scene-cta  { gap:28px; text-align:center }
    #cta-label  { font-size:18px; letter-spacing:.1em; text-transform:uppercase;
                  color:var(--muted) }
    #cta-count  { font-size:24px; color:var(--text) }
    #cta-url    { font-size:38px; font-weight:700; color:var(--purple) }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
</head>
<body>

<!-- Total: 90s, 5 scenes, 9:16 vertical -->
<div id="stage"
     data-composition-id="daily-digest-YYYY-MM-DD"
     data-start="0"
     data-duration="90"
     data-width="1080"
     data-height="1920">

  <!-- Scene 0: Opening (0–5s) — ALWAYS PRESENT, NEVER SKIP -->
  <div class="scene" id="scene-open">
    <div id="open-glow"></div>
    <div id="open-eyebrow">Today's AI Paper Digest</div>
    <div id="open-line"></div>
    <div id="open-brand">Catpuccino.ai</div>
    <div id="open-url">catpuccino.ai</div>
  </div>

  <!-- Scene 1: Overview (5–17s) -->
  <div class="scene" id="scene-overview">
    <div id="overview-date">MONTH DD, YYYY</div>
    <div id="overview-count">N</div>
    <div id="overview-unit">papers today</div>
    <div id="overview-summary">2–3 sentence executive summary of today's dominant themes.</div>
  </div>

  <!-- Scene 2: Paper list (17–74s) — top 10 papers, one compact card per paper -->
  <!-- Cards use compact sizing: padding 16px 24px, title font-size 17px, insight font-size 14px -->
  <!-- All 10 cards fit in the 1920px frame; stagger at ~5.5s intervals -->
  <div class="scene" id="scene-papers">
    <div id="papers-label">Today's Top Papers</div>
    <!-- Repeat .paper-card for each of the top 10 papers -->
    <div class="paper-card" id="pc-1">
      <div class="pc-top">
        <span class="pc-votes">↑ N upvotes</span>
        <span class="pc-title">Paper title here</span>
      </div>
      <div class="pc-insight">One-line insight — problemEn in 10–15 words.</div>
    </div>
    <div class="paper-card" id="pc-2">
      <div class="pc-top">
        <span class="pc-votes">↑ N upvotes</span>
        <span class="pc-title">Paper title here</span>
      </div>
      <div class="pc-insight">One-line insight.</div>
    </div>
    <!-- ... 10 cards total (pc-1 through pc-10) ... -->
  </div>

  <!-- Scene 3: #1 paper highlight (74–84s) -->
  <div class="scene" id="scene-highlight">
    <div id="hl-eyebrow">⭐ Top Paper</div>
    <div id="hl-title">Title of #1 paper</div>
    <div id="hl-result">Key result or breakthrough in one punchy sentence.</div>
    <div id="hl-context">Why this matters — one sentence of context.</div>
  </div>

  <!-- Scene 4: CTA (84–90s) -->
  <div class="scene" id="scene-cta">
    <div id="cta-label">Read all papers</div>
    <div id="cta-count">N papers · MONTH DD, YYYY</div>
    <div id="cta-url">catpuccino.ai</div>
  </div>

  <!-- IMPORTANT: every <audio> must have a unique id or the renderer will make it SILENT -->
  <!-- Patch data-duration values to match actual measured MP3 durations after generation -->
  <audio id="audio-s0" data-start="0"  data-duration="5"  data-track-index="1" data-volume="1.0" src="audio/scene-0.mp3"></audio>
  <audio id="audio-s1" data-start="5"  data-duration="12" data-track-index="1" data-volume="1.0" src="audio/scene-1.mp3"></audio>
  <audio id="audio-s2" data-start="17" data-duration="57" data-track-index="1" data-volume="1.0" src="audio/scene-2.mp3"></audio>
  <audio id="audio-s3" data-start="74" data-duration="10" data-track-index="1" data-volume="1.0" src="audio/scene-3.mp3"></audio>
  <audio id="audio-s4" data-start="84" data-duration="6"  data-track-index="1" data-volume="1.0" src="audio/scene-4.mp3"></audio>

</div><!-- /#stage -->

<script>
const tl = gsap.timeline({ paused: true });

// Scene 0: Opening (0–5s)
tl.to('#scene-open',   { opacity: 1, duration: 0.01 }, 0)
  .from('#open-eyebrow', { opacity: 0, y: 20, duration: 0.7, ease: 'power2.out' }, 0.3)
  .from('#open-line',    { scaleX: 0, duration: 0.6, ease: 'expo.out', transformOrigin: 'left' }, 0.7)
  .from('#open-brand',   { opacity: 0, y: 36, duration: 1.0, ease: 'power3.out' }, 0.9)
  .from('#open-url',     { opacity: 0, duration: 0.5 }, 1.8)
  .to('#scene-open',     { opacity: 0, duration: 0.5 }, 4.5);

// Scene 1: Overview (5–17s)
tl.to('#scene-overview',   { opacity: 1, duration: 0.01 }, 5)
  .from('#overview-date',  { opacity: 0, y: 20, duration: 0.7, ease: 'power2.out' }, 5.3)
  .from('#overview-count', { opacity: 0, y: 40, duration: 1.0, ease: 'power3.out' }, 5.8)
  .from('#overview-unit',  { opacity: 0, duration: 0.6 }, 6.4)
  .from('#overview-summary', { opacity: 0, y: 24, duration: 1.0, ease: 'power2.out' }, 7.2)
  .to('#scene-overview',   { opacity: 0, duration: 0.5 }, 16.5);

// Scene 2: Paper list (17–74s) — 10 cards, ~5.5s stagger
// card 1 @ 18.0, card 2 @ 23.5, ..., card 10 @ 67.5; scene exits @ 73.5
tl.to('#scene-papers', { opacity: 1, duration: 0.01 }, 17)
  .from('#papers-label', { opacity: 0, duration: 0.6 }, 17.3);
const cards = document.querySelectorAll('.paper-card');
cards.forEach((card, i) => {
  tl.fromTo(card, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 18 + i * 5.5);
});
tl.to('#scene-papers', { opacity: 0, duration: 0.5 }, 73.5);

// Scene 3: Highlight (74–84s)
tl.to('#scene-highlight', { opacity: 1, duration: 0.01 }, 74)
  .from('#hl-eyebrow', { opacity: 0, duration: 0.6, ease: 'power2.out' }, 74.3)
  .from('#hl-title',   { opacity: 0, y: 30, duration: 0.9, ease: 'power3.out' }, 74.8)
  .from('#hl-result',  { opacity: 0, y: 20, duration: 0.8, ease: 'power2.out' }, 75.6)
  .from('#hl-context', { opacity: 0, duration: 0.6 }, 76.5)
  .to('#scene-highlight', { opacity: 0, duration: 0.5 }, 83.5);

// Scene 4: CTA (84–90s)
tl.to('#scene-cta',   { opacity: 1, duration: 0.01 }, 84)
  .from('#cta-label', { opacity: 0, duration: 0.6 }, 84.3)
  .from('#cta-count', { opacity: 0, duration: 0.5 }, 84.9)
  .from('#cta-url',   { opacity: 0, scale: 0.92, duration: 1.0, ease: 'power2.out' }, 85.3)
  .to('#scene-cta',   { opacity: 0, duration: 0.8 }, 89.2);

window.__timelines = window.__timelines || {};
window.__timelines['daily-digest-YYYY-MM-DD'] = tl;
</script>
</body>
</html>
```

### Voiceover scripts

| Scene | Target | Tone |
|---|---|---|
| 0 — Opening | ~5 words | "Today's A.I. Paper Digest." — short, punchy |
| 1 — Overview | ~30 words | State the date, paper count, and 2–3 sentence summary of the day's dominant themes |
| 2 — Papers | ~140 words | For each of the top 10 papers: "[Short title]: [one-line insight]." Keep each paper to ~14 words (1 short sentence) |
| 3 — Highlight | ~25 words | "#1 paper. [Title]. [Key result in one punchy sentence]. [Why it matters]." |
| 4 — CTA | ~15 words | "Browse all N papers on Catpuccino dot A.I." |

**Generate English audio (Kokoro — recommended):**

> [!NOTE]
> Run all commands from the **repo root**. The `mkdir -p` creates relative to repo root; the `cd` moves into the composition dir for subsequent commands.

```bash
# From repo root:
mkdir -p social-media/daily-digest/YYYY-MM-DD/audio
cd social-media/daily-digest/YYYY-MM-DD

npx hyperframes tts "Today's A.I. Paper Digest." -v af_nova -s 0.95 -o audio/scene-0.wav
npx hyperframes tts "SCENE 1 SCRIPT" -v af_nova -s 0.95 -o audio/scene-1.wav
npx hyperframes tts "SCENE 2 SCRIPT (10 papers, ~140 words)" -v af_nova -s 0.95 -o audio/scene-2.wav
npx hyperframes tts "SCENE 3 SCRIPT" -v af_nova -s 0.95 -o audio/scene-3.wav
npx hyperframes tts "Browse all N papers on Catpuccino dot A.I." -v af_nova -s 0.95 -o audio/scene-4.wav

for i in 0 1 2 3 4; do
  ffmpeg -y -i audio/scene-${i}.wav -acodec libmp3lame -q:a 2 audio/scene-${i}.mp3 \
    && rm audio/scene-${i}.wav
done
```

**Generate Chinese audio (edge-tts):**
```bash
mkdir -p social-media/daily-digest/YYYY-MM-DD-zh/audio
cd social-media/daily-digest/YYYY-MM-DD-zh

edge-tts --voice "zh-CN-XiaoyiNeural" --rate="-10%" --text "今日AI论文速递。" --write-media audio/scene-0.mp3
edge-tts --voice "zh-CN-XiaoyiNeural" --rate="-10%" --text "场景1脚本" --write-media audio/scene-1.mp3
edge-tts --voice "zh-CN-XiaoyiNeural" --rate="-10%" --text "场景2脚本" --write-media audio/scene-2.mp3
edge-tts --voice "zh-CN-XiaoyiNeural" --rate="-10%" --text "场景3脚本" --write-media audio/scene-3.mp3
edge-tts --voice "zh-CN-XiaoyiNeural" --rate="-10%" --text "场景4脚本" --write-media audio/scene-4.mp3
```

**After generating all clips, always check actual durations and patch `data-duration` + GSAP timestamps to match:**
```bash
for i in 0 1 2 3 4; do
  dur=$(ffprobe -i audio/scene-${i}.mp3 -show_entries format=duration -v quiet -of csv="p=0" 2>/dev/null)
  echo "scene-${i}: ${dur}s"
done
```

### Lint and render

```bash
# From the composition directory (social-media/daily-digest/YYYY-MM-DD/)
npx hyperframes@latest lint .    # fix all errors; warnings are fine
npx hyperframes@latest render .  # outputs summary.mp4
```

Run lint, fix any `media_missing_id` or `overlapping_gsap_tweens` errors, then render. Repeat for the Chinese version.

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
