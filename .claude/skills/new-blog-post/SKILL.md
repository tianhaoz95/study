---
name: new-blog-post
description: Create a new interactive blog post in apps/blog given research papers (PDF paths), URL references, and a focus description. Produces a fully built post with visualizations, code sidebar, TOC, and an index entry.
---

## Inputs the user provides

The user will supply some combination of:
- **PDF paths** — local research paper files (e.g. `references/foo.pdf`)
- **PDF URLs** — direct links to arXiv PDFs (e.g. `https://arxiv.org/pdf/2503.01840`) — treated as the paper source, not just context
- **URLs** — arXiv abstract pages, GitHub repos, blog posts for extra context
- **Description** — what angle / focus the post should take

If any input is missing, infer from context or ask once.

## Phase 1 — Extract & research

### PDF download (when a PDF URL is provided)

If the user supplies a direct PDF URL (e.g. an arXiv PDF link), do **both** of the following before extracting text:

**1. Download the PDF into `references/`:**
```bash
curl -L -A "Mozilla/5.0" -o "references/<slug>.pdf" "<pdf-url>"
```
Choose a slug that matches the post slug (e.g. `eagle-3.pdf` for a post about Eagle-3).

**2. Register it in `scripts/download_papers.py`:**
Open `scripts/download_papers.py` and add a new entry to the `PAPERS` dict:
```python
"<slug>.pdf": "<pdf-url>",
```
Insert it at the top of the dict (most-recent-first ordering). The file already exists — use the Edit tool to add the line.

### PDF extraction
`pdftotext` must be installed. If the first extraction attempt fails with "not installed":
```bash
brew install poppler   # installs pdftotext
```
Then extract the full paper text:
```bash
pdftotext path/to/paper.pdf - 2>&1
```
Read in chunks (e.g. `sed -n '1,400p'`, `sed -n '400,800p'`) if the paper is long. You need:
- Abstract / core contribution
- Key concepts, algorithms, equations
- Experimental results / numbers
- Related work (for framing)

### URL references
Use `WebFetch` or `WebSearch` for any URLs the user provides, plus targeted searches for missing context (e.g. "paper title site:arxiv.org" or searches for prerequisite concepts the post needs to explain).

### Understand before planning
Do not write code until you can answer all of these:
1. What is the paper's **single clearest "before vs after"**? (e.g. "stuck trajectory vs escaped trajectory", "noise vs clean embedding", "one token at a time vs all tokens at once")
2. What **three to five concepts** does a reader need to understand it?
3. For each concept: **what is the one thing a reader should SEE** that makes it click — even without reading the surrounding text?
4. What is the paper's **key variable or knob**? (e.g. number of rollouts K, noise scale σ, guidance weight ω, timestep t) — this becomes the interactive control.
5. What **concrete examples** can illustrate the concept? Use real tokens ("cat", "dog", "Paris"), real grid cells, real numbers — never abstract placeholders.

---

## Phase 2 — Visualization design (do this before writing any code)

The blog's core value proposition is that **visualizations ARE the explanation** — a reader should be able to understand the paper's key insight by interacting with a diagram alone, without reading surrounding text. Treat each visualization as a standalone teaching tool.

### The "one glance" test
For every visualization, ask: *if a reader glanced at this for 3 seconds without reading any text, would they grasp the core idea?* If not, the visualization needs more work — add labels, concrete examples, or a clearer contrast.

### The contrast principle
Almost every great visualization in this blog shows a **contrast**: two states, two approaches, or a before/after. Examples from existing posts:
- Basin canvas: **good basin** (green, settles to correct answer) vs **bad basin** (red, oscillates forever) — you understand "the problem" without reading a word
- Rollout canvas: **K=1 single stuck trajectory** vs **K=100 showing some escaping** — you understand "the solution" without reading a word
- Flow canvas: **noise positions** (scattered) → **clean embedding positions** (clustered by word) with token labels — you understand "flow matching" without reading a word

### The interactive variable
Make the paper's **key experimental variable** the interactive knob:
- PTRM's key variable is K (number of rollouts) → buttons for K=1/5/25/100
- ELF's key variable is t (timestep) → play/pause animation stepping t from 0→1
- ELF's CFG scale ω → a static diagram showing vectors diverging at ω=1/2/3

Don't make something interactive just for interactivity — the interactive element should demonstrate the paper's claim by showing what changes as the variable changes.

### Concrete "quick examples"
Every section needs **at least one concrete example** — a specific case that makes the abstract real:
- Instead of "token embeddings cluster together", show dots labeled "cat", "dog", "run", "love" clustering by semantic type
- Instead of "the trajectory gets stuck", show a dot bouncing around a red contour with the caption "bad basin — wrong answer forever"
- Instead of "K=100 rollouts escape more often", show the actual paths — most red/stuck, a few green/escaped
- Instead of "84% accuracy", show a comparison bar chart with the baseline labeled "LLM ensemble (oracle verifier, $2.66)" at 55% and your method at 91%

The quick example should be **minimal and labeled**. Resist the urge to show everything — one clear instance beats a complex general case.

### Proven visualization patterns (use these)

**1. Trajectory canvas — for "things move through a space"**
Draw a 2D canvas representing some latent or abstract space. Show paths as curves with dots. Use color to show outcome (green=good, red=bad, amber=uncertain). Add contour blobs for "regions". Use click/button controls to switch between cases. Label endpoints.
*Used for: latent basins (PTRM), flow matching trajectories (ELF), CFG direction (ELF)*

**2. Animated particle canvas — for "a transformation happens over time"**
Particles start at random positions, animate to target positions when Play is pressed. Label the target positions. Show a t= value increasing from 0 to 1. Add Play/Reset buttons. Use different colors per semantic cluster.
*Used for: ELF flow from noise to token embeddings*

**3. Architecture SVG — for "data flows through components"**
Draw boxes connected by labeled arrows. Color-code components (encoder=cyan, main model=purple, decoder=green). Mark "training only" boxes with amber. Show the data shape or type at each connection. Make it fit inside `.vp-body` at `min-width:580px`.
*Used for: ELF architecture (tokens → T5 encoder → embeddings → flow → decode), Gemma4 backbone+drafter*

**4. Step navigator — for "an algorithm has sequential phases"**
3–6 cards in a horizontal row, each showing one step (icon + title + monospace code snippet). Prev/Next buttons highlight the active card and check-mark completed ones. The code in each card should be the actual pseudocode for that step.
*Used for: ELF inference steps (init → denoise loop → decode), TRM recursion steps*

**5. Line/scatter chart on canvas — for "a metric changes as a parameter scales"**
Draw axes manually with `ctx`. Plot 2–3 lines in different colors. Use log scale on X if the variable ranges over orders of magnitude. Label the key values directly on the chart (not in a legend). Draw grid lines at `rgba(255,255,255,0.05)`.
*Used for: PTRM width scaling (pass@K, best-Q@K, mode@K vs K), ELF scaling (Gen. PPL vs sampling steps)*

**6. Animated bar chart — for "method X beats baselines on a benchmark"**
Horizontal bars that animate in from 0% when scrolled into view (use IntersectionObserver). Color-code: baselines in muted grey/cyan, your method in purple. Label the bar with the exact number. Add a "header row" to group baselines vs proposed.
*Used for: PTRM vs LLMs on PPBench, ELF vs DLMs on perplexity*

### What NOT to do
- **Don't show raw paper figures as screenshots** — always re-implement as interactive canvas/SVG
- **Don't use placeholder data** — use the actual numbers from the paper
- **Don't make the visualization too complex** — if it needs a legend, it's too busy
- **Don't skip the quick example** — "embedding space" means nothing without labeled token dots

---

## Phase 3 — Plan sections

Design 5–7 numbered sections with the visualization plan for each section decided **before** writing any code. Each section needs:
- A one-sentence statement of **what the reader should understand** after this section
- The **visualization type** (from the patterns above) and **what specific contrast or example** it will show
- The **concrete example** (e.g. "show 'cat', 'dog', 'run' as token dots" not "show some tokens")
- A matching **code sidebar tab** with pseudocode, math, or benchmark numbers

Typical section flow:
```
§01 — The Problem (why existing approaches fail — show the failure mode concretely)
§02 — Background (prerequisite concept — show the mechanism with a labeled example)
§03 — Core Idea / Architecture (the new approach — architecture SVG or step navigator)
§04 — Key Trick / Novel Mechanism (what makes it work — trajectory or particle canvas)
§05 — Scaling / Trade-offs (the key variable — line chart with the variable as x-axis)
§06 — Results (the payoff — animated bar chart vs baselines with real numbers)
```

---

## Phase 4 — Create the post file

### Location
```
apps/blog/src/pages/posts/<post-slug>/index.astro
```
Slug: lowercase, hyphenated, descriptive (e.g. `elf-continuous-dlm`, `ptrm`).

### File skeleton

Every post follows this exact structure:

```astro
---
import BaseLayout from '../../../layouts/BaseLayout.astro';
---
<BaseLayout
  title="Post Title | AI/ML Deep Dives"
  description="One-sentence description for SEO/OG."
  crumb="Short nav breadcrumb"
>

<style is:global>
/* ALL post CSS goes here — use is:global so it applies to dynamically-injected content */
/* ... (see CSS patterns below) ... */
</style>

<!-- HERO -->
<header class="post-hero">
  <div class="tags">
    <span class="tag tag-purple">Primary Topic</span>
    <span class="tag tag-cyan">Secondary</span>
    <span class="tag tag-green">Interactive</span>
  </div>
  <h1>Post Title</h1>
  <p class="lead">2–3 sentence hook that states the core insight.</p>
  <div class="post-hero-meta">
    <span>Month DD, YYYY</span>
    <span>~N min read</span>
    <span>Paper: <code>arXiv:XXXX.XXXXX</code></span>
  </div>
  <!-- Hero link buttons — include whichever sources are available -->
  <div class="hero-links">
    <!-- arXiv PDF — use https://arxiv.org/pdf/XXXX.XXXXX -->
    <a class="hero-btn" href="https://arxiv.org/pdf/XXXX.XXXXX" target="_blank" rel="noopener">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
      Paper PDF
    </a>
    <!-- Project / demo site — omit if none -->
    <a class="hero-btn" href="https://project-site.example.com" target="_blank" rel="noopener">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
      Project Site
    </a>
    <!-- GitHub repo — omit if none -->
    <a class="hero-btn" href="https://github.com/org/repo" target="_blank" rel="noopener">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
      GitHub
    </a>
  </div>
</header>

<!-- THREE-COLUMN GRID -->
<div class="post-grid" id="post-grid">

<!-- LEFT: TOC -->
<nav class="toc-sidebar" id="toc-sidebar">
  <div class="toc-head">
    <span class="toc-label">Contents</span>
    <button class="toc-toggle" id="toc-toggle" title="Hide contents">‹</button>
    <span class="toc-collapsed-label">nav</span>
  </div>
  <ol class="toc-list">
    <li class="toc-item" id="toc-s-intro"><a href="#s-intro"><span class="toc-num">01</span> Section Name</a></li>
    <!-- one entry per section -->
  </ol>
</nav>

<!-- MIDDLE: ARTICLE -->
<article class="post-body">

<section id="s-intro" data-code="intro">
<div class="section-no">01 — Section Name</div>
<h2>Section heading</h2>
<p>Body text…</p>
<!-- visualizations, callouts, tables go inside sections -->
</section>

<!-- repeat for each section -->

</article>

<!-- RIGHT: CODE SIDEBAR -->
<aside class="code-sidebar" id="code-sidebar">
  <div class="cs-head">
    <div class="cs-head-info">
      <div class="cs-file" id="cs-file-label">file.py</div>
      <div class="cs-section-title" id="cs-section-title">Section Title</div>
    </div>
    <button class="cs-toggle" id="cs-toggle" title="Hide code">›</button>
    <span class="cs-collapsed-label">code</span>
  </div>
  <div class="cs-tabs" id="cs-tabs">
    <button class="cs-tab active" data-panel="intro">intro</button>
    <!-- one tab per section -->
  </div>
  <div class="cs-body">
    <div class="cs-panel active" id="panel-intro">
      <pre class="cs-pre">
<span class="cs-line cmt"># Comment</span>
<span class="cs-line hl-p"><span class="kw">def</span> <span class="fn">example</span>():</span>
<span class="cs-line hl-c">    <span class="cmt"># highlighted cyan</span></span>
<span class="cs-line hl-g">    <span class="cmt"># highlighted green</span></span>
      </pre>
    </div>
  </div>
</aside>

</div><!-- /post-grid -->

<script>
// All interactivity goes here (see JS patterns below)
</script>
</BaseLayout>
```

---

## CSS patterns

Copy these blocks verbatim — they are battle-tested and consistent across all posts.

### Required layout CSS (always include)
```css
/* Post base */
.post-hero{padding:6.5rem 2rem 3rem;max-width:1700px;margin:0 auto}
.post-hero .tags{margin-bottom:1.25rem}
.post-hero h1{font-size:clamp(1.75rem,4.5vw,2.75rem);font-weight:800;letter-spacing:-.03em;line-height:1.1;margin-bottom:1.1rem;background:linear-gradient(150deg,var(--text) 35%,var(--muted2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.post-hero .lead{font-size:1.05rem;color:var(--muted2);max-width:820px;line-height:1.75;margin-bottom:1.75rem}
.post-hero-meta{display:flex;align-items:center;flex-wrap:wrap;gap:1.25rem;font-size:.78rem;color:var(--muted);padding-top:1.25rem;border-top:1px solid var(--border)}
.hero-links{display:flex;flex-wrap:wrap;gap:.625rem;margin-top:1.25rem}
.hero-btn{display:inline-flex;align-items:center;gap:.4rem;padding:.35rem .8rem;border-radius:5px;font-size:.72rem;font-family:var(--ff-mono);font-weight:600;text-decoration:none;border:1px solid var(--border-hi);background:var(--surface);color:var(--muted2);transition:all .15s;white-space:nowrap}
.hero-btn:hover{border-color:var(--purple);color:var(--purple-l);background:var(--purple-dim)}
.hero-btn svg{width:12px;height:12px;flex-shrink:0;opacity:.7}

/* Three-column layout */
.post-grid{display:grid;grid-template-columns:var(--toc-w,190px) 1fr var(--code-w,520px);align-items:start;max-width:1700px;margin:0 auto}
.post-grid.toc-collapsed{--toc-w:32px}
.post-grid.sidebar-collapsed{--code-w:34px}
.post-body{padding:1.5rem 2.5rem 6rem 2rem;min-width:0}
.post-body section{margin-bottom:4.5rem;scroll-margin-top:76px}
.post-body h2{font-size:1.5rem;font-weight:700;color:var(--text);margin-bottom:.875rem}
.post-body h3{font-size:1rem;font-weight:600;color:var(--text2);margin:1.75rem 0 .625rem}
.post-body p{font-size:.925rem;color:var(--muted2);margin-bottom:.875rem;line-height:1.75}
.post-body ul{list-style:none;margin-bottom:.875rem}
.post-body ul li{font-size:.925rem;color:var(--muted2);padding:.3rem 0 .3rem 1.4rem;position:relative;line-height:1.65}
.post-body ul li::before{content:'→';position:absolute;left:0;color:var(--purple);font-weight:700}
.section-no{font-size:.68rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--purple);margin-bottom:.5rem;font-family:var(--ff-mono)}

/* Viz panels */
.vp{background:var(--card);border:1px solid var(--border);border-radius:10px;overflow:hidden;margin:1.75rem 0}
.vp-head{display:flex;align-items:center;justify-content:space-between;padding:.65rem 1rem;border-bottom:1px solid var(--border);background:var(--surface)}
.vp-title{font-size:.72rem;font-family:var(--ff-mono);color:var(--muted2)}
.vp-hint{font-size:.67rem;color:var(--muted);display:flex;align-items:center;gap:.3rem}
.vp-hint::before{content:'▶';color:var(--cyan)}
.vp-body{padding:1.25rem}

/* TOC sidebar */
.toc-sidebar{position:sticky;top:56px;height:calc(100vh - 56px);display:flex;flex-direction:column;border-right:1px solid var(--border);background:var(--surface)}
.toc-head{padding:.6rem .75rem;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:.5rem;flex-shrink:0}
.toc-label{font-size:.67rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);flex:1;font-family:var(--ff-mono)}
.toc-toggle{display:flex;align-items:center;justify-content:center;width:22px;height:22px;border:1px solid var(--border-hi);border-radius:4px;background:none;cursor:pointer;color:var(--muted);font-size:.75rem;flex-shrink:0;transition:all .15s}
.toc-toggle:hover{color:var(--text2);background:rgba(255,255,255,.06)}
.toc-list{list-style:none;padding:.4rem 0;margin:0;overflow-y:auto;flex:1;scrollbar-width:thin;scrollbar-color:var(--border-hi) transparent}
.toc-item a{display:flex;align-items:baseline;gap:.5rem;padding:.3rem .75rem;font-size:.71rem;font-family:var(--ff-mono);color:var(--muted);text-decoration:none;transition:all .15s;border-left:2px solid transparent;line-height:1.45}
.toc-item a:hover{color:var(--text2);background:rgba(255,255,255,.03)}
.toc-item.toc-active a{color:var(--purple-l);border-left-color:var(--purple);background:var(--purple-dim)}
.toc-num{font-size:.6rem;color:var(--muted);flex-shrink:0;opacity:.7}
.toc-collapsed-label{display:none;writing-mode:vertical-rl;transform:rotate(180deg);font-size:.6rem;font-family:var(--ff-mono);color:var(--muted);letter-spacing:.08em;text-transform:uppercase;margin-top:.4rem}
.toc-sidebar.collapsed{overflow:hidden}
.toc-sidebar.collapsed .toc-label,.toc-sidebar.collapsed .toc-list{display:none}
.toc-sidebar.collapsed .toc-head{flex-direction:column;align-items:center;border-bottom:none;height:100%;padding:.5rem .3rem;gap:.4rem}
.toc-sidebar.collapsed .toc-collapsed-label{display:block}

/* Code sidebar */
.code-sidebar{position:sticky;top:56px;height:calc(100vh - 56px);display:flex;flex-direction:column;border-left:1px solid var(--border);background:var(--code-bg)}
.cs-head{padding:.75rem 1.1rem;border-bottom:1px solid var(--border);background:var(--surface);flex-shrink:0;display:flex;align-items:center;gap:.65rem}
.cs-head-info{flex:1;min-width:0}
.cs-toggle{display:flex;align-items:center;justify-content:center;width:24px;height:24px;border:1px solid var(--border-hi);border-radius:4px;background:none;cursor:pointer;color:var(--muted);font-size:.8rem;flex-shrink:0;transition:all .15s}
.cs-toggle:hover{color:var(--text2);background:rgba(255,255,255,.06)}
.cs-collapsed-label{display:none;writing-mode:vertical-rl;transform:rotate(180deg);font-size:.6rem;font-family:var(--ff-mono);color:var(--muted);letter-spacing:.08em;text-transform:uppercase;margin-top:.4rem}
.code-sidebar.collapsed{overflow:hidden}
.code-sidebar.collapsed .cs-head{flex-direction:column;align-items:center;border-bottom:none;height:100%;padding:.5rem .35rem;gap:.4rem}
.code-sidebar.collapsed .cs-head-info,.code-sidebar.collapsed .cs-tabs,.code-sidebar.collapsed .cs-body{display:none}
.code-sidebar.collapsed .cs-collapsed-label{display:block}
@media(max-width:1100px){.code-sidebar.collapsed{display:none}}
.cs-file{font-size:.67rem;font-family:var(--ff-mono);color:var(--muted);margin-bottom:.2rem;display:flex;align-items:center;gap:.4rem}
.cs-file::before{content:'';width:7px;height:7px;border-radius:50%;background:var(--purple);flex-shrink:0;display:inline-block}
.cs-section-title{font-size:.78rem;font-weight:600;color:var(--text2)}
.cs-tabs{display:flex;overflow-x:auto;border-bottom:1px solid var(--border);flex-shrink:0;scrollbar-width:none}
.cs-tabs::-webkit-scrollbar{display:none}
.cs-tab{font-size:.68rem;font-family:var(--ff-mono);color:var(--muted);padding:.55rem .9rem;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;transition:all .15s;flex-shrink:0;background:none;border-top:none;border-left:none;border-right:none}
.cs-tab:hover{color:var(--text2);background:rgba(255,255,255,.025)}
.cs-tab.active{color:var(--purple-l);border-bottom-color:var(--purple);background:var(--purple-dim)}
.cs-body{flex:1;overflow-y:auto;overflow-x:auto;scrollbar-width:thin;scrollbar-color:var(--border-hi) transparent}
.cs-panel{display:none}
.cs-panel.active{display:block}
.cs-pre{font-family:var(--ff-mono);font-size:.72rem;line-height:1.75;padding:.875rem 0;color:#abb2bf;white-space:pre}
.cs-line{display:block;padding:0 1.25rem}
.cs-line.hl-p{background:rgba(139,92,246,.12);border-left:2px solid var(--purple);padding:0 1.1rem}
.cs-line.hl-c{background:rgba(6,182,212,.1);border-left:2px solid var(--cyan);padding:0 1.1rem}
.cs-line.hl-g{background:rgba(16,185,129,.1);border-left:2px solid var(--green);padding:0 1.1rem}
.cs-line.hl-a{background:rgba(245,158,11,.1);border-left:2px solid var(--amber);padding:0 1.1rem}
/* Syntax tokens */
.kw{color:#c678dd}.fn{color:#61afef}.cls{color:#e5c07b}.str{color:#98c379}.cmt{color:#5c6370;font-style:italic}.num{color:#d19a66}.op{color:#abb2bf}.attr{color:#e06c75}

/* Responsive */
@media(max-width:1100px){
  .post-grid{grid-template-columns:1fr}
  .toc-sidebar{position:static;height:auto;border-right:none;border-bottom:1px solid var(--border);max-height:200px}
  .toc-sidebar.collapsed{display:none}
  .code-sidebar{position:static;height:auto;border-left:none;border-top:1px solid var(--border);margin-top:2rem}
  .cs-body{max-height:460px}
}
@media(max-width:680px){.post-hero{padding:5rem 1.25rem 2.5rem}.post-body{padding:1.25rem 1.25rem 4rem}}
```

### Optional component CSS patterns

**Data/comparison table:**
```css
.results-table{width:100%;border-collapse:collapse;margin:1.5rem 0;border-radius:8px;overflow:hidden}
.results-table th{background:var(--surface);padding:.5rem .75rem;text-align:left;font-size:.67rem;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--border)}
.results-table td{padding:.5rem .75rem;border-bottom:1px solid var(--border);font-size:.8rem;color:var(--muted2)}
.results-table tr:last-child td{border-bottom:none}
.results-table tr:hover td{background:rgba(255,255,255,.018)}
.results-table .mn{font-family:var(--ff-mono);font-size:.75rem;color:var(--text2)}
.results-table .highlight-row td{background:rgba(139,92,246,.06)}
.results-table .highlight-row .mn{color:var(--purple-l)}
.results-table .best{color:var(--cyan);font-weight:700}
```

**Step navigator:**
```css
.step-list{display:flex;flex-direction:column;gap:.5rem;margin:1.25rem 0}
.step-box{display:flex;align-items:flex-start;gap:.875rem;padding:.75rem 1rem;border-radius:8px;border:1px solid var(--border);background:var(--card);transition:all .35s;opacity:.45}
.step-box.active{opacity:1;border-color:var(--purple);background:var(--purple-dim)}
.step-box.done{opacity:.7;border-color:var(--border)}
.step-num{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.65rem;font-weight:700;font-family:var(--ff-mono);flex-shrink:0;background:var(--border);color:var(--muted);margin-top:.05rem;transition:all .35s}
.step-box.active .step-num{background:var(--purple);color:#fff}
.step-box.done .step-num{background:var(--green-dim);color:var(--green);border:1px solid rgba(16,185,129,.3)}
.step-body{flex:1;min-width:0}
.step-title{font-size:.8rem;font-weight:600;color:var(--text2);margin-bottom:.2rem}
.step-desc{font-size:.75rem;color:var(--muted);line-height:1.55}
.step-code{font-family:var(--ff-mono);font-size:.7rem;color:var(--cyan);margin-top:.35rem}
.step-nav{display:flex;align-items:center;gap:.625rem;margin-top:1rem}
.step-nav button{padding:.3rem .8rem;border-radius:5px;font-size:.72rem;font-family:var(--ff-mono);cursor:pointer;border:1px solid var(--border-hi);background:var(--surface);color:var(--muted2);transition:all .15s}
.step-nav button:hover:not(:disabled){border-color:var(--cyan);color:var(--cyan);background:var(--cyan-dim)}
.step-nav button:disabled{opacity:.35;cursor:default}
```

**Math / equation block:**
```css
.math-block{background:var(--card2);border:1px solid var(--border);border-radius:8px;padding:1rem 1.25rem;margin:1.25rem 0;font-family:var(--ff-mono);font-size:.82rem;color:var(--text2);line-height:2;overflow-x:auto}
.math-label{font-size:.65rem;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem;font-family:var(--ff-mono)}
.math-var{color:var(--cyan);font-style:italic}
.math-comment{color:var(--muted);font-style:italic;font-size:.7rem}
```

**Animated bar chart (triggered by IntersectionObserver):**
```css
.results-bars{margin:1.5rem 0;display:flex;flex-direction:column;gap:.625rem}
.bar-row{display:flex;align-items:center;gap:.75rem}
.bar-label{font-size:.72rem;font-family:var(--ff-mono);color:var(--muted2);width:220px;flex-shrink:0;text-align:right;line-height:1.3}
.bar-track{flex:1;background:var(--card2);border-radius:4px;height:22px;overflow:hidden}
.bar-fill{height:100%;border-radius:4px;transition:width 1s ease;display:flex;align-items:center;justify-content:flex-end;padding-right:.5rem;width:0%}
.bar-fill span{font-size:.65rem;font-weight:700;font-family:var(--ff-mono);color:rgba(255,255,255,.85)}
```

---

## JS patterns (inside `<script>`)

### TOC + sidebar toggles (always include)
```js
const tocSidebar = document.getElementById('toc-sidebar');
const tocToggle  = document.getElementById('toc-toggle');
const postGrid   = document.getElementById('post-grid');
tocToggle?.addEventListener('click', () => {
  const c = tocSidebar.classList.toggle('collapsed');
  postGrid.classList.toggle('toc-collapsed', c);
  tocToggle.textContent = c ? '›' : '‹';
});

const codeSidebar = document.getElementById('code-sidebar');
const csToggle    = document.getElementById('cs-toggle');
csToggle?.addEventListener('click', () => {
  const c = codeSidebar.classList.toggle('collapsed');
  postGrid.classList.toggle('sidebar-collapsed', c);
  csToggle.textContent = c ? '‹' : '›';
});
```

### Code sidebar tab switching (always include)
```js
// Define metadata for each tab — file name and section title
const tabMeta = {
  intro:   { file: 'post/intro.py',   title: 'Introduction' },
  method:  { file: 'post/method.py',  title: 'Method' },
  results: { file: 'post/results.py', title: 'Results' },
  // ... one entry per section
};
function activateTab(name) {
  document.querySelectorAll('.cs-tab').forEach(t => t.classList.toggle('active', t.dataset.panel === name));
  document.querySelectorAll('.cs-panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + name));
  const m = tabMeta[name];
  if (m) {
    document.getElementById('cs-file-label').textContent = m.file;
    document.getElementById('cs-section-title').textContent = m.title;
  }
}
document.querySelectorAll('.cs-tab').forEach(t => t.addEventListener('click', () => activateTab(t.dataset.panel)));
```

### IntersectionObserver — sync TOC + sidebar tab on scroll (always include)
```js
// Map section IDs to tab panel names
const sectionMap = { 's-intro': 'intro', 's-method': 'method', 's-results': 'results' };

document.querySelectorAll('.post-body section[id]').forEach(s =>
  new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        document.querySelectorAll('.toc-item').forEach(li =>
          li.classList.toggle('toc-active', li.id === 'toc-' + e.target.id));
        const p = sectionMap[e.target.id];
        if (p) activateTab(p);
      }
    });
  }, { threshold: 0.3 }).observe(s)
);
```

### Syntax highlighter for JS-rendered code panels (use instead of sequential regexes)

When sidebar code is rendered at runtime via JS (PANELS objects, `innerHTML = hl(line)`), use this
single-pass tokenizer. **Never use sequential regexes** — they re-scan their own output, so the
string regex `"[^"\n]*"` matches `"cmt"` / `"str"` inside already-inserted `class="cmt"` attribute
values, producing broken double-nested spans like `class=<span class="str">"cmt"</span>>`.

```js
function hl(raw) {
  const src = raw.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const KW  = new Set(['def','class','return','if','else','elif','for','while',
                       'import','from','None','True','False','not','and','or',
                       'in','is','with','as','self','try','except','raise',
                       'pass','super','isinstance']);
  const CLS = new Set(['int','str','bool','float','dict','list','tuple',
                       'torch','nn','F','Optional','Dict','Tuple','Tensor']);
  let out = '', i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '#') {
      const j = src.indexOf('\n', i);
      const end = j < 0 ? src.length : j;
      out += `<span class="cmt">${src.slice(i, end)}</span>`;
      i = end; continue;
    }
    if (ch === '"' || ch === "'") {
      const tq = ch.repeat(3);
      const triple = src.slice(i, i + 3) === tq;
      const delim = triple ? tq : ch;
      let j = i + delim.length;
      while (j < src.length) {
        if (src[j] === '\\') { j += 2; continue; }
        if (src.slice(j, j + delim.length) === delim) { j += delim.length; break; }
        j++;
      }
      out += `<span class="str">${src.slice(i, j)}</span>`;
      i = j; continue;
    }
    const wm = src.slice(i).match(/^[a-zA-Z_]\w*/);
    if (wm) {
      const w = wm[0];
      const isFn = /^\s*\(/.test(src.slice(i + w.length));
      if (isFn)           out += `<span class="fn">${w}</span>`;
      else if (KW.has(w)) out += `<span class="kw">${w}</span>`;
      else if (CLS.has(w))out += `<span class="cls">${w}</span>`;
      else                out += w;
      i += w.length; continue;
    }
    const nm = src.slice(i).match(/^\d+(?:\.\d+)?(?:e-?\d+)?/);
    if (nm && (i === 0 || !/\w/.test(src[i - 1]))) {
      out += `<span class="num">${nm[0]}</span>`;
      i += nm[0].length; continue;
    }
    out += ch; i++;
  }
  return out;
}
```

### Step navigator (use when a section has a multi-step walkthrough)
```js
let step = 0;
const boxes  = document.querySelectorAll('.step-box');
const prevBtn = document.getElementById('step-prev');
const nextBtn = document.getElementById('step-next');
const progEl  = document.getElementById('step-prog');
function updateSteps() {
  boxes.forEach((b, i) => {
    b.classList.remove('active','done');
    if (i === step) b.classList.add('active');
    else if (i < step) b.classList.add('done');
  });
  if (prevBtn) prevBtn.disabled = step === 0;
  if (nextBtn) nextBtn.disabled = step === boxes.length - 1;
  if (progEl) progEl.textContent = `Step ${step+1} of ${boxes.length}`;
  boxes.forEach((b, i) => {
    const n = b.querySelector('.step-num');
    if (n) n.textContent = i < step ? '✓' : String(i+1);
  });
}
prevBtn?.addEventListener('click', () => { if (step>0){step--;updateSteps();} });
nextBtn?.addEventListener('click', () => { if (step<boxes.length-1){step++;updateSteps();} });
updateSteps();
```

### Canvas animation skeleton
Write canvas code to an external script file at `/tmp/screenshot-*.js` for testing, but inline it in the `<script>` block in the final post. Key rules:
- Always use `window.devicePixelRatio` for crisp rendering
- Use `requestAnimationFrame` for animation
- Set canvas `width`/`height` = `clientWidth * DPR` after the DOM is ready
- Use a seeded PRNG for reproducible particle/dot layouts
- Provide Play/Reset controls for animated canvases

```js
const canvas = document.getElementById('my-canvas');
if (canvas) {
  const ctx = canvas.getContext('2d');
  const W = canvas.clientWidth, H = 240, DPR = window.devicePixelRatio || 1;
  canvas.width = W * DPR; canvas.height = H * DPR; ctx.scale(DPR, DPR);
  // ... drawing code ...
}
```

### Animated bar chart trigger
```js
const barsSection = document.getElementById('s-results');
if (barsSection) {
  new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        document.querySelectorAll('.bar-fill[data-w]').forEach(b => {
          b.style.width = (parseFloat(b.dataset.w) / 100 * 100) + '%';
        });
      }
    });
  }, { threshold: 0.3 }).observe(barsSection);
}
```

---

## Common pitfalls — ALWAYS check

1. **Escape `<` in HTML `<pre>` code blocks** — Astro's compiler parses `<` before HTML tags in template content as a JSX fragment. Anywhere inside `.cs-pre` or `.math-block` where you write `<` as a less-than operator *immediately followed by a word or span tag*, use `&lt;` instead. Example: `rand() &lt; 0.5`.

2. **No `$` in heredocs** — When writing multi-line node scripts via shell heredocs, use a dedicated `/tmp/script.js` file (Write tool) instead, or single-quote the heredoc delimiter (`<<'EOF'`).

3. **`is:global` on `<style>`** — The post CSS lives in `<style is:global>`. Without it, scoped styles won't apply to SVG/canvas content or dynamically-created elements.

4. **Canvas sizing** — Always set `canvas.width = clientWidth * DPR` after the element is in the DOM. Never set it in CSS only.

5. **`page.$$` in Playwright** — Shell interpolation eats `$$`. Write screenshot scripts to a `.js` file and run with `node`.

---

## Phase 5 — Add index entry

Edit `apps/blog/src/pages/index.astro`. The new post should be the **first card** with the `★ Latest` badge. Move the badge away from the previous first post.

Card template:
```html
<a class="post-card" href="/posts/<slug>/">
  <div class="post-featured-badge" data-i18n="post-badge">★ Latest</div>
  <div class="tags">
    <span class="tag tag-purple">Topic</span>
    <span class="tag tag-cyan">Topic 2</span>
    <span class="tag tag-green">Interactive</span>
  </div>
  <h3>Post Title</h3>
  <p>2–3 sentence description of the key insight and what makes this post interactive.</p>
  <div class="post-meta">
    <span>Month DD, YYYY</span>
    <span data-i18n="post-read">~N min read</span>
    <span class="post-arrow">→</span>
  </div>
</a>
```

---

## Phase 6 — Build and verify

```bash
cd apps/blog && npm run build 2>&1 | tail -20
```

**If build fails:**
- `CompilerError: Unable to assign attributes when using <> Fragment shorthand syntax` → find the offending `< <span` pattern and replace `<` with `&lt;`.
- Other errors → read the full message and fix the indicated line.

**Visual bugs to catch during spot-check:**
- Sidebar code shows raw `class=` text or nested `<span class="str">"cmt"</span>` fragments → the `hl()` function uses sequential regexes that re-scan their own output. Replace with the single-pass tokenizer in the "Syntax highlighter" snippet above.

After a clean build, optionally do a quick visual spot-check:
```bash
npm run dev -- --port 4321 &
sleep 4
# then use Playwright (node /tmp/screenshot.js) to take a screenshot
pkill -f "astro dev"
```

---

## Checklist before finishing

**Research**
- [ ] PDF fully read (all sections extracted, key numbers noted)
- [ ] URL references fetched
- [ ] Core "before vs after" insight identified

**Visualization design (the most important part)**
- [ ] Every visualization passes the "one glance" test — core idea legible without reading text
- [ ] Every section has a concrete quick example (real tokens, real numbers, real grid cells — not abstract placeholders)
- [ ] The paper's key variable is the interactive control (K, t, σ, ω, …)
- [ ] At least one contrast visualization (good vs bad, before vs after, old vs new approach)
- [ ] Used real benchmark numbers from the paper, not made-up values

**Code**
- [ ] Post file exists at `apps/blog/src/pages/posts/<slug>/index.astro`
- [ ] Hero has `.hero-links` row with buttons for every available source (PDF, project site, GitHub repo) — omit buttons whose URLs are unknown
- [ ] All `<` operators in `<pre>` code blocks escaped as `&lt;`
- [ ] Build passes (`npm run build` exits 0)
- [ ] Code sidebar has one tab per section with relevant pseudocode/results
- [ ] TOC has one entry per section, IntersectionObserver wires sync

**Index**
- [ ] Index entry added with `★ Latest` badge, previous post's badge removed
