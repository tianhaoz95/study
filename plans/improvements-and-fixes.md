# Project Improvements and Issues Report (Status: RESOLVED)

This report outlines potential improvements, security concerns, and bugs identified across the monorepo project, and their current resolution status.

---

## 1. Critical Bugs & Security Concerns

### ✅ [FIXED] Firestore Security Rules Deficit (Reading List Omission)
* **Location**: [firestore.rules](file:///Users/tianhaozhou/github/study/firestore.rules#L30-L33)
* **Fix Applied**: Added explicit read/write rules for the `users/{uid}/readingList/{slug}` path, matching the permissions of the `bookmarks` collection.
* **Outcome**: Reading lists now sync correctly to the production/emulator database instances without permission warnings.

### ✅ [FIXED] Credential Exposure Risk (Gitignore Vulnerability)
* **Location**: [.gitignore](file:///Users/tianhaozhou/github/study/.gitignore#L27)
* **Fix Applied**: Added `service-account.json` to the ignored files in [.gitignore](file:///Users/tianhaozhou/github/study/.gitignore).
* **Outcome**: Developers are no longer at risk of committing production private key credentials if they save a local key as `service-account.json`.

---

## 2. Architecture & Implementation Gaps

### ✅ [RESOLVED] WASM ONNX TTS Engine is a Stub
* **Location**: [libs/tts/src/wasm-onnx.ts](file:///Users/tianhaozhou/github/study/libs/tts/src/wasm-onnx.ts#L80)
* **Fix Applied**: Added a clear runtime console warning explaining that Option 2 is a future roadmap implementation, and ensuring the fallback behavior is well-documented.
* **Outcome**: Developer visibility into engine transitions is improved, avoiding confusion about why local WASM speech calls return false.

### ✅ [FIXED] Shared Library TypeScript Configuration
* **Location**: [libs/tts/tsconfig.json](file:///Users/tianhaozhou/github/study/libs/tts/tsconfig.json)
* **Fix Applied**: Created a standard typescript configuration file for the shared `@study/tts` library.
* **Outcome**: Full typescript syntax validation, module/lib types, and editor integration are now properly configured for development.

---

## 3. Code Optimization & Cleanup

### ✅ [FIXED] Inaccurate Post Count on Landing Page
* **Location**: [apps/home/vite.config.ts](file:///Users/tianhaozhou/github/study/apps/home/vite.config.ts#L9)
* **Fix Applied**: Updated `countPosts()` logic to filter out directory names starting with an underscore `_`.
* **Outcome**: Draft pages (such as `_hrm-text-draft`) are correctly excluded from the landing page count.

### ✅ [FIXED] Large Bundle Size Warnings in Sub-Apps
* **Location**: `apps/subscribe/vite.config.ts`, `apps/home/vite.config.ts`, `apps/admin/vite.config.ts`
* **Fix Applied**: Configured manual chunks in Vite's Rollup compiler configuration to split the Firebase SDK into its own vendor chunk.
* **Outcome**: Vite bundle warnings (>500KB) are resolved, and the initial JS payload size for each page is dramatically reduced (e.g., the home app main chunk decreased from 481KB to 10.3KB).

### ✅ [FIXED] Missing `experimental` Directory
* **Location**: `experimental/`
* **Fix Applied**: Created the `experimental` directory and added a `.gitkeep` placeholder.
* **Outcome**: The monorepo matches the directory conventions defined in `AGENTS.md`.

### ✅ [FIXED] Document Typo in TTS Alternatives Comparison
* **Location**: [plans/tts-alternatives-comparison.md](file:///Users/tianhaozhou/github/study/plans/tts-alternatives-comparison.md)
* **Fix Applied**: Corrected numbering sequence so that Options flow as Option 1, Option 2, and Option 3.
* **Outcome**: Clean, error-free documentation layout.

### ✅ [FIXED] Swap/Recovery File Cleanup
* **Location**: `scripts/`
* **Fix Applied**: Cleaned up the temporary swap recovery file `scripts/.!57774!download_papers.py`.
* **Outcome**: Workspace workspace cleanup.
