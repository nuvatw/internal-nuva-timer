# nuva Focus Timer -- 6-Week Optimization & Feature PRD

> **Scope:** Code quality, performance, test coverage, and targeted feature additions
> **Start:** Week 24 (Mar 2, 2026) -- **End:** Week 29 (Apr 12, 2026)
> **Stack:** React 19 + Vite 7 + Tailwind CSS 4 + Framer Motion + Express.js + Supabase
> **Prerequisites:** Weeks 14-23 implementation complete (timer animations, calendar, manual entry, gamification)

---

## Executive Summary

The first 23 weeks built a fully functional focus timer with gamification, calendar, review analytics, and a polished design system. This 6-week plan focuses on three pillars:

1. **Code Quality & Consistency** (Weeks 24-25) -- Eliminate technical debt, deduplicate patterns, improve type safety
2. **Performance & Reliability** (Weeks 26-27) -- Optimize rendering, improve error handling, add test coverage
3. **Targeted Feature Enhancements** (Weeks 28-29) -- Data insights, session templates, and offline resilience

---

## Phase 1 -- Code Quality & Consistency (Weeks 24-25)

### Week 24: Type Safety & Shared Contracts

**Goal:** Establish a single source of truth for all shared types and eliminate duplicated definitions.

#### 24A. Move GamificationResult to shared package

**Files:** `shared/src/types.ts` (new), `server/src/lib/gamification.ts`, `client/src/types/models.ts`

**Current problem:**
- `GamificationResult` is defined identically in both `client/src/types/models.ts` and `server/src/lib/gamification.ts`.
- Any future changes must be made in two places.

**Change:**
- Create `shared/src/types.ts` as the canonical location for all types shared between client and server.
- Move `GamificationResult` there.
- Both client and server import from `@nuva/shared/types`.
- Add `ProgressData` to shared types as well (currently only in client `types/models.ts`).

#### 24B. Centralize validation helpers on the server

**Files:** `server/src/lib/validate.ts` (new), all route files

**Current problem:**
- Validation logic is repeated across route handlers (e.g., checking `planned_title` length, `department_id` ownership, `duration_minutes` range).
- The same ownership check pattern (`select().eq("id", id).eq("user_id", userId).single()`) appears in `sessions.ts`, `departments.ts`, and `projects.ts`.

**Change:**
- Create `server/src/lib/validate.ts` with reusable validators:
  ```ts
  function validateString(value: unknown, field: string, maxLength: number): string | null
  function validateDuration(value: unknown, min: number, max: number): number | null
  async function validateOwnership(table: string, id: string, userId: string): Promise<boolean>
  ```
- Refactor route handlers to use these shared validators.
- Reduce per-route code by 30-40%.

#### 24C. Server timezone consistency

**Files:** `server/src/lib/dates.ts` (new), `server/src/routes/progress.ts`, `server/src/lib/gamification.ts`

**Current problem:**
- Server uses `new Date().toISOString().slice(0, 10)` for "today" which gives UTC date, not Asia/Taipei.
- Client uses `todayYMD()` which correctly uses Asia/Taipei.
- This can cause a mismatch: a session completed at 23:30 Taipei time (15:30 UTC) would have different dates on client vs server.
- Streak logic in `gamification.ts` uses UTC "yesterday" which could break streaks for evening sessions.

**Change:**
- Create `server/src/lib/dates.ts` with:
  ```ts
  function todayTaipei(): string // "YYYY-MM-DD" in Asia/Taipei
  function yesterdayTaipei(): string
  ```
- Replace all UTC date slicing in `progress.ts` and `gamification.ts`.
- This is a correctness fix, not just a style change.

#### 24D. Extract SettingsPage sub-components to separate files

**File:** `client/src/pages/SettingsPage.tsx` (698 lines)

**Current problem:**
- SettingsPage contains 6 components in a single file: `SettingsCard`, `ProfileSection`, `InlineEditRow`, `DepartmentsSection`, `ProjectsSection`, `DailyGoalSection`, `AccountSection`.
- This makes the file hard to navigate and each section hard to test independently.

**Change:**
- Extract to `client/src/components/settings/` directory:
  - `SettingsCard.tsx` (shared card shell)
  - `ProfileSection.tsx`
  - `DepartmentsSection.tsx`
  - `ProjectsSection.tsx`
  - `DailyGoalSection.tsx`
  - `AccountSection.tsx`
  - `InlineEditRow.tsx`
- SettingsPage.tsx becomes a thin composition of these components.
- No functionality changes.

---

### Week 25: Pattern Consistency & Dead Code Removal

**Goal:** Unify repeated UI patterns and remove unused code paths.

#### 25A. Create shared EscapeHandler and useDropdown hooks

**Files:** `client/src/hooks/useDropdown.ts` (new)

**Current problem:**
- The Escape key handler + click-outside pattern is repeated in 5+ components:
  - `AvatarDropdown` in AppLayout.tsx (has its own click-outside + escape)
  - `FilterDropdown` in FilterBar.tsx (uses `useClickOutside` + manual escape)
  - `ExportMenu.tsx` (uses `useClickOutside` + manual escape)
  - `CommandPalette.tsx` (manual escape in `useCommandPalette`)
  - `SessionDetailPanel.tsx` (manual escape handler)

**Change:**
- Create `useDropdown` hook that combines:
  ```ts
  function useDropdown(): {
    open: boolean;
    setOpen: (open: boolean) => void;
    ref: RefObject<HTMLDivElement>;
    // Handles click-outside and Escape automatically
  }
  ```
- Refactor `AvatarDropdown`, `FilterDropdown`, and `ExportMenu` to use this hook.
- Keep `CommandPalette` and `SessionDetailPanel` with their current patterns (they have additional complexity).

#### 25B. Verify and clean up deleted AlarmOverlay references

**Files:** Throughout the codebase

**Current problem:**
- Git status shows `client/src/components/AlarmOverlay.tsx` and `client/src/hooks/useAlarm.ts` have been deleted.
- Need to verify no dangling imports or references remain.

**Change:**
- Search for any remaining references to `AlarmOverlay` or `useAlarm`.
- Remove any dead imports.

#### 25C. Standardize error handling in async callbacks

**Files:** `client/src/pages/SettingsPage.tsx`, `client/src/components/SessionDetailPanel.tsx`

**Current problem:**
- Some async handlers use try/catch (e.g., `handleSave` in ProfileSection), others use `.catch()` (e.g., `api.get` calls).
- Some catch blocks silently swallow errors, others show toasts.
- Inconsistent error message extraction: `err instanceof Error ? err.message : "..."` is repeated 6+ times.

**Change:**
- Create `client/src/lib/error.ts`:
  ```ts
  function getErrorMessage(error: unknown, fallback: string): string
  ```
- Standardize all user-facing async operations to use try/catch + toast pattern.
- Data-fetching operations (background loads) can remain silent.

#### 25D. Clean up unused motion variants

**File:** `client/src/lib/motion.ts`

**Current problem:**
- Several exported variants may not be used anywhere (e.g., `fadeIn`, `cardGridVariants`).
- `completionSpringTransition` is exported but usage should be verified.

**Change:**
- Audit all exports in `motion.ts` against actual imports across the codebase.
- Remove any unused exports.
- Add JSDoc comments to the remaining variants explaining where they are used.

---

## Phase 2 -- Performance & Reliability (Weeks 26-27)

### Week 26: Rendering Performance

**Goal:** Reduce unnecessary re-renders and optimize heavy components.

#### 26A. Memoize AppLayout sub-components

**File:** `client/src/components/AppLayout.tsx`

**Current problem:**
- `AvatarDropdown` receives many props including `signOut`, `setTheme`, `toggleMute` -- these are stable references but `levelInfo` changes on every progress update, causing the entire dropdown to re-render.
- `NavXpBar` is already memoized (good), but `AvatarDropdown` is not.

**Change:**
- Wrap `AvatarDropdown` in `React.memo`.
- Memoize `levelInfo` computation with `useMemo` (it already is, verify dependencies are correct).

#### 26B. Virtualize long session lists

**Files:** `client/src/components/review/SessionList.tsx`

**Current problem:**
- Review page fetches up to 200 sessions and renders them all.
- For users with heavy usage, this creates 200+ DOM nodes in the session list.

**Change:**
- If `sessions.length > 50`, use a simple windowed rendering approach:
  - Show first 20 items immediately.
  - "Show more" button loads 20 more (incremental reveal).
  - Alternative: Use `react-window` for true virtualization if performance testing shows need.
- Keep the simple approach first -- avoid over-engineering.

#### 26C. Debounce search in FilterBar

**File:** `client/src/components/FilterBar.tsx`

**Current status:** Already debounced at 300ms (good). Verify it works correctly.

**Optimization:**
- Move the debounce to `useDeferredValue` from React 19 for smoother typing experience.
- This is a minor improvement but uses the React 19 primitive correctly.

#### 26D. Optimize CalendarPage date range computation

**File:** `client/src/pages/CalendarPage.tsx`

**Current problem:**
- `dateRange` useMemo depends on `weekStart`, `monthYear`, `monthNum` -- but in week view, the month values are irrelevant (and vice versa).
- The `debouncedNav` pattern works but could be simplified.

**Change:**
- Split dateRange computation into separate memos per view mode.
- Use conditional dependencies to avoid unnecessary recomputation.

---

### Week 27: Test Coverage & Error Resilience

**Goal:** Add meaningful tests for core business logic and improve error handling.

#### 27A. Shared game logic tests

**File:** `shared/src/game.test.ts`

**Current problem:**
- Verify existing test coverage. The file exists but may need expansion.

**Change:**
- Ensure tests cover:
  - `xpForLevel` / `levelFromXp` round-trip consistency
  - `calculateXpGain` with various daily minute thresholds (multiplier boundaries at 60, 120, 180, 240 minutes)
  - `calculateNewTomatoes` edge cases (boundary at 30-minute intervals)
  - `getLevelTitle` returns correct tier names for boundary levels (5, 6, 10, 11, etc.)
  - `getCurrentMultiplier` caps at 5x

#### 27B. Client timer hook tests

**File:** `client/src/hooks/timer.test.ts`

**Current problem:**
- Verify existing test coverage and expand.

**Change:**
- Test `computeRemaining` and `computeElapsed` with:
  - Normal running state
  - Paused state (should freeze elapsed time)
  - Finished state (should return 0)
  - Edge case: paused time exceeds duration

#### 27C. Server session API tests

**File:** `server/src/__tests__/api.test.ts`

**Current problem:**
- The test file exists but runs against `server/dist/` (compiled CJS), causing ESM/CJS conflicts with vitest.

**Change:**
- Reconfigure server tests to run against source `.ts` files using vitest's TypeScript support.
- Add test cases for:
  - `POST /sessions/start` -- validates duration range, prevents duplicate active sessions
  - `POST /sessions/:id/complete` -- calculates correct `ended_at` and awards gamification
  - `POST /sessions/manual` -- validates date ranges and duration bounds
  - `PATCH /sessions/:id` -- only allows editing finished sessions

#### 27D. Add API error boundary on client

**Files:** `client/src/lib/api.ts`, `client/src/components/ErrorBoundary.tsx`

**Change:**
- Enhance the `api` helper to:
  - Automatically retry on network failures (1 retry with 1s delay).
  - Throw typed errors with HTTP status codes.
  - Log errors to console in development only.
- Verify `ErrorBoundary` catches async render errors and provides a "Retry" action.

---

## Phase 3 -- Targeted Feature Enhancements (Weeks 28-29)

### Week 28: Session Templates & Quick Start

**Goal:** Let users save frequently used session configurations for one-tap start.

#### 28A. Session template data model

**Database:** `supabase/migrations/003_session_templates.sql`

```sql
CREATE TABLE session_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  department_id uuid REFERENCES departments(id),
  project_id uuid REFERENCES projects(id),
  duration_minutes integer NOT NULL DEFAULT 20,
  planned_title text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_templates_user ON session_templates(user_id, sort_order);
```

#### 28B. Server CRUD endpoints

**File:** `server/src/routes/templates.ts` (new)

- `GET /api/templates` -- list user's templates (ordered by sort_order)
- `POST /api/templates` -- create template
- `PATCH /api/templates/:id` -- update template
- `DELETE /api/templates/:id` -- delete template

#### 28C. Template picker in IdleForm

**File:** `client/src/components/timer/IdleForm.tsx`

**Change:**
- Add a "Templates" section above the manual form.
- Show saved templates as horizontal scrollable cards.
- Clicking a template auto-fills all fields (department, project, duration, title).
- "Save as template" button at bottom of form when fields are filled.
- First-time: show a subtle prompt ("Save this setup for next time?").

#### 28D. Template management in Settings

**File:** `client/src/components/settings/TemplatesSection.tsx` (new)

- List templates with drag-to-reorder (optional, basic up/down arrows as MVP).
- Inline edit and delete.
- Same SettingsCard pattern as departments/projects.

---

### Week 29: Insights Dashboard & Offline Resilience

**Goal:** Provide actionable focus insights and improve offline behavior.

#### 29A. Weekly insights summary

**File:** `client/src/components/review/WeeklyInsights.tsx` (new)

**UI:** A card at the top of the Review page (week view only) showing:
- Best focus day this week (day with most focus minutes)
- Average daily focus time
- Peak productive hour (most sessions started in which hour)
- Streak status and encouragement message
- Week-over-week comparison (this week vs last week: up/down percentage)

**Data:** Computed client-side from the already-fetched sessions array. No new API endpoint needed.

#### 29B. Focus time heatmap

**File:** `client/src/components/review/FocusHeatmap.tsx` (new)

**UI:** A GitHub-style contribution heatmap on the Level page:
- 12 weeks of daily focus data (84 cells).
- Color intensity based on daily focus minutes (0 = empty, 1-30 = light, 31-60 = medium, 61+ = dark).
- Tooltip on hover shows date and total minutes.

**Data:** `GET /api/reports/heatmap?weeks=12` (new endpoint returning `{date: string, minutes: number}[]`).

#### 29C. Offline session queue

**Files:** `client/src/lib/offline-queue.ts` (new), `client/src/hooks/useTimer.ts`

**Current problem:**
- When offline, the timer runs locally but `start()` and `complete()` API calls fail silently or show errors.
- Users lose session data if they close the browser while offline.

**Change:**
- Create an offline queue stored in IndexedDB:
  ```ts
  interface QueuedAction {
    id: string;
    action: "start" | "complete" | "cancel";
    payload: Record<string, unknown>;
    createdAt: string;
  }
  ```
- When API calls fail with network errors, queue the action.
- On reconnection (online event), replay queued actions in order.
- Show a "syncing" indicator in the header when queue has pending items.
- This is a progressive enhancement -- the timer already works offline for the countdown; this adds data persistence.

#### 29D. Service worker improvements

**File:** `client/public/sw.js`

**Change:**
- Cache API responses for `/departments` and `/projects` (these change infrequently).
- Return cached data when offline, with a "stale while revalidate" strategy.
- Pre-cache the app shell (HTML, CSS, JS) for instant offline loads.

---

## Files Summary

### New Files

| File | Week | Description |
|------|------|-------------|
| `shared/src/types.ts` | 24 | Shared type definitions (GamificationResult, ProgressData) |
| `server/src/lib/validate.ts` | 24 | Reusable server-side validation helpers |
| `server/src/lib/dates.ts` | 24 | Server-side Asia/Taipei date utilities |
| `client/src/components/settings/*.tsx` | 24 | Extracted settings sub-components (6 files) |
| `client/src/hooks/useDropdown.ts` | 25 | Shared dropdown state management hook |
| `client/src/lib/error.ts` | 25 | Error message extraction utility |
| `server/src/routes/templates.ts` | 28 | Session templates CRUD endpoints |
| `client/src/components/settings/TemplatesSection.tsx` | 28 | Template management UI |
| `client/src/components/review/WeeklyInsights.tsx` | 29 | Weekly focus insights card |
| `client/src/components/review/FocusHeatmap.tsx` | 29 | Contribution-style focus heatmap |
| `client/src/lib/offline-queue.ts` | 29 | IndexedDB-based offline action queue |
| `supabase/migrations/003_session_templates.sql` | 28 | Templates table migration |

### Modified Files

| File | Changes |
|------|---------|
| `shared/src/game.ts` | getLevelTitle now derives from LEVEL_TIERS |
| `client/src/types/models.ts` | Import GamificationResult from shared |
| `client/src/components/FilterBar.tsx` | Use shared types, updated duration options |
| `client/src/components/SessionDetailPanel.tsx` | Use shared Session type, remove wrapper function |
| `client/src/components/DailyProgress.tsx` | Use formatMinutes from dates.ts |
| `client/src/lib/motion.ts` | Deduplicate overlay variants |
| `client/src/pages/LevelPage.tsx` | Add useDocumentTitle |
| `client/src/pages/SettingsPage.tsx` | Thin composition of extracted components |
| `client/src/components/AppLayout.tsx` | Memoize AvatarDropdown |
| `server/src/routes/*.ts` | Use shared validation helpers |
| `server/src/routes/progress.ts` | Use Asia/Taipei dates |
| `server/src/lib/gamification.ts` | Use Asia/Taipei dates, shared types |
| `client/src/hooks/useTimer.ts` | Offline queue integration |
| `client/public/sw.js` | Enhanced caching strategy |

---

## Week-by-Week Execution Summary

| Week | Phase | Focus | Key Deliverables |
|------|-------|-------|------------------|
| **24** | Quality | Types & validation | Shared types package, server validation helpers, timezone fix |
| **25** | Quality | Pattern consistency | useDropdown hook, dead code removal, error handling |
| **26** | Performance | Rendering | Memoization, list virtualization, search optimization |
| **27** | Reliability | Testing & errors | Game logic tests, timer tests, API tests, error boundaries |
| **28** | Features | Session templates | Template CRUD, quick-start picker, settings management |
| **29** | Features | Insights & offline | Weekly insights, focus heatmap, offline queue, SW caching |

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| TypeScript strict mode violations | ~0 | 0 |
| Duplicated type definitions | 3+ | 0 |
| Test coverage (shared) | Unknown | 90%+ for game.ts |
| Test coverage (server routes) | Minimal | Core happy paths |
| Client bundle size | Baseline | No increase from refactors |
| Lighthouse Performance score | Baseline | 90+ |
| Offline capability | Timer only | Timer + data sync |

---

## Dependencies

**No new npm packages required** for Weeks 24-27 (pure refactoring).

Weeks 28-29 may optionally add:
- `idb` (3KB, IndexedDB wrapper) for offline queue -- or use raw IndexedDB API
- No other dependencies planned

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Timezone fix changes streak calculations | Medium | Run migration script to verify existing data, add comprehensive tests first |
| Extracting SettingsPage breaks component state | Low | Extract one component at a time, test each extraction |
| Offline queue creates data conflicts | Medium | Queue only creation/completion actions, not updates; server-side idempotency |
| Template feature scope creep | Low | MVP: simple CRUD + picker, no drag-reorder in v1 |
