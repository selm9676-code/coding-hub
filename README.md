# Coding Hub

A production-grade, installable PWA that teaches 20+ programming languages
through interactive lessons, live coding, quizzes, and progress tracking.
Ships as pure static files — no backend required.

## Status

**Slice 1: Foundation**, **Slice 2: Landing + Language Hub**,
**Slice 3: Lesson System**, **Slice 4: Editor + Execution**,
**Slice 5: Quizzes**, and **Slice 6: Progress + Gamification** are
complete. This includes:

Slice 1:
- Vite build configuration (static output, manual chunking for CodeMirror/search/highlight.js)
- Full CSS design token system (colors, type scale, spacing, shadows, motion)
- Base HTML shell with skip link, sticky header, sidebar, bottom nav
- Hash-based router with lazy-loaded route modules and guard/hook support
- `Store` — a dependency-free, Redux-like state container
- Five state slices: `progress`, `quiz`, `ui`, `settings`, `xp`
- `StorageProvider` abstraction with two backends: `IndexedDBProvider`
  (primary) and `LocalStorageProvider` (fallback)
- IndexedDB schema + migration system
- Export/import (JSON, with schema-version validation)
- Stub views for every route in the spec so navigation is fully live
  end-to-end, even though most feature content arrives in later slices

Slice 2:
- Master language registry (`src/data/languages.json`) — 20 languages,
  5 "complete" (Python, JavaScript, C++, Rust, Go) with real starter
  lessons, 15 "roadmap" with honest "coming soon" pages
- Build-time Markdown → JSON content pipeline (`build-plugins/vite-plugin-lessons.js`):
  parses frontmatter, renders HTML via `marked`, extracts fenced code
  blocks for "Run in Editor" buttons, and generates `search-index.json`
- A matching dev-server middleware so `npm run dev` serves identical
  compiled content without a separate build step
- `LanguageRegistry.js` — cached fetch layer for the language catalog
  and per-language lesson metadata
- `Card` and `Skeleton` components (language cards, lesson cards, stat
  cards, loading placeholders)
- Real `HomeView` with the full language grid, staggered card entrance
  animation, and a "Continue learning" callout once progress exists
- Real `LanguageHubView` with tier cards and desktop sidebar tier nav
- Real `TierListView` with lesson cards reflecting live completion state
  from the Store

Slice 3:
- `LessonRenderer.js` — sanitizes compiled lesson HTML (routes through
  the same `sanitizeHtml()` chokepoint as every other HTML insertion),
  lazily loads `highlight.js` core + only the 5 registered languages,
  adds screen-reader labels and copy buttons to code blocks
- `LessonLayout.js` — desktop split view (45%/55%, draggable + keyboard
  resizable) and a mobile `EditorDrawer` (collapsible, wired to the `ui`
  slice), plus fullscreen-editor toggling
- `LessonNavigation.js` — breadcrumbs, prev/next lesson computation
  within a tier, and swipe-gesture navigation
- Real `LessonView` wiring all of the above together, plus the `J`/`K`
  (next/prev) and `F`/`Esc` (fullscreen) keyboard shortcuts from spec §20
- The editor pane in this slice is an honestly-labeled placeholder
  showing the lesson's first code snippet — real CodeMirror + execution
  is Slice 4

Slice 4:
- `CodeMirrorLoader.js` — dynamic-import boundary for CodeMirror 6 core
  + per-language grammar packages (Python, JavaScript, C++, Rust; Go has
  no official CodeMirror package, so it edits as plain text)
- `themes/codingHubTheme.js` — a CodeMirror theme built from this
  project's design tokens, so the live editor visually matches the rest
  of the app and the highlight.js-rendered lesson code blocks
- `ExecutionManager.js` — orchestrates Web Worker execution with a
  5-second timeout (infinite-loop protection), worker auto-restart on
  crash/timeout, and a clearly-labeled "simulated output" path for
  C++/Rust/Go (spec §12: these don't compile live in v1.0 — the app says
  so outright rather than faking a successful run)
- `workers/pythonWorker.js` (Pyodide/WASM) and
  `workers/javascriptWorker.js` (sandboxed — no `document`, `window`,
  `fetch`, or `XMLHttpRequest` reachable from user code) — real code
  execution for the two languages spec §12 requires it for
- `Editor.js` — the full component: toolbar (Run/Reset/Copy/Fullscreen),
  status bar, `Ctrl/Cmd+Enter` to run, graceful fallback to a plain
  `<textarea>` if CodeMirror fails to load
- `LessonView` now mounts real, independent `Editor` instances (desktop
  split-pane and mobile drawer each get their own) seeded with each
  lesson's first code snippet

**Known tradeoff, flagged rather than hidden:** the Python worker loads
Pyodide from a CDN at runtime rather than vendoring it into the repo.
This means first-time Python execution requires network access, in
tension with the offline-first PWA goal in spec §17. See
`ARCHITECTURE.md` for the vendoring alternative and why this slice
didn't default into it silently.

Slice 5:
- All 9 quiz types from spec §13, each an independent module under
  `src/scripts/quizzes/types/`: Multiple Choice, True/False, Fill in the
  Blank, Drag & Drop (tap-to-select/place — see ARCHITECTURE.md for why
  this isn't literal pointer-drag), Code Completion, Debug the Code,
  Output Prediction, Write Code, and Mini Project
- `QuizEngine.js` — the single dispatcher across all 9 types, owning
  attempt recording, feedback rendering, progressive hints, the
  solution-unlock-after-2-failures threshold, and XP awards
- `Feedback.js` — shared feedback/hint/solution/XP logic so all 9 types
  look and behave consistently
- Debug the Code and Write Code/Mini Project actually **execute** the
  learner's code via `ExecutionManager` (reusing Slice 4's real
  Python/JavaScript runtimes) rather than doing a text diff — multiple
  valid fixes/solutions all pass
- Real quiz content authored for all 5 complete languages (12 quizzes,
  all 9 types represented with working data, verified against the
  lessons and against independently-computed expected output)
- Lesson completion (spec §7, §15) is now genuinely quiz-gated: a lesson
  completes once every attached quiz has been answered correctly at
  least once; lesson-level XP (from `meta.json`) is awarded exactly once
  per lesson via a `completeLessonOnce` guard — a real gap from earlier
  slices (`meta.json`'s per-lesson `xp` field was authored but never
  dispatched) caught and fixed in this slice
- `Editor.js` gained public `getCode()`/`setCode()` accessors, needed by
  the code-based quiz types — these didn't exist after Slice 4, which
  only had private accessors

Slice 6:
- **Fixed a real, accumulated gap from earlier slices:** progress, quiz
  results, and (as of this slice) bookmarks/notes/achievements were
  never actually written to IndexedDB — `bootstrap.js`'s persistence
  subscriber now diffs every per-record slice on each dispatch and
  persists only what changed, so a page reload no longer silently loses
  all learning progress. See ARCHITECTURE.md for the full story.
- `StreakTracker.js` — computes current streak and a 30-day activity
  heatmap from XP award history (no separate "last active" field to
  drift out of sync; it's derived from data that already exists)
- `AchievementEngine.js` — 24 achievement definitions (spec §15 asks for
  at least 20), each a pure `check(state)` function over existing
  progress/quiz/xp/bookmarks/notes state; a disclosed limitation around
  cross-language lesson-id collisions is documented in the file itself
  rather than papered over with an inaccurate "Polyglot" achievement
- `StatsDashboard.js` — XP bar + level, streak flame, activity heatmap,
  language completion indicators (disclosed as "started" vs. a precise
  percentage — see the file's header comment for why), recent
  achievements
- `BookmarkManager.js` / `NoteManager.js` — bookmark lessons and code
  snippets, one Markdown note per lesson with full-text search; both
  wired into `LessonView` (heart-icon toggle next to the breadcrumb, a
  notes textarea with `Ctrl/Cmd+S` support) and real `BookmarksView`/
  `ProgressView` pages
- Achievement unlocking is automatic: a Store subscriber checks for
  newly-eligible achievements after every dispatch and shows a toast

Subsequent slices (PWA + Polish) are
described in `ARCHITECTURE.md`.

**Editor note:** the project spec's technology table originally named
Monaco Editor, but this build uses **CodeMirror 6** per an explicit,
confirmed project decision. See `ARCHITECTURE.md` for details.

## Requirements

- Node.js 18+
- npm

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

Starts a Vite dev server (default: http://localhost:5173). The service
worker is intentionally not registered in dev mode to avoid caching
interference — see `src/main.js`.

## Build

```bash
npm run build
```

Outputs a fully static site to `dist/`. Everything uses relative paths, so
`dist/` can be served from any static host or opened directly.

## Preview a production build

```bash
npm run preview
```

## Testing

```bash
npm run test:unit        # Vitest — Store, reducers, selectors, storage, router
npm run test:unit:watch  # same, in watch mode
npm run test:e2e         # Playwright — boots a preview server and drives a real browser
```

## Deploy

### Cloudflare Pages (primary target)

1. Connect this repo, or drag-and-drop the `dist/` folder after running `npm run build`.
2. Build command: `npm run build`
3. Output directory: `dist`
4. No environment variables or server-side configuration required.

### Also compatible with

GitHub Pages, Netlify, Vercel, Apache, Nginx — any host that can serve
static files. Routing is entirely hash-based (`#/language/python/easy/variables`),
so no server-side rewrite rules are needed; a `404.html` fallback is not
required for correct operation but can be added for hosts that require one.

## Project layout

See `ARCHITECTURE.md` for module boundaries and where to add new code.
