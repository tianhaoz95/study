# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal tech blog monorepo focused on AI/ML — exploring frontier projects and research papers, with companion apps for subscriptions and a landing page.

## Monorepo Structure

```
apps/
  blog/        — Main AI/ML tech blog site
  subscribe/   — Email list sign-up site for blog updates
  home/        — Landing page for the overall project
third_party/   — Reference project source code as git submodules (read-only; used for context when writing blog posts)
scripts/       — Utility scripts (e.g., content generation helpers, deployment, data processing)
experimental/  — Standalone mini-projects: benchmarks, minimal reproductions of research papers, quick explorations
```

## Directory Conventions

**`apps/blog`** — Blog content and site. New posts go here. Each post may reference code in `third_party/` or experiments in `experimental/`.

**`apps/subscribe`** — Lightweight standalone site; only needs an email capture form and basic branding. Keep it minimal and independent of the blog's build system.

**`apps/home`** — Landing page; links out to blog, subscribe, and social. Also minimal.

**`third_party/`** — Add external repos here as git submodules (`git submodule add <url> third_party/<name>`). Never modify files inside submodules; they are reference-only.

**`experimental/`** — Each subdirectory is a self-contained mini-project (its own dependencies, README, scripts). No shared state with `apps/`. When benchmarking a paper, create `experimental/<paper-slug>/`.

**`scripts/`** — Repo-level utility scripts. Prefer shell or Python. Each script should be independently runnable with a usage comment at the top.

## apps/blog (Astro, static)

Framework: **Astro v5** with static output. No SSR adapter needed.

```bash
cd apps/blog
npm install
npm run dev        # dev server at localhost:4321
npm run build      # outputs to apps/blog/dist/
npm run preview    # preview the built site locally
```

New blog posts go under `src/pages/posts/<post-slug>/index.astro`. Use `<style is:global>` for post-specific styles that need to apply to dynamically injected HTML (e.g., syntax highlighting in the code sidebar). Visualizations are inline SVG or HTML/CSS animations driven by a `<script>` block at the bottom of the post.

The interactive code sidebar pattern: each `<section id="s-*">` maps to a panel ID in `PANELS` JS object; `IntersectionObserver` auto-switches the sidebar; clickable SVG regions use `data-target="panel-id:sub"` attributes.

## Hosting (Firebase)

All three apps deploy to Firebase Hosting via the multi-site config in `firebase.json`. The deploy targets map to `apps/<name>/dist/`.

```bash
# One-time setup: replace placeholders in .firebaserc with your real project/site IDs
firebase use --add   # or edit .firebaserc directly

# Build all apps first, then deploy
cd apps/blog && npm run build
firebase deploy --only hosting:blog

# Deploy all at once (once all apps have dist/ ready)
firebase deploy --only hosting
```

Firebase Auth (Google Sign In) will use the Firebase JS SDK imported client-side. Do not add a Node.js adapter to Astro — keep all auth logic in `<script>` blocks or separate `.ts` client modules.

## apps/subscribe and apps/home

Not yet scaffolded. Keep them minimal — a simple Vite + vanilla TS setup is sufficient. They should be static and Firebase-deployable. Match the dark design system from `apps/blog/src/styles/global.css`.

## Git Submodules

When cloning fresh:
```bash
git clone --recurse-submodules <repo-url>
# or after a plain clone:
git submodule update --init --recursive
```

To add a new reference project:
```bash
git submodule add <url> third_party/<name>
```
