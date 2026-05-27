# study

A personal AI/ML tech blog monorepo — deep dives into frontier research papers and open-source projects, with interactive visualizations and companion apps.

## Structure

```
apps/
  blog/        — Main AI/ML tech blog (Astro v5, static)
  subscribe/   — Email list sign-up site
  home/        — Landing page
third_party/   — Reference project source (read-only git submodules)
experimental/  — Self-contained mini-projects: benchmarks, paper reproductions
scripts/       — Repo-level utility scripts
```

## Getting Started

### Clone with submodules

```bash
git clone --recurse-submodules <repo-url>
```

If you already cloned without submodules:

```bash
git submodule update --init --recursive
```

### Run the blog locally

```bash
cd apps/blog
npm install
npm run dev       # dev server at http://localhost:4321
```

Other commands:

```bash
npm run build     # static build → apps/blog/dist/
npm run preview   # preview the built site locally
```

## Blog Posts

Posts live under `apps/blog/src/pages/posts/<post-slug>/index.astro`. Current posts:

- `gemma4-mtp` — Gemma 4 Multi-Token Prediction
- `speculative-decoding-compare` — Speculative Decoding comparison
- `oscar-int2-kv-cache` — OSCAR INT2 KV Cache compression
- `gated-deltanet-2` — Gated DeltaNet-2 architecture
- `elf-continuous-dlm` — ELF continuous diffusion language model
- `cola-dlm` — CoLA diffusion language model
- `dynamo-llm` — Dynamo LLM serving
- `fast-blt` — Fast BLT
- `opd-failure-modes` — OPD failure modes
- `ptrm` — PTRM
- `representation-autoencoders-v2` — Representation Autoencoders v2
- `bitter-lesson-data-filtering` — Bitter Lesson data filtering

## Third-Party Reference Code

Submodules under `third_party/` are read-only reference material used when writing posts:

| Directory | Purpose |
|-----------|---------|
| `dflash` | Flash attention reference |
| `OSCAR` | OSCAR INT2 KV cache |
| `SpecForge` | Speculative decoding |
| `transformers` | Hugging Face Transformers |

To add a new reference project:

```bash
git submodule add <url> third_party/<name>
```

## Deploy (Firebase Hosting)

All apps deploy as static sites to Firebase Hosting.

```bash
# One-time setup
firebase use --add   # configure project/site IDs in .firebaserc

# Build then deploy the blog
cd apps/blog && npm run build
firebase deploy --only hosting:blog

# Deploy all apps at once
firebase deploy --only hosting
```

## Tech Stack

- **Blog:** Astro v5, static output, inline SVG visualizations, interactive code sidebars
- **Hosting:** Firebase Hosting (multi-site)
- **Submodules:** Reference-only, never modified in-tree
