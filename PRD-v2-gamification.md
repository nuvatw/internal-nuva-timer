# nuva Focus Timer v2 — Gamification Redesign PRD

## Vision

Transform nuva from a utility timer into a **game-like focus experience**. The interface becomes radically clean — just two tabs and an avatar — while a layered gamification system (tomatoes, XP, levels) turns every focus session into tangible progress. Every interaction has sound. Every milestone has celebration.

---

## Current State

- **Navigation**: Left sidebar with Timer / Review / Settings / Search / Theme toggle / Sign out
- **Timer**: Idle form → Running (circular ring) → Alarm overlay → Completion modal
- **Audio**: Only `alarm.mp3` plays (looping alarm at timer end). SFX files exist in `public/sfx/` (`clicked.wav`, `sectionStart.wav`, `sectionComplete.wav`, `levelUp.wav`) but are **not wired up**
- **Gamification**: None. No XP, levels, streaks, or progress tracking
- **Completion flow**: Timer finishes → alarm overlay → user must click "Stop Alarm" → completion modal. User reported `sectionComplete` sound never plays

---

## Target State

### Navigation (Top Bar)
```
┌─────────────────────────────────────────────────────────────┐
│  nuva    [Timer]  [Review]                 [Lv.7 ████░ 🎯] │
│                                             avatar dropdown  │
└─────────────────────────────────────────────────────────────┘
```
- **Left**: Logo + two tab links (Timer, Review)
- **Right**: Level badge + XP progress bar + avatar icon (clickable dropdown)
- **Avatar dropdown**: Profile info, Level/XP detail, Settings link, Theme toggle (Light/Dark/System), Sign out
- **No sidebar**. Settings page accessed from avatar dropdown only

### Timer Page
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                  Today: 3h 30m focused                      │
│                                                             │
│          🍅🍅🍅🍅🍅🍅🍅  ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○       │
│                   7 / 20 tomatoes                           │
│                                                             │
│              ┌──────────────────┐                           │
│              │    ╭────────╮    │                           │
│              │    │  24:30 │    │    <- circular timer      │
│              │    ╰────────╯    │                           │
│              └──────────────────┘                           │
│                                                             │
│         [Department ▾] [Project ▾]                          │
│         [30 min] [60 min] [Custom]                          │
│         [What will you focus on?     ]                      │
│         [        ▶ Start Focus       ]                      │
│                                                             │
│              +12 XP earned today                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```
- **Daily progress banner**: total minutes + tomato grid (1 tomato = 30 min, goal = 20)
- **Duration options**: 30 min, 60 min, Custom (number input, 5-120 min range)
- **Auto-complete**: When timer reaches 0, session completes automatically (play `sectionComplete.wav`), then show completion modal. No alarm overlay step

### Gamification System

**Tomatoes**:
- 1 tomato = every 30 minutes of completed focus (a 60-min session = 2 tomatoes)
- Display as a visual grid on the Timer page (filled = earned, empty = remaining to goal)
- Daily goal: 20 tomatoes (= 10 hours). Configurable in settings
- Tomato appears with a pop animation when earned during a session

**XP System**:
- Base rate: **1 XP per 10 minutes** of completed focus time
- **Daily multiplier**: Scales with cumulative daily focus hours
  - Hour 1 (0-60 min): 1x → 1 XP / 10 min
  - Hour 2 (61-120 min): 2x → 2 XP / 10 min
  - Hour 3 (121-180 min): 3x → 3 XP / 10 min
  - Hour N: Nx → N XP / 10 min
- XP awarded on session completion only (canceled sessions earn nothing)
- Displayed as "+X XP" toast after each session

**Leveling**:
- Formula: `XP_needed_for_level(n) = 10 * n * n` (cumulative XP thresholds)
  - Level 1 → 2: 40 XP (~40 min at 1x)
  - Level 2 → 3: 90 XP total
  - Level 5 → 6: 360 XP total
  - Level 10 → 11: 1210 XP total
  - Level 20 → 21: 4410 XP total
- Level displayed next to avatar with XP progress bar
- Level titles:
  - 1-5: Seedling
  - 6-10: Sprout
  - 11-15: Sapling
  - 16-20: Tree
  - 21-30: Grove
  - 31-40: Forest
  - 41-50: Ancient Forest
  - 51+: Mythic

**Level-Up Celebration**:
- Full-screen overlay with backdrop blur
- Old level → New level transition animation (number morphs/scales up)
- Title change displayed (e.g., "Sprout → Sapling")
- Canvas confetti burst (dual cannon from sides)
- `levelUp.wav` plays
- Auto-dismiss after 4 seconds or tap to dismiss

### Sound System

| Event | Sound File | Behavior |
|-------|-----------|----------|
| Any interactive element click | `clicked.wav` | Short, subtle. All buttons, links, toggles, dropdowns |
| Session starts | `sectionStart.wav` | Plays once when timer begins counting |
| Session completes (timer hits 0) | `sectionComplete.wav` | Plays once. Timer auto-completes |
| Level up | `levelUp.wav` | Plays with full-screen celebration overlay |
| Global mute | — | Toggle in avatar dropdown. Persisted to localStorage |

**Audio Architecture**:
- Build a `useSfx` hook wrapping Web Audio API / HTMLAudioElement
- Preload all SFX on first user interaction (click anywhere)
- Respect `prefers-reduced-motion` for celebration animations
- Provide global mute toggle (persisted in localStorage)
- Remove current alarm overlay + looping alarm.mp3 (replaced by auto-complete + sectionComplete)

---

## 10-Week Implementation Plan

---

### Week 1: Navigation Overhaul — Sidebar → Top Bar

**Goal**: Replace the left sidebar with a clean top navigation bar. Timer and Review as tabs. Avatar with dropdown in top-right. Settings accessible only from dropdown.

**Files to modify**:
- `client/src/components/AppLayout.tsx` — Full rewrite: remove sidebar, build top nav bar
- `client/src/index.css` — Remove sidebar CSS variables (`--color-sidebar`, `--color-sidebar-active`, `--color-sidebar-hover`), add top nav tokens
- `client/src/App.tsx` — Remove `/settings` from main nav, keep route but access via dropdown only

**Implementation details**:

1. **Top bar component** (`AppLayout.tsx`):
   - Fixed position, `h-14`, full width, `border-b border-border`, `bg-bg/95 backdrop-blur-sm`
   - Left section: "nuva" logo text + Tab links (Timer, Review)
   - Active tab: `text-accent` + bottom border indicator (2px accent underline)
   - Right section: Avatar button (opens dropdown)
   - Remove all sidebar-related code (SidebarContent, mobile drawer, hamburger)

2. **Avatar dropdown**:
   - Trigger: avatar icon button (current icon system from `avatar-icons.ts`)
   - Dropdown panel: `AnimatePresence` + `motion.div` (fade + slide down)
   - Content:
     - User info header (avatar icon, display name, email placeholder)
     - Level badge + XP bar (placeholder, wired in Week 6)
     - Divider
     - "Settings" link → navigates to `/settings`
     - Theme toggle (Light / Dark / System — move from sidebar)
     - Divider
     - "Sign out" button
   - Close on: click outside, Escape key, navigation

3. **Mobile responsive**:
   - `< sm`: Logo only (no "nuva" text), tabs as icons, avatar smaller
   - `sm-lg`: Full top bar with text
   - Remove mobile drawer entirely

4. **Main content area**:
   - Remove `pt-14 lg:pt-0` offset → unified `pt-14` (top bar height)
   - Remove sidebar flex layout → single column
   - Keep `max-w-3xl mx-auto` content constraint

5. **Keyboard shortcuts**: Keep `g t`, `g r`, `g s` sequences. Keep `⌘K` command palette. Keep `?` help dialog

6. **CSS cleanup**:
   - Remove `--color-sidebar`, `--color-sidebar-active`, `--color-sidebar-hover` from both light and dark themes
   - Add `--color-nav-active` if needed (or reuse `accent`)

**Verification**: `npx tsc --noEmit` (server + client), `npx vite build`

---

### Week 2: Sound System Foundation

**Goal**: Build a global SFX system. Every interactive click plays `clicked.wav`. Wire up `sectionStart.wav` and `sectionComplete.wav` to timer events. Global mute toggle.

**Files to create**:
- `client/src/hooks/useSfx.ts` — Central sound effect hook
- `client/src/contexts/SfxContext.tsx` — Global SFX provider (preload, mute state)

**Files to modify**:
- `client/src/hooks/useAlarm.ts` — Deprecate/remove (replaced by useSfx)
- `client/src/pages/TimerPage.tsx` — Use `sectionStart` and `sectionComplete` sounds
- `client/src/components/AppLayout.tsx` — Add mute toggle to avatar dropdown
- `client/src/App.tsx` — Wrap with `SfxProvider`
- `client/src/index.css` — (if needed for mute icon styling)

**Implementation details**:

1. **`SfxContext.tsx`** — Global sound provider:
   ```
   SfxProvider:
     - State: muted (boolean), persisted in localStorage key "nuva-sfx-muted"
     - On mount: register a one-time click listener on document to unlock AudioContext
     - Preload all WAV files into Audio elements on first interaction
     - Expose: playClick(), playStart(), playComplete(), playLevelUp(), toggleMute(), isMuted
   ```

2. **`useSfx.ts`** — Hook wrapping SfxContext:
   ```
   useSfx() → { playClick, playStart, playComplete, playLevelUp, toggleMute, isMuted }
   ```
   - Each play function: check `!muted`, then play from preloaded Audio element
   - `playClick()`: create fresh Audio each time (short sound, can overlap)
   - Others: single instance, reset `currentTime = 0` before play
   - All play calls wrapped in `.catch(() => {})` for autoplay policy

3. **Global click sound**:
   - In `SfxProvider`, attach a delegated click listener on `document`
   - On click: check if target (or ancestor) is `button`, `a[href]`, `[role="button"]`, `[role="radio"]`, `[role="tab"]`, `input[type="checkbox"]`, `select`, or has `data-sfx` attribute
   - If match and not muted: `playClick()`
   - This avoids adding `onClick` to every component

4. **Timer integration**:
   - `TimerPage.tsx`: on `handleStart` → `playStart()`
   - When timer reaches 0 → `playComplete()` (replace alarm)
   - Remove `useAlarm` import and all `alarm.prepare()`, `alarm.play()`, `alarm.stop()` calls

5. **Mute toggle in avatar dropdown**:
   - Volume2 / VolumeX icon
   - Label: "Sound" with toggle switch
   - Calls `toggleMute()`

6. **Remove alarm overlay**: Not in this week (Week 3 handles auto-complete flow change). For now, keep alarm overlay but replace `alarm.play()` with `playComplete()`

**Verification**: `npx tsc --noEmit` (server + client), `npx vite build`. Manual test: click buttons → hear click, start timer → hear start sound

---

### Week 3: Timer Auto-Complete & Custom Duration

**Goal**: When timer reaches 0, automatically complete the session (play `sectionComplete.wav`, show completion modal directly). Add custom duration option. Remove alarm overlay entirely.

**Files to modify**:
- `client/src/pages/TimerPage.tsx` — Remove AlarmOverlay, add auto-complete, add custom duration
- `client/src/hooks/useTimer.ts` — Add `finished` → auto-trigger completion, support custom durations
- `client/src/hooks/useAlarm.ts` — Delete this file entirely

**Files to delete**:
- `client/src/hooks/useAlarm.ts`
- `client/public/alarm.mp3` (if exists)

**Implementation details**:

1. **Auto-complete flow**:
   - Current: `running` → timer hits 0 → `finished` → AlarmOverlay (user clicks "Stop Alarm") → CompletionModal
   - New: `running` → timer hits 0 → play `sectionComplete.wav` → CompletionModal appears directly
   - In `useTimer.ts`: when `remainingSeconds` reaches 0 and status is `running`:
     - Set status to `finished`
     - Auto-call the completion callback (no alarm phase)
   - In `TimerPage.tsx`: remove `AlarmOverlay` component entirely
   - When timer finishes, show `CompletionModal` immediately with an entrance animation

2. **Custom duration**:
   - Current: radio buttons for 30 min / 60 min
   - New: three options — `30 min` | `60 min` | `Custom`
   - When "Custom" selected, show a number input (5-120 min range, step 5)
   - Validation: server-side, update `sessions.ts` POST `/start` to accept any `duration_minutes` in range 5-120 (not just 30/60)
   - Update `useTimer.ts` to support arbitrary duration values

3. **Server-side change**:
   - `server/src/routes/sessions.ts` POST `/start`:
     - Change validation from `![30, 60].includes(duration_minutes)` to:
     - `duration_minutes < 5 || duration_minutes > 120 || !Number.isInteger(duration_minutes)`
   - This allows 5, 10, 15, ... up to 120 minutes

4. **Remove alarm.ts**:
   - Delete `useAlarm.ts` hook file
   - Remove all imports/usages from TimerPage
   - Delete `alarm.mp3` from public if it exists

5. **Completion modal polish**:
   - Animate in from bottom with scale + opacity (framer-motion)
   - Show session summary: duration completed, department, project
   - Yes/No completion question + actual_title + notes (existing)

**Verification**: `npx tsc --noEmit` (server + client), `npx vite build`

---

### Week 4: Gamification Data Model & API

**Goal**: Create the database schema and API endpoints for XP, levels, and daily progress tracking. No UI yet — pure backend.

**Files to create**:
- `server/src/routes/progress.ts` — New route for gamification endpoints
- `supabase/migrations/add_user_progress.sql` — Migration file (reference)

**Files to modify**:
- `server/src/app.ts` — Register `/api/progress` router
- `server/src/routes/sessions.ts` — Award XP on session completion

**Implementation details**:

1. **Database schema** (to be run in Supabase SQL editor):
   ```sql
   create table user_progress (
     user_id uuid references auth.users primary key,
     total_xp integer not null default 0,
     current_level integer not null default 1,
     daily_focus_minutes integer not null default 0,
     daily_tomatoes integer not null default 0,
     daily_xp integer not null default 0,
     daily_date date not null default current_date,
     tomato_goal integer not null default 20,
     sessions_completed integer not null default 0,
     total_focus_minutes integer not null default 0,
     created_at timestamptz default now(),
     updated_at timestamptz default now()
   );

   -- RLS policies
   alter table user_progress enable row level security;
   create policy "Users can read own progress"
     on user_progress for select using (auth.uid() = user_id);
   create policy "Service role can manage progress"
     on user_progress for all using (true);
   ```

2. **XP Calculation Logic** (server-side, in a shared util):
   ```typescript
   // lib/xp.ts
   function calculateXpGain(durationMinutes: number, dailyMinutesBefore: number): number {
     let xp = 0;
     for (let m = 0; m < durationMinutes; m += 10) {
       const totalMinAtPoint = dailyMinutesBefore + m;
       const hourMultiplier = Math.floor(totalMinAtPoint / 60) + 1;
       xp += hourMultiplier;
     }
     return xp;
   }

   function xpForLevel(level: number): number {
     // Cumulative XP to reach this level
     return 10 * level * level;
   }

   function levelFromXp(totalXp: number): number {
     return Math.floor(Math.sqrt(totalXp / 10));
   }
   ```

3. **API Endpoints** (`progress.ts`):
   - `GET /api/progress` — Returns user's progress (total_xp, current_level, daily stats, tomato_goal)
     - Auto-resets daily counters if `daily_date !== today`
   - `PATCH /api/progress/goal` — Update daily tomato goal
   - Progress is created automatically on first access (upsert pattern)

4. **Session completion hook** (`sessions.ts` POST `/:id/complete`):
   - After successful completion update:
     - Fetch user_progress (upsert if missing)
     - Reset daily counters if new day
     - Calculate XP gain using `calculateXpGain(duration, dailyMinutesBefore)`
     - Calculate new tomatoes: `Math.floor((dailyMinutesBefore + duration) / 30) - Math.floor(dailyMinutesBefore / 30)`
     - Update user_progress: increment total_xp, daily_xp, daily_focus_minutes, daily_tomatoes, sessions_completed, total_focus_minutes
     - Compute new level from total_xp
     - Return XP gain + new level + level_changed flag in completion response

5. **Seed user_progress**: Update the `seed_user_defaults` RPC (or profile creation) to also insert a `user_progress` row

**Verification**: `npx tsc --noEmit` on server. Manual API test with curl/Postman

---

### Week 5: Daily Progress UI — Tomatoes & Minutes

**Goal**: Display daily focus progress on the Timer page. Visual tomato grid showing earned vs. remaining. Total minutes counter. XP earned today.

**Files to create**:
- `client/src/components/DailyProgress.tsx` — Tomato grid + daily stats component
- `client/src/hooks/useProgress.ts` — Hook to fetch/cache user progress from API
- `client/src/contexts/ProgressContext.tsx` — Global progress state (refreshed on session complete)

**Files to modify**:
- `client/src/pages/TimerPage.tsx` — Add DailyProgress above the timer
- `client/src/App.tsx` — Wrap with ProgressProvider
- `client/src/lib/api.ts` — (if needed for new endpoint)

**Implementation details**:

1. **`ProgressContext.tsx`**:
   - Fetches `GET /api/progress` on mount and after each session completion
   - State: `{ totalXp, currentLevel, dailyMinutes, dailyTomatoes, dailyXp, tomatoGoal, loading }`
   - `refresh()` function to re-fetch after session events
   - `xpForNextLevel`: computed from level formula

2. **`DailyProgress.tsx`**:
   - **Minutes counter**: "Today: 3h 30m focused" — large, centered text
   - **Tomato grid**:
     - Row of circles/tomato icons
     - Filled (accent color, tomato emoji or filled circle) = earned
     - Empty (border only, muted) = remaining to goal
     - If goal = 20, show 20 slots. If earned > goal, show extra with glow
     - Label below: "7 / 20 tomatoes"
   - **XP earned today**: "+12 XP earned today" — small text below everything
   - **Animations**:
     - When a new tomato is earned (after session complete), the new tomato pops in with `scale: [0, 1.2, 1]` spring animation
     - Minutes counter smoothly increments using `motion.span` with `animate`

3. **Tomato visual design**:
   - Each tomato is a small circle (16-20px)
   - Earned: solid accent fill with subtle shadow
   - Upcoming: dashed border, muted color
   - Grid wraps at 10 per row (for goal of 20: 2 rows)
   - When all 20 filled: brief celebration pulse on the entire grid

4. **Integration with Timer**:
   - After `CompletionModal` saves → `progress.refresh()` triggers
   - New tomatoes animate in on the IdleState view
   - Daily progress visible in both idle and running states (collapsed during running to save space)

**Verification**: `npx tsc --noEmit` (server + client), `npx vite build`

---

### Week 6: XP & Level System UI

**Goal**: Display level badge and XP progress bar next to the avatar in the top nav. Show XP gain animation after each session. Level info in avatar dropdown.

**Files to create**:
- `client/src/components/LevelBadge.tsx` — Level number + XP progress bar component
- `client/src/components/XpGainToast.tsx` — Animated "+X XP" notification

**Files to modify**:
- `client/src/components/AppLayout.tsx` — Add LevelBadge next to avatar in top bar
- `client/src/pages/TimerPage.tsx` — Trigger XP gain toast after session completion
- `client/src/contexts/ProgressContext.tsx` — Add `lastXpGain` and `levelChanged` state

**Implementation details**:

1. **`LevelBadge.tsx`** (top nav, right side):
   - Layout: `Lv.{n}` text + horizontal XP bar + avatar icon
   - XP bar: thin (4px height), accent color fill, `bg-surface-raised` track
   - Fill percentage: `(currentXp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel) * 100`
   - Animate fill width with `motion.div` transition on change
   - Tooltip on hover: "Level {n} — {title} | {current}/{next} XP"
   - Compact: fits in ~120px width

2. **Avatar dropdown level section**:
   - Below user name: "Level {n} · {title}"
   - Full-width XP bar (wider than top nav version)
   - "{current} / {next} XP to next level"
   - Today's XP: "+{dailyXp} XP today"

3. **XP gain animation** (`XpGainToast.tsx`):
   - After session completion, show floating "+{xp} XP" near the level badge
   - Animate: fade in → float up → fade out (1.5s total)
   - XP bar fills smoothly to new value
   - If XP crosses level boundary: bar fills to 100%, then resets to 0% and fills to new amount
   - Uses framer-motion `animate` with keyframes

4. **ProgressContext additions**:
   - Track `lastXpGain: number | null` (set after session complete, cleared after animation)
   - Track `levelChanged: { from: number; to: number } | null` (set if level changed)
   - These are consumed by XpGainToast and LevelUpOverlay (Week 7)

5. **Level title display**:
   - Utility function `getLevelTitle(level: number): string`
   - Used in LevelBadge tooltip and avatar dropdown

**Verification**: `npx tsc --noEmit` (server + client), `npx vite build`

---

### Week 7: Level-Up Celebration

**Goal**: Full-screen level-up popup with old→new level transition animation, confetti, and `levelUp.wav` sound.

**New dependency**:
- `canvas-confetti` (~6kb) — For confetti particle effects

**Files to create**:
- `client/src/components/LevelUpOverlay.tsx` — Full-screen celebration overlay

**Files to modify**:
- `client/src/components/AppLayout.tsx` — Render LevelUpOverlay when level changes
- `client/src/contexts/ProgressContext.tsx` — Expose `clearLevelUp()` to dismiss
- `client/package.json` — Add `canvas-confetti` dependency

**Implementation details**:

1. **`LevelUpOverlay.tsx`**:
   - Full-screen fixed overlay: `fixed inset-0 z-[100]`
   - Backdrop: `bg-black/70 backdrop-blur-md`
   - Center content with flexbox

   - **Animation sequence** (orchestrated with framer-motion):
     1. (0.0s) Backdrop fades in
     2. (0.3s) Old level number appears, large centered: "Level {old}"
     3. (1.0s) Old level scales down + fades, morphs into new level
     4. (1.5s) New level number scales up with spring bounce: "Level {new}"
     5. (1.8s) Title text appears below: "{oldTitle} → {newTitle}"
     6. (2.0s) "Congratulations!" text fades in above
     7. (2.0s) Confetti burst fires (dual cannon from left + right)
     8. (2.0s) `levelUp.wav` plays
     9. (4.0s) Auto-dismiss OR tap to dismiss earlier

   - **Confetti**: Use `canvas-confetti` with themed colors matching accent palette
     ```
     confetti({
       particleCount: 100,
       spread: 70,
       origin: { y: 0.6 },
       colors: ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#fbbf24'],
       disableForReducedMotion: true,
     })
     ```

   - **Reduced motion**: If `prefers-reduced-motion`, skip confetti and show simple fade transition instead

2. **Sound integration**:
   - Call `playLevelUp()` from `useSfx` when overlay appears
   - Sound plays once (not looping)

3. **Trigger flow**:
   - Session completes → API returns `level_changed: { from, to }`
   - `ProgressContext` sets `levelChanged` state
   - `AppLayout` renders `<LevelUpOverlay>` when `levelChanged` is non-null
   - On dismiss: `clearLevelUp()` resets state

4. **Edge cases**:
   - Multiple level ups in one session (e.g., 2-hour session jumps 2 levels): show highest level, mention "You gained {n} levels!"
   - Level up while another overlay is showing: queue and show sequentially

**Verification**: `npx tsc --noEmit` (server + client), `npx vite build`

---

### Week 8: Game Balance & Progression Polish

**Goal**: Fine-tune XP curves, add level titles with visual flair, streak tracking (optional), and milestone rewards. Ensure the progression feels satisfying at every stage.

**Files to create**:
- `client/src/lib/game.ts` — Shared game constants (XP formula, level titles, milestones)
- `server/src/lib/xp.ts` — Server-side XP calculation (mirrors client)

**Files to modify**:
- `client/src/pages/TimerPage.tsx` — Show multiplier indicator during session
- `client/src/components/DailyProgress.tsx` — Show current XP multiplier
- `client/src/components/LevelBadge.tsx` — Level-specific colors/icons at milestones
- `server/src/routes/progress.ts` — Add streak tracking logic
- `server/src/routes/sessions.ts` — Apply XP multiplier calculation

**Implementation details**:

1. **XP Multiplier display**:
   - On Timer page (idle state), show current multiplier: "2x XP bonus (hour 2)"
   - Visual: accent badge that glows/pulses when multiplier increases
   - During running state: show multiplier in session info area

2. **Streak tracking** (server-side):
   - Add to `user_progress` table:
     - `current_streak integer default 0`
     - `longest_streak integer default 0`
     - `last_session_date date`
   - On session complete:
     - If `last_session_date` = yesterday → increment streak
     - If `last_session_date` = today → no change
     - If `last_session_date` < yesterday → reset streak to 1
   - Display streak count in avatar dropdown: "5-day streak" with flame icon

3. **Milestone levels** (every 5 levels):
   - Level 5, 10, 15, 20... trigger enhanced celebration
   - Different confetti patterns (star shapes at level 10, 20, etc.)
   - Milestone announcement: "You've reached {title} rank!"

4. **Level-specific visual enhancements**:
   - Level badge color progresses: gray (1-5) → green (6-10) → blue (11-15) → purple (16-20) → gold (21-30) → diamond (31+)
   - XP bar color matches level tier
   - Avatar border color changes with tier

5. **Balance testing**:
   - Create a spreadsheet/table mapping hours played → level reached
   - Ensure first 5 levels come within ~2 hours of total focus
   - Ensure level 20 takes ~40-60 hours (realistic for a few weeks of use)
   - Ensure multiplier doesn't make late-day sessions overpowered (cap multiplier at 5x)

6. **Settings page updates**:
   - Add "Daily tomato goal" slider (5-30, default 20)
   - Add "Sound volume" slider (0-100%)
   - Move existing sound toggle here

**Verification**: `npx tsc --noEmit` (server + client), `npx vite build`

---

### Week 9: Polish & Micro-Interactions

**Goal**: Comprehensive animation polish. Smooth every transition. Ensure the app feels alive and responsive.

**Files to modify**:
- `client/src/pages/TimerPage.tsx` — Idle→Running→Complete transitions
- `client/src/components/DailyProgress.tsx` — Tomato earn animations
- `client/src/components/LevelBadge.tsx` — XP fill animations
- `client/src/components/AppLayout.tsx` — Tab switching animations
- `client/src/components/LevelUpOverlay.tsx` — Final animation tweaks
- `client/src/index.css` — Polish transitions, hover states

**Implementation details**:

1. **Timer state transitions**:
   - Idle → Running: form slides down, timer ring scales up from center
   - Running → Complete: timer ring pulses once, then fades, completion modal slides up
   - Complete → Idle: modal slides down, idle form fades in, new tomato pops in
   - All transitions: 300-400ms, ease `[0.16, 1, 0.3, 1]`

2. **Tomato earn animation**:
   - When returning to idle after completion:
     - Existing tomatoes are already displayed
     - New tomato(es) appear one by one with 200ms stagger
     - Each: `scale: [0, 1.3, 1]` + subtle bounce
     - Brief glow effect on the new tomato

3. **XP bar animation**:
   - After session: XP bar smoothly fills over 1.5s
   - If crosses level boundary: fills to 100%, brief pause (200ms), resets to 0, fills to new %
   - Use framer-motion `animate` with spring physics

4. **Tab indicator animation**:
   - Active tab underline slides between tabs (shared layout animation)
   - Use `motion.div` with `layoutId="tab-indicator"` for automatic interpolation

5. **Button press feedback**:
   - All buttons: `active:scale-[0.97]` with `transition-transform duration-100`
   - Start button: slightly more dramatic `active:scale-[0.95]`

6. **Number animations**:
   - Daily minutes counter: animate counting up on change
   - XP numbers: animate counting up
   - Level number on level-up: flip/morph animation

7. **Responsive polish**:
   - Ensure tomato grid wraps properly on mobile
   - Level badge collapses to just icon on very small screens
   - Dropdown positions correctly on all screen sizes

8. **Dark mode review**:
   - Verify all new components look correct in dark mode
   - Tomato colors, XP bar, level badge, overlays
   - Confetti colors work on both light/dark backgrounds

**Verification**: `npx tsc --noEmit` (server + client), `npx vite build`

---

### Week 10: Testing, Performance & Edge Cases

**Goal**: Comprehensive testing, bundle optimization, edge case handling, and final quality pass.

**Files to modify**:
- Various — bug fixes and edge case handling
- `client/vite.config.ts` — Chunk optimization for new dependencies
- `client/public/sw.js` — Cache new assets (SFX files)

**Implementation details**:

1. **Bundle optimization**:
   - Add `canvas-confetti` to manual chunks in Vite config
   - Verify SFX files are cached by service worker
   - Lazy-load `LevelUpOverlay` (only imported when level-up occurs)
   - Ensure total main bundle stays under 300KB

2. **Edge cases to handle**:
   - First-time user: progress row doesn't exist yet → upsert pattern
   - Midnight rollover during active session: daily counters should reset based on session completion time
   - Browser tab closed during session: timer state persists in localStorage, progress recalculated on reload
   - Offline session completion: queue progress update, sync when online
   - Custom duration edge cases: 5 min (minimum), 120 min (maximum), non-multiples of 10 for XP
   - Level up during offline: show celebration on next online sync
   - Sound files fail to load: graceful degradation, no errors thrown
   - Very long streak display: "365-day streak" should not break layout

3. **Cross-browser testing**:
   - Chrome, Firefox, Safari desktop
   - iOS Safari (SFX autoplay unlocking)
   - Android Chrome
   - Test sound on all platforms
   - Test confetti performance on mobile

4. **Accessibility audit**:
   - Level-up overlay: trap focus, announce with `aria-live`
   - XP bar: `role="progressbar"` with `aria-valuenow/min/max`
   - Tomato grid: `aria-label="7 of 20 tomatoes earned today"`
   - Sound toggle: clear labeling
   - Confetti: `disableForReducedMotion: true`

5. **Performance audit**:
   - Verify no memory leaks from audio elements
   - Ensure confetti canvas is cleaned up after animation
   - Check for unnecessary re-renders in ProgressContext
   - Profile with React DevTools

6. **Data integrity**:
   - Server-side validation: XP can only increase, level can only go up
   - Rate limiting on progress endpoint
   - Verify RLS policies on `user_progress` table

**Verification**: Full `npx tsc --noEmit` (server + client), `npx vite build`, manual end-to-end walkthrough

---

## Dependency Summary

| Package | Purpose | Size (gzip) | Week |
|---------|---------|-------------|------|
| `canvas-confetti` | Confetti particle effects | ~3kb | Week 7 |
| `@types/canvas-confetti` | TypeScript types | dev only | Week 7 |

Total new production dependency: **~3kb gzipped**. All other features built with existing stack (framer-motion, Web Audio API, Tailwind CSS).

---

## Database Changes Summary

| Table | Change | Week |
|-------|--------|------|
| `user_progress` | New table (XP, level, daily stats, streak) | Week 4 |
| `sessions` | Duration validation: 30/60 → 5-120 | Week 3 |
| `sessions` complete response | Add xp_gain, level_changed fields | Week 4 |

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Audio autoplay blocked on iOS | SFX won't play | Unlock AudioContext on first tap. Graceful degradation — app works without sound |
| XP formula feels too slow/fast | Users disengage | Week 8 dedicated to balance tuning. Make formula constants configurable |
| Level-up animation too heavy on mobile | Janky performance | Use `canvas-confetti` (GPU-accelerated canvas). Respect `prefers-reduced-motion` |
| Large SFX files (sectionComplete = 2.2MB) | Slow page load | Lazy-load SFX after first interaction. Consider compressing to .mp3 (~10x smaller) |
| Navigation change confuses existing users | Friction | Top-bar pattern is widely familiar. Keep all functionality accessible |

---

## Success Metrics

1. **Engagement**: Users complete 2+ sessions per day (up from 1.x)
2. **Retention**: 7-day return rate increases
3. **Session length**: Custom duration used for sessions > 60 min
4. **Gamification**: Average user reaches Level 5 within first week
5. **Sound**: < 5% of users disable sound (indicates good sound design)
