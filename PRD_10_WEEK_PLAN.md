# nuva Focus Timer — 10-Week Implementation PRD

> **Scope:** UI/UX & animation overhaul, calendar view, manual session entry, session time display
> **Start:** Week 14 (Feb 23, 2026) · **End:** Week 23 (May 3, 2026)
> **Stack:** React 19 + Framer Motion + Tailwind CSS 4 + Recharts + Supabase

---

## Phase 1 — Timer Animation Overhaul (Weeks 14–15)

### Week 14: CircularProgress redesign & countdown animation

**Goal:** Fix progress direction, add glow/gradient, and make the countdown digits feel alive.

#### 1A. Progress ring starts from top-center, depletes clockwise

**File:** `client/src/components/CircularProgress.tsx`

**Current problem:**
- SVG uses `transform: rotate(-90deg) scaleX(-1)` — the progress arc starts at bottom-center and fills counter-intuitively.
- `progress` prop represents "how much is filled," but RunningState passes `1 - progress` to invert it.

**Change:**
- Remove `scaleX(-1)`. Keep `rotate(-90deg)` so 0 offset = 12 o'clock.
- Reverse the formula: `strokeDashoffset = circumference × progress` (not `1 - progress`).
- RunningState passes `progress` directly (0 → 1 as session progresses). The arc starts full and shrinks clockwise.
- Net visual: solid ring at 0%, depleting clockwise, empty ring at 100%.

#### 1B. Gradient stroke + animated glow

**File:** `client/src/components/CircularProgress.tsx`

- Replace solid stroke with SVG `<linearGradient>` (accent → accent-light, e.g. `#4f46e5` → `#818cf8`).
- Add an outer `<circle>` with `filter: blur(8px)` and `opacity: 0.3` as a soft glow halo that pulses via Framer Motion (`opacity: [0.2, 0.4, 0.2]`, 3s infinite, `easeInOut`).
- When paused: glow color switches to amber, pulse stops.

#### 1C. AnimatedCountdown digits

**File:** `client/src/components/timer/RunningState.tsx` + new `client/src/components/timer/CountdownDigits.tsx`

- Split countdown `MM:SS` into individual digit `<span>` elements.
- Each digit animates on change: subtle Y-axis slide (`y: -4 → 0`) + opacity fade via `AnimatePresence` with `mode="popLayout"`.
- Colon separator pulses (`opacity: [1, 0.3, 1]`, 1s loop) only when running; solid when paused.
- Use `key={digit + position}` so Framer Motion only animates the changing digit.

#### 1D. Breathing ring animation

- When running: the progress ring `strokeWidth` subtly oscillates (`6 → 6.5 → 6`, 4s ease-in-out infinite) using Framer Motion `animate` on the SVG circle.
- When paused: breathing stops, ring stays static.

---

### Week 15: Page transitions & idle → running → finished flow

**Goal:** Silky, cinematic transitions between timer states.

#### 2A. Idle → Running transition

**File:** `client/src/pages/TimerPage.tsx`, `RunningState.tsx`, `IdleForm.tsx`

**Current:** `AnimatePresence mode="wait"` with simple opacity + scale. Abrupt swap.

**Change:**
- IdleForm exit: form fields stagger-fade out (top-down, 40ms each) + slide down 12px.
- RunningState enter (sequenced, total ~800ms):
  1. CircularProgress scales from `0.85 → 1` with spring (`stiffness: 200, damping: 18`), fades in.
  2. Session context (dept + title) fades in 150ms after ring.
  3. Controls slide up from 20px below + fade, 100ms after context.
  4. DailyProgress compact bar slides down from top, 200ms after controls.

#### 2B. Running → Finished transition

- CircularProgress: ring stroke animates to 0 (fully depleted) + subtle scale pulse (`1 → 1.05 → 1`).
- Countdown hits `00:00`: digits do a final "settle" animation (slight bounce).
- CompletionModal enters: backdrop blurs in (`backdrop-filter: blur(8px)`, 300ms), modal springs from `scale: 0.9` with `y: 20`.

#### 2C. Paused state micro-interactions

- On pause: ring color cross-fades to amber (300ms), glow dims, countdown text cross-fades to amber.
- A subtle "paused" label appears below countdown with `slideUp` + fade.
- On resume: reverse all above, ring glow pulses once brighter as "wake-up" cue.

#### 2D. Update `motion.ts` with new shared variants

**File:** `client/src/lib/motion.ts`

Add:
```ts
timerEnterSequence    // orchestrates CircularProgress + context + controls
staggerFadeDown       // for idle form exit
settleSpring          // for digit/completion animations
glowPulse             // for ring glow keyframes
```

---

## Phase 2 — Review Page: Session Times & Manual Entry (Weeks 16–17)

### Week 16: Display start/end times on every session

#### 3A. Show start → end time on SessionCard

**File:** `client/src/components/review/SessionList.tsx`

**Current:** Only shows `formatTime(session.started_at)` (HH:mm).

**Change:**
- Display `HH:mm – HH:mm` (start – end) for completed sessions.
- End time: use `ended_at` if available, otherwise compute `started_at + duration_minutes * 60s - paused_total_seconds`.
- For canceled sessions: show `HH:mm – HH:mm (canceled)`.
- For running/paused sessions (edge case in history): show `HH:mm – now`.

**File:** `client/src/lib/dates.ts`

Add helper:
```ts
export function formatTimeRange(startIso: string, endIso: string | null, durationMin: number): string
```

#### 3B. Show times in SessionDetailPanel

**File:** `client/src/components/SessionDetailPanel.tsx`

- Add a "Time" row: `09:15 – 09:45` with Clock icon.
- Add "Actual Duration" row: computed elapsed display (e.g. "28m focused, 2m paused").

---

### Week 17: Manual session entry

#### 4A. Server endpoint: `POST /api/sessions/manual`

**File:** `server/src/routes/sessions.ts`

New route that accepts:
```ts
{
  department_id: string;
  project_id: string;
  planned_title: string;
  started_at: string;   // ISO timestamp
  ended_at: string;     // ISO timestamp
  completed: boolean;
  actual_title?: string;
  notes?: string;
}
```

Validation:
- `ended_at > started_at` (must be positive duration)
- Computed `duration_minutes = Math.round((ended - started) / 60000)` must be 5–480 (8 hours max for manual).
- `started_at` must not be in the future.
- No overlap check needed (manual entries are historical).
- Server computes `elapsed_seconds`, sets `status` to `completed_yes` or `completed_no`.
- Awards gamification via `awardSessionCompletion()`.

#### 4B. ManualEntryModal component

**File:** `client/src/components/review/ManualEntryModal.tsx` (new)

**UI:**
- Trigger: "Add Session" button (Plus icon) at top of Review page, next to filters.
- Modal overlay (same pattern as CompletionModal):
  - Department dropdown
  - Project dropdown
  - Date picker (default: today)
  - Start time input (`<input type="time">`)
  - End time input (`<input type="time">`)
  - Goal / title text field
  - Completed toggle (Yes/No)
  - Actual title (shown when "No")
  - Notes (optional)
  - "Save Session" button
- Validation: end > start, title required, department & project required.
- On success: close modal, refresh session list, show success toast.

#### 4C. Wire into ReviewPage

**File:** `client/src/pages/ReviewPage.tsx`

- Add state `showManualEntry` + button next to filter bar.
- On save: re-fetch sessions (existing `fetchSessions()`).

---

## Phase 3 — Calendar View (Weeks 18–21)

### Week 18: Calendar data layer & view switcher

#### 5A. New sidebar nav item or tab

**File:** `client/src/components/AppLayout.tsx`

- Add "Calendar" as a 4th navigation tab between "Review" and "Level".
- Route: `/calendar`.
- Icon: `CalendarDays` from Lucide.

#### 5B. Calendar page skeleton

**File:** `client/src/pages/CalendarPage.tsx` (new, lazy-loaded)

**Layout:**
```
┌──────────────────────────────────────────────────┐
│  ← Feb 2026 →    [Day] [Week] [Month]   Today   │
├──────────────────────────────────────────────────┤
│                                                  │
│   Calendar grid (varies by view)                 │
│                                                  │
└──────────────────────────────────────────────────┘
```

**View modes:** Day | Week | Month (default: Week).

**Data fetch:**
- Reuse `GET /api/sessions` with date range params.
- Day: fetch 1 day. Week: fetch 7 days. Month: fetch full month range.
- Cache in component state; re-fetch on date navigation.

#### 5C. Session positioning logic

**File:** `client/src/lib/calendar.ts` (new)

Core utilities:
```ts
interface CalendarEvent {
  session: Session;
  startMinute: number;  // minutes from midnight (0–1440)
  endMinute: number;
  column: number;       // for overlapping events (0, 1, 2...)
  totalColumns: number; // how many columns share this time slot
}

function positionEvents(sessions: Session[], dateYMD: string): CalendarEvent[]
```

- Convert `started_at` / `ended_at` to minute-of-day in Asia/Taipei.
- Detect overlapping sessions, assign columns (greedy left-to-right).
- Events that span midnight: clip to the current day's view.

---

### Week 19: Day & Week view implementation

#### 6A. DayColumn component

**File:** `client/src/components/calendar/DayColumn.tsx` (new)

**Layout:**
- 24-hour vertical grid (each hour = 60px height).
- Hour labels on the left (00:00 – 23:00).
- Current-time indicator: thin red/accent horizontal line (updates every minute).
- Sessions rendered as absolute-positioned blocks:
  - `top = (startMinute / 1440) * totalHeight`
  - `height = ((endMinute - startMinute) / 1440) * totalHeight`
  - Color: department-based (reuse `DEPT_COLORS` from review constants).
  - Content: planned_title, time range, project code.
  - Min-height: 24px (for very short sessions).
  - Overlapping events: split column width evenly.

**Interactions:**
- Hover: subtle lift + shadow, show tooltip with full details.
- Click: open SessionDetailPanel slide-out (reuse from Review).

#### 6B. WeekView component

**File:** `client/src/components/calendar/WeekView.tsx` (new)

**Layout:**
```
        Mon 24    Tue 25    Wed 26    Thu 27    Fri 28    Sat 1    Sun 2
       ┌─────────┬─────────┬─────────┬─────────┬─────────┬────────┬────────┐
 9 AM  │ ██████  │         │ ███     │         │ ██████  │        │        │
       │ Design  │         │ Dev     │         │ Review  │        │        │
10 AM  │ System  │         │ sprint  │         │ meeting │        │        │
       │ 9-11:30 │         │ 9:30-10 │         │ 9-10:30 │        │        │
       │         │         │         │         │         │        │        │
11 AM  │         │ ██████  │         │ ██████  │         │        │        │
       │         │ Content │         │ Content │         │        │        │
       └─────────┴─────────┴─────────┴─────────┴─────────┴────────┴────────┘
```

- 7 DayColumns side by side in a horizontally scrollable container.
- Shared hour labels on the left (one set, not duplicated per column).
- Day headers: `Mon 24` format, today highlighted with accent dot.
- Auto-scroll to earliest session of the week (or 9 AM if no sessions).

#### 6C. Day view

- Single DayColumn, wider (full content width).
- Same layout as week column but more spacious.

---

### Week 20: Month view implementation

#### 7A. MonthGrid component

**File:** `client/src/components/calendar/MonthGrid.tsx` (new)

**Layout:**
```
        Mon       Tue       Wed       Thu       Fri       Sat       Sun
       ┌─────────┬─────────┬─────────┬─────────┬─────────┬────────┬────────┐
       │    1    │    2    │    3    │    4    │    5    │    6   │    7   │
       │ ■■ 2h  │ ■ 45m  │         │ ■■■ 3h │ ■ 1h   │        │        │
       ├─────────┼─────────┼─────────┼─────────┼─────────┼────────┼────────┤
       │    8    │    9    │   10    │   11    │   12    │   13   │   14   │
       │ ■ 30m  │ ■■ 1.5h│ ■■ 2h  │         │ ■■■ 4h │        │ ■ 1h  │
       └─────────┴─────────┴─────────┴─────────┴─────────┴────────┴────────┘
```

- Standard calendar month grid (6 rows × 7 columns).
- Each cell shows:
  - Day number (accent if today, dimmed if outside month).
  - Up to 3 session "pills" (colored bar with truncated title).
  - "+N more" link if > 3 sessions.
  - Total focus time badge (e.g. "2h 30m").
- Click on a day cell: navigate to Day view for that date.
- Click on a session pill: open SessionDetailPanel.

#### 7B. Navigation & date header

**File:** `client/src/components/calendar/CalendarHeader.tsx` (new)

- Left/Right arrows: navigate by day/week/month (depending on view).
- "Today" button: jump to current date.
- View switcher: `[Day] [Week] [Month]` segmented control.
- Title: "February 2026" (month), "Feb 24 – Mar 2, 2026" (week), "Feb 24, 2026" (day).
- Smooth transition animation on date change (slide left/right based on direction).

---

### Week 21: Calendar polish & interactions

#### 8A. Drag-to-create (optional, stretch goal)

- In Day/Week view: click-and-drag on empty time slot to create a manual session.
- Drag gesture shows a preview block; on release, opens ManualEntryModal pre-filled with start/end time.

#### 8B. Click session → detail panel

- Reuse `SessionDetailPanel` from Review page (extract to shared component if not already).
- Panel slides in from right with spring animation.

#### 8C. Color coding & legend

- Department color legend at top of calendar (small colored dots + dept name).
- Session blocks use department color as left border + lighter background.
- Color palette: extend `DEPT_COLORS` from review constants to ensure enough colors.

#### 8D. Responsive behavior

- Month view: always show full grid, cells shrink on smaller screens.
- Week view: horizontally scrollable on screens < 1024px.
- Day view: full width, always comfortable.

#### 8E. Animations

- View switch: `AnimatePresence` crossfade (200ms).
- Date navigation: slide in direction of navigation (left for forward, right for backward).
- Session blocks: stagger fade-in on data load (40ms per block).
- Hover: `scale: 1.02`, subtle shadow elevation.

---

## Phase 4 — Global UI/UX Polish (Weeks 22–23)

### Week 22: Micro-interactions & animation consistency

#### 9A. Button press feedback (global)

**File:** `client/src/index.css` + component updates

- All `<button>` elements: add `active:scale-[0.97]` + `transition-transform duration-75`.
- Primary buttons: also add subtle brightness shift on press.

#### 9B. Page transition upgrade

**File:** `client/src/components/AppLayout.tsx`

**Current:** Simple opacity + Y slide.

**Change:**
- Use shared `layoutId` for the page container to enable cross-route morph.
- Direction-aware transitions: navigating forward (Timer → Review → Calendar → Level) slides content left; backward slides right. Track route index to determine direction.

#### 9C. Skeleton loading states

- Review page: show chart skeletons (pulsing rectangles matching chart aspect ratios) while data loads.
- Calendar page: show grid skeleton with pulsing cells.
- Session list: card-shaped skeletons (3–5 items).
- Use existing `Skeleton` component, add `SkeletonChart` and `SkeletonCalendarCell` variants.

#### 9D. Toast animations

- Toasts slide in from top-right with spring, auto-dismiss with fade-out.
- Success: green accent line on left. Error: red. Info: blue.
- Stack multiple toasts with 8px gap, newest on top.

#### 9E. Scroll-triggered animations

- Review charts: animate in only when scrolled into viewport (IntersectionObserver or Framer Motion `whileInView`).
- Calendar month cells: stagger fade on scroll reveal.

---

### Week 23: Final polish, performance & QA

#### 10A. Performance optimization

- `React.memo` all calendar cell components.
- Virtualize long session lists in Review (if > 50 items) using `react-window` or manual windowing.
- Debounce calendar date navigation to prevent rapid re-fetches.
- Memoize expensive calendar positioning calculations (`useMemo`).

#### 10B. Keyboard navigation

- Calendar: Arrow keys navigate dates, Enter opens day view, Escape goes back.
- `g c` hotkey: navigate to Calendar (add to existing hotkey system).

#### 10C. Empty states

- Calendar with no sessions: friendly illustration + "No sessions this [day/week/month]" + link to Timer.
- Manual entry success: confetti-like XP animation (reuse `XpGainToast`).

#### 10D. Cross-cutting QA

- Test all timer animation states (idle → running → paused → running → finished).
- Test manual entry: past dates, edge cases (23:50 start → 00:20 end, cross-midnight).
- Test calendar: month boundaries, DST (not applicable for Asia/Taipei, but verify).
- Test responsive: all views at 1024px, 1280px, 1440px widths.
- Verify all Framer Motion animations respect `prefers-reduced-motion`.

---

## New Files Summary

| File | Phase | Description |
|------|-------|-------------|
| `client/src/components/timer/CountdownDigits.tsx` | 1 | Animated per-digit countdown |
| `client/src/components/review/ManualEntryModal.tsx` | 2 | Form for adding past sessions |
| `client/src/pages/CalendarPage.tsx` | 3 | Calendar page (lazy-loaded) |
| `client/src/components/calendar/CalendarHeader.tsx` | 3 | Date nav + view switcher |
| `client/src/components/calendar/DayColumn.tsx` | 3 | Vertical time-grid column |
| `client/src/components/calendar/WeekView.tsx` | 3 | 7-column week layout |
| `client/src/components/calendar/MonthGrid.tsx` | 3 | Month grid with session pills |
| `client/src/components/calendar/EventBlock.tsx` | 3 | Single session block in calendar |
| `client/src/lib/calendar.ts` | 3 | Event positioning & overlap logic |

## Modified Files Summary

| File | Changes |
|------|---------|
| `client/src/components/CircularProgress.tsx` | Fix direction, add gradient + glow |
| `client/src/components/timer/RunningState.tsx` | Use CountdownDigits, improved transitions |
| `client/src/components/timer/IdleForm.tsx` | Stagger exit animation |
| `client/src/pages/TimerPage.tsx` | Orchestrated state transitions |
| `client/src/components/review/SessionList.tsx` | Show start–end time range |
| `client/src/components/SessionDetailPanel.tsx` | Time row + actual duration |
| `client/src/pages/ReviewPage.tsx` | Add manual entry button + modal |
| `client/src/components/AppLayout.tsx` | Calendar nav tab, direction-aware transitions |
| `client/src/App.tsx` | Calendar route (lazy-loaded) |
| `client/src/lib/motion.ts` | New animation variants |
| `client/src/lib/dates.ts` | `formatTimeRange()` helper |
| `client/src/index.css` | Button press feedback, new animations |
| `server/src/routes/sessions.ts` | `POST /manual` endpoint |

## Database Changes

**None.** The existing `sessions` table already has all needed columns (`started_at`, `ended_at`, `elapsed_seconds`, `paused_total_seconds`). Manual entries use the same schema — they're just inserted with `ended_at` pre-filled.

## Dependencies

**No new npm packages.** Everything is built with existing stack:
- Framer Motion (animations, layout transitions)
- Recharts (existing charts)
- Lucide React (icons)
- Tailwind CSS 4 (styling)

---

## Week-by-Week Execution Summary

| Week | Focus | Deliverables |
|------|-------|-------------|
| **14** | Timer ring & digits | Fixed progress direction, gradient glow, animated digits |
| **15** | Timer transitions | Idle→Running→Finished cinematic flow, motion.ts variants |
| **16** | Session times | Start–end display on SessionCard + DetailPanel |
| **17** | Manual entry | Server endpoint + ManualEntryModal + Review integration |
| **18** | Calendar foundation | CalendarPage skeleton, data layer, positioning logic |
| **19** | Day & Week view | DayColumn, WeekView, current-time indicator |
| **20** | Month view | MonthGrid with session pills, day-click navigation |
| **21** | Calendar polish | Interactions, color coding, responsive, animations |
| **22** | Global polish | Button feedback, page transitions, skeletons, scroll animations |
| **23** | QA & perf | Memoization, keyboard nav, empty states, cross-cutting tests |
