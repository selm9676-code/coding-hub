# Architecture

This document explains module boundaries and the reasoning behind key
decisions, for anyone (human or AI) picking up this codebase later.

## Non-negotiables (carried from the project spec)

- **Zero placeholders.** Every visible feature works. Stub views for
  not-yet-built routes are clearly labeled as pending a specific future
  slice — they are not fake functionality pretending to be real.
- **Vanilla JS, ES Modules only.** No framework. Components are factory
  classes/functions that return DOM nodes.
- **Static output only.** Build-time Node.js is fine (Vite); the deployed
  `dist/` folder must run with zero server-side logic.
- **Hash-based routing**, because static hosts can't guarantee
  server-side rewrites for arbitrary deep links.

## Editor decision: CodeMirror 6, not Monaco

A later draft of the project spec proposed Monaco Editor. This was an
explicit deviation from an earlier, already-confirmed decision to use
CodeMirror 6, and the user reconfirmed CodeMirror 6 when the conflict was
flagged. **CodeMirror 6 is the project's editor.** If you see Monaco
referenced in an old spec document, that reference is stale — do not
"correct" the code to match it.

Practical implications of this choice:
- `src/scripts/editor/` (Slice 4) wraps `@codemirror/*` packages, not
  `monaco-editor`.
- `vite.config.js` chunks CodeMirror + its language packages separately
  from the main bundle, but the chunk is much smaller than Monaco's would
  have been — this actually makes the §21 performance budget easier to
  hit, not harder.
- `_editor.css` themes CodeMirror's `.cm-*` class names, not Monaco's
  theme JSON format.

## Layer boundaries

```
Views (src/views/)
  ↓ dispatch actions, read via selectors
Store (src/scripts/store/)
  ↓ notifies subscribers on state change
Persistence subscriber (bootstrap.js)
  ↓ calls
StorageProvider interface (src/scripts/storage/StorageProvider.js)
  ↑ implemented by
IndexedDBProvider  |  LocalStorageProvider
```

**Views never call a StorageProvider directly.** They dispatch actions.
This is what makes the future backend swap (spec §28) possible without
touching a single view: a new `CloudStorageProvider` implementing the same
interface, wired up once in `bootstrap.js`, and the rest of the app is
unaffected.

**The Store has no knowledge of storage.** `Store.js` is a pure,
dependency-free state container. It doesn't know IndexedDB exists.
`bootstrap.js` is the only file that wires the two together, via a
`store.subscribe()` callback that persists whole-blob slices (`settings`,
`xp`) after every change. Per-record slices (`progress`, `quizResults`,
`bookmarks`, `notes`, `achievements`) are persisted by their owning
feature module at the moment of the user action, not by a blanket resync
loop — this avoids re-writing every lesson's progress record every time
any one of them changes.

## Router

`Router.js` is generic — it knows how to parse a hash into
`{ params, query, route }` and call an `onChange` callback. It has no
opinions about what a "route" means for this app. App-specific policy
(remembering the last route, warning before leaving unsaved work) lives in
`guards.js`, registered via `beforeEach`/`afterEach` in `main.js`. Keeping
these separate means the Router itself is easy to unit-test without a
real DOM (see `tests/unit/Router.test.js`, which stubs only `window`).

**Known gotcha:** private class methods in JS are non-writable, so a
constructor cannot do `this.#privateMethod = this.#privateMethod.bind(this)`.
`Router.js` works around this with a separate `#boundHandleHashChange`
field created from an arrow function, so `addEventListener`/
`removeEventListener` target the same function reference.

## State shape

```js
{
  progress: { byLessonId: {...}, recentlyViewed: [...] },
  quiz:     { byQuizId: {...} },
  ui:       { activeModal, toasts, editorDrawerCollapsed, editorFullscreen, sidebarOpen },
  settings: { theme, editorConfig, lastRoute, dailyGoalMinutes },
  xp:       { total, history: [...] },
}
```

`ui` is intentionally never persisted — it's session/transient state only.

## Where things go (for future slices)

- New lesson-rendering code → `src/scripts/lessons/`
- New quiz type → `src/scripts/quizzes/types/`, registered in `QuizEngine.js`
- New editor language support → add the CodeMirror language package to
  `package.json` and `vite.config.js`'s `codemirror-langs` chunk, then
  wire it into `Editor.js`'s language-detection map
- New achievement → `src/scripts/progress/AchievementEngine.js`
- New route → add to `src/scripts/router/routes.js` and create the
  corresponding file in `src/views/`

## Content pipeline (Slice 2)

Lessons are authored as `.md` files with frontmatter under
`src/data/<languageId>/<tier>/*.md` (spec §5.2). Two things read them:

- **`build-plugins/vite-plugin-lessons.js`** — runs during `vite build`
  (`generateBundle` hook). Compiles every lesson to JSON, copies
  `languages.json`/`meta.json` through, and emits `search-index.json`.
- **`build-plugins/devLessonsMiddleware.js`** — intercepts `/data/*` and
  `/search-index.json` requests during `vite dev` and compiles content
  on the fly using the same `compileAllContent()` function the build
  plugin uses. This guarantees dev and prod render from identical
  compiled shapes; there's no separate "dev content" format to drift out
  of sync.

Both share `compileLesson()` and `compileAllContent()`, exported from
`vite-plugin-lessons.js`, and a tiny dependency-free frontmatter parser
in `build-plugins/frontmatter.js`. That parser handles flat
`key: value` and `key: [array]` frontmatter shapes only — it is not a
YAML parser. If lesson frontmatter ever needs nested structures, replace
it with a real YAML library rather than extending the regex approach.

**Views never fetch `.md` files directly.** They call
`src/scripts/languages/LanguageRegistry.js`, which fetches the *compiled*
JSON (`data/languages.json`, `data/<id>/meta.json`,
`data/<id>/<tier>/<lesson>.json`) and caches in-memory per session. This
keeps view code identical whether it's running against a dev-server
middleware response or a real built asset.

### Language registry status field

Each entry in `languages.json` has `"status": "complete" | "roadmap"`.
`"complete"` languages have real lesson content on disk;
`"roadmap"` languages appear in the grid with the same card shape but a
"Coming soon" pill and no `meta.json` — `LanguageHubView` branches on this
status rather than trying to fetch metadata that doesn't exist yet.
Voting/notify-me UI for roadmap languages is intentionally not built yet;
don't infer it from the presence of the roadmap page.



## Lesson system (Slice 3)

`src/scripts/lessons/` has three independent pieces, deliberately kept
separate so Slice 4 (Editor + Execution) can slot a real CodeMirror
instance into `LessonLayout`'s `editorSlot` without touching the other
two:

- **`LessonRenderer.js`** — turns compiled lesson JSON into a sanitized,
  syntax-highlighted DOM subtree. Knows nothing about layout or
  navigation.
- **`LessonLayout.js`** — the split-view/stacked-view chrome (resize
  handle, mobile drawer, fullscreen toggle). Exposes `contentSlot` and
  `editorSlot` as plain DOM nodes; doesn't know what goes inside them.
- **`LessonNavigation.js`** — breadcrumbs, prev/next computation, swipe
  gestures. Pure functions plus one DOM-rendering function, no shared
  state with the other two modules.

`LessonView.js` (in `src/views/`) is the only place that imports all
three and wires them to a specific lesson's data plus the Store.

### Editor placeholder, not a stub

The editor pane in Slice 3 is intentionally NOT wired to CodeMirror yet
— that's explicitly Slice 4 in the delivery plan. To keep this from
reading as unfinished/fake functionality, the placeholder says outright
that the live editor is coming and shows the lesson's first code
snippet as static, read-only reference text. There is no dead button
here: nothing claims to run code and then fails to.

### Keyboard shortcuts scope

`J`/`K`/`F`/`Esc` (spec §20) are wired in `LessonView.js`, scoped to that
view's mount lifetime via its cleanup function — they do not leak into
other routes. They're ignored while focus is inside a text input so a
future notes feature (Slice 6) won't fight with lesson navigation.

## Editor + Execution (Slice 4)

`src/scripts/editor/` has three pieces, mirroring the lesson system's
separation of concerns:

- **`CodeMirrorLoader.js`** — the only file that imports `codemirror`
  packages directly. Caches the core module load and per-language
  grammar loads separately, so switching languages between lessons
  doesn't re-download the shared core.
- **`ExecutionManager.js`** — knows nothing about CodeMirror or the DOM.
  Takes a language + code string, returns a result. Owns worker
  lifecycle (creation, 5s timeout, termination on crash/timeout,
  lazy recreation on the next run).
- **`Editor.js`** — the component. Composes the other two plus a
  toolbar/status-bar shell. This is the only piece `LessonView.js`
  imports directly.

### Real execution vs. simulated output

Per spec §12, only Python and JavaScript execute real user code in
v1.0. `ExecutionManager.run()` is a single entry point regardless of
language — callers never branch on "is this language real or
simulated," which means adding a real runtime for C++/Rust/Go later
(WASM compilation) is a change entirely inside `ExecutionManager`, not
a call-site change in `Editor.js`.

The simulated path (`#runSimulated`) is deliberately worded to say
outright that the code didn't actually compile or run — "this is a
walkthrough, not a real run." Do not soften this wording to sound more
like a real execution result; that would cross into misleading the
learner about what happened, which the spec's "zero fake buttons"
principle (§2, §29.1) exists to prevent.

### Sandbox boundaries (`javascriptWorker.js`)

User JavaScript runs via `new Function(...)` **inside the worker**,
never on the main thread. The worker's own scope never held references
to `document`/`window`/`fetch`/`XMLHttpRequest` in the first place (Web
Workers don't have them), and the code additionally passes explicit
`undefined` bindings for those names as function parameters, so even if
a future refactor accidentally ran this in a context that DID have
those globals, user code still couldn't reach them. If you modify this
worker, preserve both layers — the worker-context isolation and the
explicit parameter shadowing — rather than relying on either alone.

### Known tradeoff: Pyodide loads from a CDN

`workers/pythonWorker.js` calls `importScripts('https://cdn.jsdelivr.net/...')`
to load Pyodide. This is flagged explicitly (both here and in the file's
own header comment) rather than silently shipped, because it's in real
tension with two spec goals:

- **§2, "pure static files"** — the deployed app now has a runtime
  dependency on a third-party CDN being reachable, not just at deploy
  time but every time a learner first runs Python in a session.
- **§17, offline support** — a learner who installs the PWA and goes
  offline cannot run Python for the first time without having
  previously cached that CDN response (the service worker's caching
  strategy would need to explicitly include jsdelivr's origin, which
  crosses a same-origin assumption baked into most of this app).

**The alternative** is vendoring Pyodide's distribution (WASM + supporting
JS + stdlib, roughly 10MB+) into `public/pyodide/` and pointing
`importScripts` at a same-origin path instead. That makes the app truly
self-contained and lets the existing service worker cache it like any
other static asset — at the cost of repo size, a manual process to
update Pyodide versions (rather than always getting jsdelivr's latest),
and a larger initial PWA install footprint.

This project ships the CDN approach in Slice 4 because it's the
standard, zero-config Pyodide integration path and unblocks real Python
execution immediately. Switching to a vendored copy is a legitimate
follow-up but is a deliberate tradeoff call, not a default — flagging it
here so it doesn't get silently "fixed" in either direction without
someone deciding on purpose.

## Quiz system (Slice 5)

`src/scripts/quizzes/` mirrors the lesson/editor systems' separation of
concerns:

- **`types/*.js`** — 9 independent modules, one per quiz type in spec
  §13. Each exports a single `mount(container, quiz, onSubmit)` function
  and returns a cleanup function. Type modules never import each other
  and never touch the Store directly — they only call `onSubmit({correct})`.
- **`Feedback.js`** — shared correct/incorrect rendering, progressive
  hint reveal, the solution-unlock-after-2-failures threshold, and XP
  award dispatch. Every type module looks and behaves consistently
  because they all delegate here rather than each rolling their own
  feedback UI.
- **`QuizEngine.js`** — the only file that imports all 9 type modules
  and dispatches on `quiz.type`. Owns attempt recording
  (`quiz/recordAttempt`) and wires each type's `onSubmit` callback to
  `Feedback.js`. Adding a 10th quiz type means writing one new type
  module plus one line in `QuizEngine.js`'s `TYPE_MOUNTERS` map — no
  other file changes.
- **`QuizLoader.js`** — fetches and caches `data/<languageId>/quizzes.json`,
  mirroring `LanguageRegistry.js`'s caching pattern. Resolves a lesson's
  `quizIds` (populated by the content pipeline — see below) into full
  quiz definitions.

### Content pipeline extension

`build-plugins/vite-plugin-lessons.js` (Slice 2) now also reads each
language's `quizzes.json`, and for every compiled lesson, populates
`quizIds` by matching quizzes whose `lessonId` field equals the lesson's
`id`. This happens in `compileAllContent()`, not inside `compileLesson()`
itself — `compileLesson()` stays a pure markdown-in/JSON-out function
with no knowledge of sibling files; the caller does the cross-file
matching. `devLessonsMiddleware.js` serves `quizzes.json` requests the
same way it serves everything else, so dev and prod stay identical.

### Drag & Drop is tap-to-place, not pointer-drag

`DragDrop.js` satisfies spec §13's "touch + mouse" requirement via
tap-to-select / tap-to-place rather than the HTML5 Drag and Drop API
(which has notoriously poor touch support) or manual pointer-event drag
physics. Every target is a real `<button>` that responds identically to
a mouse click or a touch tap, and is keyboard-reachable via Tab+Enter
for free. This is a deliberate interaction choice, documented in the
file's own header comment so it doesn't get silently "upgraded" to a
literal drag gesture without someone deciding that's worth the added
complexity.

### Code-based quiz types execute real code, not text diffs

`DebugTheCode.js`, `WriteCode.js`, and `MiniProject.js` all call the
same `ExecutionManager` from Slice 4 to actually run the learner's code
for Python/JavaScript and compare real output against `expectedOutput`
— multiple valid solutions to the same problem all pass, since nothing
is diffed against a single canonical answer string. `CodeCompletion.js`
is the one exception: it's normalized-text comparison against a
`solution` field, which is a real, disclosed limitation (see that file's
header comment) since blanks-in-a-template questions are usually
authored to have one intended fill, unlike open-ended "write a program
that does X" questions.

For languages without real execution (C++/Rust/Go in v1.0, same as
Slice 4), every code-based quiz type falls back to the same
normalized-text comparison, and says so in its result message rather
than pretending to have verified anything.

### Lesson completion is quiz-gated, and lesson XP is now awarded

As of this slice, `LessonView.js`'s `mountQuizSection()` fetches the
lesson's quizzes and only calls `completeLessonOnce()` (a small local
helper) once every attached quiz has a `bestScore >= 100` in the Store.
A lesson with zero quizzes attached completes immediately, since
there's nothing to gate on.

`completeLessonOnce()` also fixed a real gap: `meta.json`'s per-lesson
`xp` field (authored since Slice 2) was never actually dispatched to the
`xp` slice before this slice. It now is, guarded against double-award
across repeated completion checks (every additional correct quiz
re-checks "are all quizzes done," which would otherwise re-fire the XP
award every time). If you add a new completion path anywhere, route it
through `completeLessonOnce()` rather than dispatching
`progress/completeLesson` directly, or you'll reintroduce the
double-award bug this helper exists to prevent.

## Persistence was broken from Slice 1 through Slice 5 — fixed in Slice 6

This is worth its own section because it's the most significant fix in
the project so far, not a minor cleanup.

Every earlier slice's `bootstrap.js` comment claimed: "Per-record slices
(progress, quiz) are persisted by their own feature modules calling
storageProvider.set() directly." **That was never true.** No file in
`src/views/` or `src/scripts/quizzes/` ever imported or called a
StorageProvider. `LessonView.js` and `QuizEngine.js` only ever
dispatched actions to the in-memory `Store`. The practical consequence:
every lesson completion, quiz attempt, and XP award beyond whatever was
hydrated at boot was living only in memory and vanishing on the next
page reload — the app *looked* like it was saving progress (the UI
updated correctly) but nothing reached IndexedDB or localStorage.

**The fix**, in `bootstrap.js`'s `wirePersistence()`: every per-record
slice (`progress`, `quiz`, and as of this slice `bookmarks`, `notes`,
`achievements`) is diffed against its previous state on every Store
dispatch via a shared `persistRecordMapDiff()` helper, which writes only
the records that actually changed and deletes any that were removed.
This works for all five slices because they all share the same shape —
a flat map from record id to record object (`byLessonId`, `byQuizId`,
`byId`, `byId`, `unlockedById` respectively) — even though the map's
property name differs per slice.

**Why this approach over the originally-claimed one:** having feature
modules call `storageProvider.set()` directly would mean threading a
StorageProvider reference into `LessonView.js`, `QuizEngine.js`, and
every future feature module that touches per-record state — coupling
UI code to persistence mechanics. The Store-subscription approach means
no feature module needs to know a StorageProvider exists at all;
dispatching an action is enough. This is also why `wireAchievementUnlocks()`
and `wirePersistence()` can both subscribe independently without
coordinating — the Store's subscriber list already handles multiple
independent concerns reacting to the same dispatches.

If you add a new stateful feature, add its slice to both
`registerSlices()` and (if it's a per-record collection) a new
`persistRecordMapDiff()` call in `wirePersistence()` — or a single
`storageProvider.set()` call in the whole-blob style used for
`settings`/`xp` if it's a single-object slice instead. Do not add a
feature module that calls a StorageProvider directly; that reintroduces
the coupling this fix removed.

## Progress + Gamification (Slice 6)

- **`StreakTracker.js`** — pure functions over `state.xp.history`
  (already-existing data — every XP award carries a `date`). No
  separate "last active date" is tracked anywhere, so the streak can
  never drift out of sync with what the XP bar itself shows. Day
  boundaries use the browser's local time, not UTC, so a streak doesn't
  break at an arbitrary UTC midnight that doesn't match the learner's
  actual day.
- **`AchievementEngine.js`** — 24 static achievement definitions (spec
  §15 requires at least 20), each a pure `check(state, streak, level)`
  function. `checkForNewUnlocks()` is called from a Store subscriber in
  `bootstrap.js` after every dispatch; newly-eligible achievements are
  unlocked and toasted automatically — no feature code anywhere needs to
  remember to check achievements after doing something noteworthy.

  **Disclosed limitation:** lesson ids aren't namespaced by language
  (`"variables"` exists under python/, javascript/, cpp/, rust/, go/),
  and `state.progress.byLessonId` is keyed only by lesson id. An
  achievement like "complete a lesson in 2 different languages" can't
  be computed accurately from this state shape — it would undercount
  whenever two languages happen to use the same lesson id. Rather than
  ship a "Polyglot" achievement that quietly lies about what it's
  counting, that achievement was left out, and the limitation is
  documented in the file's own header comment. Fixing it properly means
  re-keying progress records as `${languageId}:${lessonId}`, which
  touches `LessonView.js`, `TierListView.js`, and `ProgressView.js` —
  a deliberate follow-up, not a silent Slice 6 change.
- **`StatsDashboard.js`** — renders the `/#/progress` view. Its
  per-language "completion rings" are honestly a started/not-started
  indicator, not a real percentage — a real ring needs each language's
  `meta.json` (for the total lesson count to divide by), and fetching
  every complete language's meta.json on every dashboard render was
  judged not worth the extra requests yet. Documented in the file's
  header rather than faking a percentage from data that isn't there.
- **`BookmarkManager.js`** — one bookmark-id scheme
  (`lesson:${lessonId}` / `snippet:${lessonId}:${index}`) lives in this
  one file; nothing else constructs a bookmark id directly.
- **`NoteManager.js`** — one note per lesson (note id === lesson id),
  a deliberate scope decision documented in the file's header. Full-text
  search is a simple case-insensitive substring match, not fuzzy —
  fuzzy matching is fuse.js's job for the Slice 7 search feature, and a
  learner searching their own small set of personal notes benefits more
  from predictable exact matching than fuzzy ranking.

## Testing philosophy

Unit tests (Vitest) cover pure logic: reducers, selectors, the Store
class, storage providers, and router path-parsing. These don't need a
real browser and run fast. E2E tests (Playwright) cover real user flows
against a built, served app — navigation, focus management, error states.
Both are required before a slice is considered done (spec §24.2).
