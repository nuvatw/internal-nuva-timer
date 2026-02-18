# nuva Focus Timer — Research Summary + PRD + 10-Week Plan

---

# PART A: Research Summary (with Citations)

## 1) Reliable Timers in Browsers / React

### Key Takeaways
- **`setInterval`/`setTimeout` are throttled in background tabs.** Chrome throttles chained timers to 1-second minimum after the tab is inactive; after 5+ minutes hidden, "intensive throttling" kicks in with 1-minute minimum intervals.
- **Wall-clock timestamp approach is essential.** Instead of counting ticks, store `started_at` (Date.now/ISO) and compute remaining time as `duration - (now - started_at - paused_total)`. This is drift-proof.
- **Web Workers bypass throttling.** Workers run on a separate thread and are not subject to background tab throttling. The `worker-timers` npm package provides drop-in replacements for `setInterval`/`setTimeout`.
- **`visibilitychange` event** should be used to: (a) recalculate remaining time when tab becomes visible, (b) optionally pause UI updates while hidden to save resources.
- **Persist timer state to `localStorage`** on every state change (start, pause, resume). On page refresh/reopen, read stored state and reconcile with wall-clock time.
- **Throttle localStorage writes** — timer ticks happen every second, but localStorage is synchronous. Write only on state transitions (start/pause/resume/cancel) and periodically (every 5-10s) for crash recovery.

### Recommended Approach
1. Store `started_at`, `paused_total_ms`, `status`, `duration_minutes` in localStorage.
2. Use a Web Worker (`worker-timers`) for the 1-second tick to update UI, even in background tabs.
3. On every tick and on `visibilitychange`, compute remaining = `duration - (Date.now() - started_at - paused_total_ms)`.
4. On page load, check localStorage for a running timer and resume from stored state.
5. Server stores `started_at` and `paused_total_seconds` for ground truth.

### Pitfalls & Mitigations
| Pitfall | Mitigation |
|---------|-----------|
| Timer drift in background tabs | Web Worker + wall-clock math |
| Browser crash loses state | Persist to localStorage every 5s + server has started_at |
| System clock change (rare) | Server timestamp is authoritative for session records |
| Multiple tabs running timers | Detect via BroadcastChannel or localStorage flag; only one active timer allowed |

### Citations
- https://developer.chrome.com/blog/timer-throttling-in-chrome-88
- https://nolanlawson.com/2025/08/31/why-do-browsers-throttle-javascript-timers/
- https://hackwild.com/article/web-worker-timers/
- https://www.npmjs.com/package/worker-timers
- https://usefulangle.com/post/280/settimeout-setinterval-on-inactive-tab
- https://www.joshwcomeau.com/react/persisting-react-state-in-localstorage/
- https://medium.com/@bsalwiczek/building-timer-in-react-its-not-as-simple-as-you-may-think-80e5f2648f9b

---

## 2) Web Alarms (Audio + Visual + Vibration)

### Key Takeaways
- **Autoplay policy blocks audio without user gesture.** All modern browsers require a user interaction (click, tap) before audio can play. An `AudioContext` created before a gesture starts in "suspended" state.
- **Solution: unlock audio early.** On the first user interaction (e.g., clicking "Start Timer"), create/resume the `AudioContext` and play a silent buffer. This "unlocks" audio for subsequent plays (alarm).
- **HTML `<audio>` element is simpler** than Web Audio API for alarm sounds. Pre-load the audio file. After the user gesture unlock, `.play()` works reliably.
- **Vibration API** (`navigator.vibrate()`) works on Android Chrome/Firefox but **not on iOS Safari**. Use as enhancement, not primary alert.
- **Visual alarm** is the most reliable cross-platform: full-screen color flash, pulsing animation, large modal. Use `prefers-reduced-motion` media query to disable motion for accessibility.
- **ARIA considerations:** alarm modal should have `role="alertdialog"`, auto-focus the dismiss button, use `aria-live="assertive"` for screen reader announcement.
- **Notification API** is optional and complex (requires permission grant, unreliable on mobile). Skip for v1; visual + sound is sufficient.

### Recommended Approach
1. On "Start Timer" click (user gesture), unlock audio by playing a silent buffer or calling `audioContext.resume()`.
2. Pre-load alarm sound file (`/alarm.mp3`).
3. When timer completes, play alarm sound + show full-screen visual overlay + vibrate (if supported).
4. User dismisses alarm via a prominent "Acknowledge" button.
5. Respect `prefers-reduced-motion` for animations.

### Pitfalls & Mitigations
| Pitfall | Mitigation |
|---------|-----------|
| Audio blocked without gesture | Unlock on "Start" button click |
| iOS no vibration support | Vibration is optional enhancement only |
| User has volume muted | Visual alarm is always the primary indicator |
| Screen reader users miss visual alarm | `role="alertdialog"` + `aria-live="assertive"` |

### Citations
- https://developer.chrome.com/blog/autoplay
- https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices
- https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API
- https://caniuse.com/vibration
- https://medium.com/@harryespant/bypassing-browser-autoplay-restrictions-a-smart-approach-to-notification-sounds-9e14ca34e5c5

---

## 3) Supabase Auth (Magic Link + Google OAuth)

### Key Takeaways
- **Supabase Auth supports Magic Link and Google OAuth natively.** Magic Link sends a time-limited login link to email. Google OAuth uses standard OAuth 2.0 flow.
- **Identity linking:** Supabase automatically links identities with the same email, so a user who signs up with Magic Link and later uses Google (same email) gets merged into one account.
- **JWT tokens:** Supabase issues a JWT access token + refresh token. The access token contains `sub` (user_id), `role`, `email`, etc.
- **Server-side verification:** Use `supabase.auth.getUser(token)` on the Express backend to verify the JWT. This hits the Auth server and confirms the session is valid (not just signature-valid). For performance-sensitive paths, `getClaims()` does local verification only.
- **Profile creation on signup:** Use a Postgres trigger on `auth.users` INSERT to auto-create a `profiles` row. This is the standard Supabase pattern. The trigger function runs with `SECURITY DEFINER` to bypass RLS.
- **Onboarding flow:** After login, frontend checks if profile is complete (display_name set). If not, redirect to onboarding screen.

### Recommended Approach
1. Configure Supabase Auth with Magic Link + Google OAuth in Supabase dashboard.
2. Frontend uses `@supabase/supabase-js` for auth flows.
3. After auth, frontend stores session. On API calls, sends `Authorization: Bearer <access_token>` to Express.
4. Express middleware calls `supabase.auth.getUser(token)` to extract `user_id`.
5. DB trigger creates profile row on signup.
6. Frontend checks profile completeness; routes to onboarding if incomplete.

### Pitfalls & Mitigations
| Pitfall | Mitigation |
|---------|-----------|
| Token expiry mid-session | Supabase client auto-refreshes tokens; frontend uses `onAuthStateChange` |
| Trigger failure blocks signup | Test trigger thoroughly; keep it simple (just INSERT with defaults) |
| Google OAuth redirect misconfiguration | Carefully configure redirect URLs in both Google Cloud and Supabase dashboard |
| `getUser()` adds latency per request | Acceptable for this app's scale; cache user_id in request context |

### Citations
- https://supabase.com/docs/guides/auth
- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/auth/managing-user-data
- https://supabase.com/docs/guides/auth/jwts
- https://supabase.com/docs/reference/javascript/auth-getclaims
- https://github.com/orgs/supabase/discussions/306
- https://anhthang.org/posts/2024-05-30-automatically-creating-new-users-in-supabase-with-sql-triggers

---

## 4) Supabase Postgres Schema + RLS

### Key Takeaways
- **RLS is a Postgres-native feature** that appends a WHERE clause to every query. Supabase makes it easy to enable and write policies.
- **Standard pattern for private user data:** `CREATE POLICY ... USING (user_id = auth.uid())` on SELECT, and `WITH CHECK (user_id = auth.uid())` on INSERT/UPDATE.
- **Performance tip:** Wrap `auth.uid()` in a subselect `(SELECT auth.uid())` so Postgres caches it per-statement instead of calling the function per-row.
- **Foreign key validation (same user owns related rows):** For sessions referencing departments/projects, add a CHECK or policy that verifies the referenced department/project belongs to the same user. Best done at the application layer (Express) rather than in RLS to keep policies simple.
- **Server access pattern with Express:** Use `service_role` key (bypasses RLS) in Express backend. Since Express already validates the user via JWT middleware, Express controls access at the application layer. This is simpler and more flexible than trying to pass user context through RLS from Express.
- **Migrations:** Use Supabase CLI (`supabase migration new`) to manage schema changes as SQL files.

### Recommended Approach
1. Enable RLS on all tables.
2. Use `service_role` key in Express backend (bypasses RLS). Express is the security boundary — it validates JWT and scopes all queries with `WHERE user_id = $userId`.
3. Also add RLS policies as defense-in-depth (in case someone accesses Supabase directly via the client API).
4. Foreign key integrity (department/project belongs to user) enforced in Express validation layer.
5. Use Supabase CLI for migrations.

### Pitfalls & Mitigations
| Pitfall | Mitigation |
|---------|-----------|
| Forgetting RLS on a new table | Enforce RLS-enabled as part of migration checklist |
| `service_role` key leaked | Store in env vars; never expose to frontend |
| Cross-user data access | Express middleware always scopes queries by authenticated user_id |
| N+1 queries | Use JOINs and indexed columns (user_id, department_id, etc.) |

### Citations
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/getting-started/ai-prompts/database-rls-policies
- https://supabase.com/docs/guides/api/securing-your-api
- https://supabase.com/docs/guides/database/hardening-data-api
- https://designrevision.com/blog/supabase-row-level-security
- https://www.leanware.co/insights/supabase-best-practices

---

## 5) Reporting & Export UX

### Key Takeaways
- **Date range picker:** `react-day-picker` (lightweight, no Moment.js dependency, modern) is preferred over `react-dates` (Airbnb's, heavier, Moment.js dependency). `react-day-picker` v9+ supports range mode natively.
- **Week selector UX:** Custom component that maps Week # → date range. Show "Week 6 (Feb 2–Feb 8)" style labels. Allow selecting a range of weeks.
- **Dashboard layout:** Summary cards at top (total hours, session count), distribution chart (horizontal bar or donut), session list below. Day/Week toggle as segmented control.
- **CSV export:** Use `Papa.unparse()` (PapaParse) on the server side to generate CSV from session data. Set `Content-Type: text/csv` and `Content-Disposition: attachment; filename=...`. Server-side generation ensures consistent formatting.
- **Markdown export:** Template-based string generation on the server. Include summary stats, department breakdown, session list.
- **Timezone handling:** All dates stored as UTC in Postgres. Convert to Asia/Taipei on display and for day/week boundary calculations. Use `date-fns-tz` or `Intl.DateTimeFormat` with `timeZone: 'Asia/Taipei'`.

### Recommended Approach
1. Use `react-day-picker` for date range selection (Airbnb-like two-month view).
2. Build custom Week # selector that maps to date ranges anchored at 2026-02-02.
3. Dashboard: summary cards + Recharts for distribution chart + filtered session list.
4. Export CSV via Express endpoint using PapaParse.
5. All date math uses `date-fns` + `date-fns-tz` for timezone-aware week/day boundaries.

### Pitfalls & Mitigations
| Pitfall | Mitigation |
|---------|-----------|
| Timezone bugs in week boundaries | Always compute boundaries in Asia/Taipei; store UTC in DB |
| Large CSV export | Paginate or stream; unlikely issue at personal-use scale |
| Chart library bloat | Recharts is tree-shakable; import only needed components |
| Week numbering confusion | Clearly label "Week 1 = Feb 2–8, 2026" in UI |

### Citations
- https://daypicker.dev/
- https://github.com/react-dates/react-dates
- https://www.papaparse.com/
- https://www.tremor.so/
- https://judy-webdecoded.medium.com/create-airbnb-style-date-picker-in-react-a37409f0edc1

---
---

# PART B: Product Requirements Document (PRD)

## 1. Problem Statement

Knowledge workers and team members at nuva need a simple, distraction-free tool to track their focused work time. Existing Pomodoro apps lack:
- Department/project tagging for organizational tracking
- Honest completion tracking (what was planned vs. what was actually done)
- Weekly review and export capabilities for reporting

**nuva Focus Timer** solves this by combining a minimal Pomodoro timer with structured session logging, review dashboards, and export features — all private per user.

## 2. Goals

- Provide a **fast, minimal focus timer** (30 or 60 min) with accurate countdown even in background tabs
- Enable **structured session logging** with department, project, planned/actual title tracking
- Deliver **day and week review** with quantification, filtering, and visual summaries
- Support **CSV/Markdown export** for reporting
- **Private per user** with Supabase Auth (Magic Link + Google)
- **Accessible** and keyboard-navigable

## 3. Non-Goals (v1)

- Team/collaboration features (no shared sessions or dashboards)
- Mobile native app (web-only, responsive)
- Custom timer durations beyond 30/60
- Break timer / auto-start next session
- Integrations (Slack, Notion, etc.)
- Browser notifications (optional stretch only)
- Offline-first / service worker (localStorage for timer only)

## 4. Personas & User Stories

### Persona: nuva Team Member
A team member working across departments (Operations, Marketing, Engineering, etc.) who wants to track where their focused work time goes each week.

### User Stories

| # | Story | Priority |
|---|-------|----------|
| U1 | As a user, I can sign up/in with Magic Link or Google so I can access my data securely | Must |
| U2 | As a new user, I am guided to set my display name and avatar emoji before using the app | Must |
| U3 | As a user, I can create and manage my departments and projects | Must |
| U4 | As a user, I can start a 30-min or 60-min focus session tagged with department, project, and a planned goal | Must |
| U5 | As a user, the timer counts down accurately even if I switch tabs or refresh the page | Must |
| U6 | As a user, I can pause/resume my timer | Must |
| U7 | As a user, I can cancel a session (with confirmation) and the elapsed time is recorded | Must |
| U8 | As a user, when my timer completes, I hear an alarm and see a visual alert that I must dismiss | Must |
| U9 | As a user, after dismissing the alarm, I record whether I completed my goal (Yes/No) | Must |
| U10 | As a user, if I did NOT complete my goal, I must enter what I actually did | Must |
| U11 | As a user, I can view a day or week review of my sessions with totals and department distribution | Must |
| U12 | As a user, I can filter sessions by department, project, status, and keyword | Must |
| U13 | As a user, I can select date ranges by Week # or via a date range picker | Must |
| U14 | As a user, I can export sessions as CSV for a selected date range | Must |
| U15 | As a user, I can export a Markdown summary for a selected date range | Should |
| U16 | As a user, I can edit my display name and avatar emoji in settings | Must |

## 5. Requirements

### 5.1 Authentication & Profile (Must Have)

- Magic Link (email) + Google OAuth via Supabase Auth
- On first login, if profile incomplete → forced onboarding (display name + emoji avatar)
- Profile stored in `profiles` table
- Settings screen to edit profile anytime
- All user data private (RLS + Express auth middleware)

### 5.2 Departments & Projects (Must Have)

- Users can CRUD departments (create, rename, archive)
- Users can CRUD projects (create, rename, archive; optional project code)
- Seed defaults on first login:
  - Departments: 營運, 行銷, 課程, 社群, 開發
  - Projects: p039 — nuvaClub-funding
- Archived items hidden from selection but preserved in historical data

### 5.3 Timer (Must Have)

- Duration: 30 min or 60 min
- Session creation flow: Department → Project → Duration → Planned Title → Start
- Controls: Start, Pause/Resume, Cancel (with confirm dialog)
- Accuracy: wall-clock timestamps + Web Worker tick + localStorage persistence
- Only one active timer at a time (enforced client + server)
- Alarm: audio (pre-loaded, unlocked on Start gesture) + visual overlay + optional vibration
- Cancel records session as `canceled` with elapsed time

### 5.4 Completion Flow (Must Have)

- Timer ends → alarm (sound + visual)
- User clicks "Acknowledge / Stop Alarm"
- Completion modal:
  - "Did you complete the planned goal?" → Yes / No
  - No → REQUIRED "What I actually did" (becomes display title) + optional notes
  - Yes → optional notes; display title stays as planned title
- Session card shows display_title; detail view shows all fields

### 5.5 Review & Quantification (Must Have)

- Day view / Week view toggle
- Total time (hours:minutes) for selected range
- Department distribution (chart + numbers)
- Chronological session list
- Filters: department, project, status, keyword search
- Timezone: Asia/Taipei
- Weeks: Monday → Sunday
- Week 1 = 2026-02-02 (Monday)
- Select by Week # range or custom date range (Airbnb-like picker)

### 5.6 Export (Must Have)

- CSV export for selected range (day, week, week range, custom range)
- CSV includes: timestamp, duration, department, project, planned_title, actual_title, notes, status, totals
- Markdown summary export (optional/should-have)

## 6. UX Spec (Text Wireframes)

### Screen 1: Login
```
┌──────────────────────────────┐
│         nuva                 │
│      Focus Timer             │
│                              │
│  ┌──────────────────────┐    │
│  │ Continue with Google  │    │
│  └──────────────────────┘    │
│                              │
│  ── or ──                    │
│                              │
│  Email: [________________]   │
│  [  Send Magic Link  ]      │
│                              │
└──────────────────────────────┘
```

### Screen 2: Onboarding
```
┌──────────────────────────────┐
│  Welcome to nuva!            │
│                              │
│  Display Name:               │
│  [________________]          │
│                              │
│  Choose your avatar emoji:   │
│  😊 🚀 🎯 💡 🔥 🌟 📚 💪   │
│  (click to select or type)   │
│  Selected: [🎯]              │
│                              │
│  [ Save & Continue ]         │
└──────────────────────────────┘
```

### Screen 3: Timer (Idle State)
```
┌──────────────────────────────┐
│  nuva Timer    🎯 UserName   │
│  ─────────────────────────── │
│                              │
│  Department:  [ 開發    ▼ ]  │
│  Project:     [ p039    ▼ ]  │
│  Duration:    (●30) (○60)    │
│                              │
│  Planned Goal:               │
│  [________________________]  │
│                              │
│     [ ▶ Start Timer ]        │
│                              │
│  ─────────────────────────── │
│  [Timer] [Review] [Settings] │
└──────────────────────────────┘
```

### Screen 3b: Timer (Running)
```
┌──────────────────────────────┐
│  nuva Timer    🎯 UserName   │
│  ─────────────────────────── │
│                              │
│  開發 › p039                 │
│  "Implement login flow"      │
│                              │
│         24:37                │
│      ███████░░░░             │
│                              │
│   [ ⏸ Pause ]  [ ✕ Cancel ] │
│                              │
│  ─────────────────────────── │
│  [Timer] [Review] [Settings] │
└──────────────────────────────┘
```

### Screen 3c: Alarm Overlay
```
┌──────────────────────────────┐
│                              │
│  ██████████████████████████  │
│  ██                      ██  │
│  ██   ⏰ Time's Up!      ██  │
│  ██                      ██  │
│  ██   開發 › p039        ██  │
│  ██   "Implement login"  ██  │
│  ██                      ██  │
│  ██  [ Stop Alarm ✓ ]    ██  │
│  ██                      ██  │
│  ██████████████████████████  │
│                              │
└──────────────────────────────┘
```
(Pulsing background animation; alarm sound playing)

### Screen 3d: Completion Modal
```
┌──────────────────────────────┐
│  Session Complete            │
│  ─────────────────────────── │
│  Planned: "Implement login"  │
│                              │
│  Did you complete the goal?  │
│  (● Yes)  (○ No)            │
│                              │
│  Notes (optional):           │
│  [________________________]  │
│                              │
│  [ Save Session ]            │
└──────────────────────────────┘
```

If "No" is selected:
```
│  Did you complete the goal?  │
│  (○ Yes)  (● No)            │
│                              │
│  What I actually did: *      │
│  [________________________]  │
│                              │
│  Notes (optional):           │
│  [________________________]  │
│                              │
│  [ Save Session ]            │
```

### Screen 4: Review
```
┌──────────────────────────────┐
│  Review       🎯 UserName    │
│  ─────────────────────────── │
│                              │
│  [Day] [Week]    Week 3 ▼   │
│  Feb 16 – Feb 22, 2026      │
│  [ Date Range Picker 📅 ]   │
│                              │
│  ┌─ Summary ──────────────┐ │
│  │ Total: 12h 30m         │ │
│  │ Sessions: 18           │ │
│  └────────────────────────┘ │
│                              │
│  ┌─ By Department ────────┐ │
│  │ 開發  ████████  6h     │ │
│  │ 行銷  ████     3h     │ │
│  │ 課程  ███      2h30m  │ │
│  │ 營運  █        1h     │ │
│  └────────────────────────┘ │
│                              │
│  Filters: [Dept▼][Proj▼]   │
│  [Status▼] [Search🔍____]  │
│                              │
│  ┌─ Sessions ─────────────┐ │
│  │ 09:00  開發/p039  30m  │ │
│  │ "Implement login flow" │ │
│  │ ✅ Completed           │ │
│  ├────────────────────────┤ │
│  │ 10:00  行銷/p039  60m  │ │
│  │ "Write blog post"     │ │
│  │ ⚠️ Actually: "Research │ │
│  │  competitor blogs"     │ │
│  └────────────────────────┘ │
│                              │
│  [ Export CSV ] [ Export MD ] │
│                              │
│  ─────────────────────────── │
│  [Timer] [Review] [Settings] │
└──────────────────────────────┘
```

### Screen 5: Settings
```
┌──────────────────────────────┐
│  Settings     🎯 UserName    │
│  ─────────────────────────── │
│                              │
│  Profile                     │
│  Display Name: [UserName__]  │
│  Avatar: [🎯] (click to     │
│          change)             │
│  [ Save ]                    │
│                              │
│  ─────────────────────────── │
│  Departments                 │
│  營運  [Edit] [Archive]      │
│  行銷  [Edit] [Archive]      │
│  課程  [Edit] [Archive]      │
│  社群  [Edit] [Archive]      │
│  開發  [Edit] [Archive]      │
│  [ + Add Department ]        │
│                              │
│  ─────────────────────────── │
│  Projects                    │
│  p039 nuvaClub-funding       │
│       [Edit] [Archive]       │
│  [ + Add Project ]           │
│                              │
│  ─────────────────────────── │
│  [ Sign Out ]                │
│                              │
│  ─────────────────────────── │
│  [Timer] [Review] [Settings] │
└──────────────────────────────┘
```

## 7. Data Model

### 7.1 Tables

```sql
-- Profiles (auto-created by trigger on auth.users INSERT)
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_emoji TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Departments
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT,           -- optional, e.g., "p039"
  name TEXT NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  duration_minutes INT NOT NULL CHECK (duration_minutes IN (30, 60)),
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'paused', 'completed_yes', 'completed_no', 'canceled')),
  planned_title TEXT NOT NULL,
  actual_title TEXT,      -- required when status = completed_no
  notes TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  paused_total_seconds INT NOT NULL DEFAULT 0,
  canceled_at TIMESTAMPTZ,
  elapsed_seconds INT,    -- for canceled sessions
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_departments_user ON departments(user_id);
CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_user_started ON sessions(user_id, started_at);
CREATE INDEX idx_sessions_status ON sessions(user_id, status);
```

### 7.2 Trigger: Auto-Create Profile on Signup

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 7.3 Seed Data Function

```sql
-- Called by Express after profile onboarding completes
-- Inserts default departments and project for the user
CREATE OR REPLACE FUNCTION public.seed_user_defaults(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO departments (user_id, name) VALUES
    (p_user_id, '營運'),
    (p_user_id, '行銷'),
    (p_user_id, '課程'),
    (p_user_id, '社群'),
    (p_user_id, '開發');

  INSERT INTO projects (user_id, code, name) VALUES
    (p_user_id, 'p039', 'nuvaClub-funding');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 7.4 RLS Policies (Defense-in-Depth)

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update only their own
CREATE POLICY profiles_select ON profiles FOR SELECT USING (user_id = (SELECT auth.uid()));
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (user_id = (SELECT auth.uid()));

-- Departments: users can CRUD only their own
CREATE POLICY departments_all ON departments FOR ALL USING (user_id = (SELECT auth.uid()));

-- Projects: users can CRUD only their own
CREATE POLICY projects_all ON projects FOR ALL USING (user_id = (SELECT auth.uid()));

-- Sessions: users can CRUD only their own
CREATE POLICY sessions_all ON sessions FOR ALL USING (user_id = (SELECT auth.uid()));
```

## 8. API Spec

### 8.1 Auth Middleware

Every request to Express includes `Authorization: Bearer <supabase_access_token>`.
Express middleware:
1. Extracts token from header
2. Calls `supabase.auth.getUser(token)`
3. If valid, sets `req.userId = user.id`
4. If invalid, returns `401 Unauthorized`

### 8.2 Endpoints

#### Profile

| Method | Path | Description | Request | Response |
|--------|------|-------------|---------|----------|
| GET | `/api/me` | Get profile + onboarding status | — | `{ user_id, display_name, avatar_emoji, is_onboarded }` |
| PATCH | `/api/me` | Update profile | `{ display_name?, avatar_emoji? }` | `{ user_id, display_name, avatar_emoji }` |
| POST | `/api/me/seed` | Seed defaults (called once after onboarding) | — | `{ ok: true }` |

#### Departments

| Method | Path | Description | Request | Response |
|--------|------|-------------|---------|----------|
| GET | `/api/departments` | List (non-archived by default) | `?include_archived=true` | `[{ id, name, is_archived }]` |
| POST | `/api/departments` | Create | `{ name }` | `{ id, name }` |
| PATCH | `/api/departments/:id` | Rename | `{ name }` | `{ id, name }` |
| POST | `/api/departments/:id/archive` | Archive/unarchive | `{ is_archived }` | `{ id, is_archived }` |

#### Projects

| Method | Path | Description | Request | Response |
|--------|------|-------------|---------|----------|
| GET | `/api/projects` | List (non-archived by default) | `?include_archived=true` | `[{ id, code, name, is_archived }]` |
| POST | `/api/projects` | Create | `{ code?, name }` | `{ id, code, name }` |
| PATCH | `/api/projects/:id` | Rename | `{ code?, name }` | `{ id, code, name }` |
| POST | `/api/projects/:id/archive` | Archive/unarchive | `{ is_archived }` | `{ id, is_archived }` |

#### Sessions

| Method | Path | Description | Request | Response |
|--------|------|-------------|---------|----------|
| POST | `/api/sessions/start` | Start session | `{ department_id, project_id, duration_minutes, planned_title }` | `{ id, status, started_at, ... }` |
| POST | `/api/sessions/:id/pause` | Pause | — | `{ id, status, paused_total_seconds }` |
| POST | `/api/sessions/:id/resume` | Resume | — | `{ id, status }` |
| POST | `/api/sessions/:id/cancel` | Cancel | — | `{ id, status, canceled_at, elapsed_seconds }` |
| POST | `/api/sessions/:id/complete` | Complete | `{ completed: bool, actual_title?, notes? }` | `{ id, status, ended_at, ... }` |
| GET | `/api/sessions` | List with filters | `?start=&end=&department_id=&project_id=&status=&q=` | `[{ session objects }]` |
| GET | `/api/sessions/:id` | Get detail | — | `{ full session object }` |

#### Reports

| Method | Path | Description | Request | Response |
|--------|------|-------------|---------|----------|
| GET | `/api/reports/summary` | Summary for range | `?start=YYYY-MM-DD&end=YYYY-MM-DD` | `{ total_minutes, session_count, by_department: [...] }` |

#### Export

| Method | Path | Description | Request | Response |
|--------|------|-------------|---------|----------|
| GET | `/api/exports/sessions.csv` | CSV download | `?start=&end=&department_id=&project_id=&status=` | CSV file download |
| GET | `/api/exports/summary.md` | Markdown download | `?start=&end=` | Markdown file download |

### 8.3 Validation Rules

- `duration_minutes` must be 30 or 60
- `planned_title` must be non-empty string, max 200 chars
- On complete with `completed: false`, `actual_title` is required, max 200 chars
- `department_id` and `project_id` must belong to the authenticated user
- Only the session owner can pause/resume/cancel/complete
- Cannot pause a non-running session; cannot resume a non-paused session
- Cannot start a new session if user already has a running/paused session

### 8.4 Error Responses

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "actual_title is required when goal not completed"
  }
}
```

Standard HTTP status codes: 200, 201, 400, 401, 404, 409, 500.

## 9. Analytics & Metrics

For v1, track via server logs (structured JSON):
- Daily active users (DAU)
- Sessions started per day
- Completion rate (completed_yes vs completed_no vs canceled)
- Average session duration
- Most used departments/projects

No third-party analytics in v1. Can add PostHog or similar later.

## 10. Test Plan & Acceptance Criteria

### Unit Tests
- Timer logic: wall-clock computation, pause/resume math, edge cases
- API validation: all endpoints with valid/invalid inputs
- Date/timezone utilities: week number calculation, week boundaries

### Integration Tests
- Auth flow: login → token → API access
- Session lifecycle: start → pause → resume → complete
- Session lifecycle: start → cancel
- RLS: user A cannot access user B's data

### E2E Tests (Playwright or Cypress)
- Login with Magic Link (mock email)
- Onboarding flow
- Full timer cycle: select → start → wait → alarm → complete (Yes)
- Full timer cycle: select → start → wait → alarm → complete (No, with actual_title)
- Cancel flow with confirmation
- Review: filter, search, navigate weeks
- Export CSV download

### Acceptance Criteria
- Timer accurate to ±2 seconds after 60 minutes in background tab
- Alarm plays audibly when timer completes (user gesture unlocked)
- Refreshing page during active timer resumes correctly
- All user data scoped to authenticated user (no cross-user leaks)
- CSV export contains all required columns with correct data
- Week 1 = Feb 2, 2026 consistently throughout the app

## 11. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Browser audio blocked | Alarm not heard | Medium | Unlock audio on Start gesture; visual alarm always works |
| Timer drift in edge browsers | Inaccurate countdown | Low | Web Worker + wall-clock math; test on Chrome/Firefox/Safari |
| Supabase Auth downtime | Users can't login | Low | Display friendly error; Supabase has 99.9% SLA |
| Complex RLS bugs | Data leak | Medium | Express is primary security boundary; RLS is defense-in-depth |
| Scope creep (team features, etc.) | Delayed delivery | Medium | Strict non-goals list; defer to v2 |
| localStorage cleared | Timer state lost | Low | Server has started_at; can recover approximate state |

---
---

# PART C: 10-Week Execution Plan

## Week 1: Foundation — Project Setup, Auth, Database

### Objectives
- Set up monorepo structure (frontend + backend)
- Configure Supabase project (Auth, Postgres)
- Implement auth flow (Magic Link + Google)
- Create database schema + migrations

### Deliverables
- Working monorepo with build/dev scripts
- Supabase project configured with Auth providers
- Database tables, indexes, RLS policies, triggers deployed
- Express server with auth middleware
- Frontend login screen (Magic Link + Google)

### Engineering Tasks
**Backend:**
- Initialize Express + TypeScript project
- Set up Supabase client (service_role for backend)
- Write auth middleware (JWT verification via `getUser()`)
- Write SQL migrations: profiles, departments, projects, sessions tables
- Write trigger: `handle_new_user()` for auto profile creation
- Write seed function: `seed_user_defaults()`
- Deploy migrations to Supabase

**Frontend:**
- Initialize React + TypeScript project (Vite)
- Set up Supabase client (anon key for frontend)
- Implement auth context/provider
- Build Login screen (Magic Link + Google OAuth)
- Set up React Router (login, onboarding, timer, review, settings)
- Set up Tailwind CSS + base styling

### QA Checklist
- [ ] Magic Link login sends email and completes auth
- [ ] Google OAuth redirects and completes auth
- [ ] Auth middleware correctly validates tokens
- [ ] Profile row auto-created on signup
- [ ] RLS policies prevent cross-user access via Supabase client

### Definition of Done
- User can log in via Magic Link or Google and see a placeholder home screen
- Express returns 401 for unauthenticated requests, 200 for valid tokens
- All tables exist with correct constraints

### Demo Checklist
- [ ] Show Magic Link flow end-to-end
- [ ] Show Google OAuth flow end-to-end
- [ ] Show Express middleware rejecting bad token

---

## Week 2: Profile Onboarding + Departments & Projects CRUD

### Objectives
- Build onboarding flow (display name + emoji avatar)
- Implement departments & projects CRUD (API + UI)
- Seed defaults on first onboarding

### Deliverables
- Onboarding screen (forced if profile incomplete)
- Profile API endpoints (GET /me, PATCH /me, POST /me/seed)
- Departments CRUD API + Settings UI
- Projects CRUD API + Settings UI

### Engineering Tasks
**Backend:**
- `GET /api/me` — return profile + is_onboarded flag
- `PATCH /api/me` — update display_name, avatar_emoji
- `POST /api/me/seed` — call seed_user_defaults, set is_onboarded
- Departments CRUD endpoints (GET, POST, PATCH, archive)
- Projects CRUD endpoints (GET, POST, PATCH, archive)
- Input validation (name length, uniqueness, ownership checks)

**Frontend:**
- Onboarding screen: display name input + emoji picker grid
- Redirect to onboarding if `is_onboarded === false`
- Settings screen: profile edit section
- Settings screen: departments list with add/edit/archive
- Settings screen: projects list with add/edit/archive
- API client utility (fetch wrapper with auth header)

### QA Checklist
- [ ] New user forced to onboarding before accessing timer
- [ ] Default departments and project seeded after onboarding
- [ ] Can create, rename, archive departments
- [ ] Can create, rename, archive projects
- [ ] Archived items hidden from dropdowns but preserved in data
- [ ] Profile edit saves and reflects immediately

### Definition of Done
- New user completes full flow: login → onboarding → sees timer screen with defaults
- CRUD operations work for departments and projects
- Settings screen fully functional

### Demo Checklist
- [ ] New user onboarding flow (name + emoji)
- [ ] Create a new department
- [ ] Archive a department, confirm it disappears from active list
- [ ] Edit a project name

---

## Week 3: Timer Core — Start, Countdown, Persistence

### Objectives
- Build the timer engine (wall-clock + Web Worker + localStorage)
- Implement session start flow (dept → project → duration → title)
- Build the running timer UI with accurate countdown

### Deliverables
- Timer hook (`useTimer`) with Web Worker
- Session start API endpoint
- Timer UI (idle state + running state)
- localStorage persistence + page refresh recovery

### Engineering Tasks
**Backend:**
- `POST /api/sessions/start` — validate inputs, check no existing running session, create session with `started_at = now()`, return session
- Validation: department_id and project_id belong to user

**Frontend:**
- Build Web Worker for timer ticks (`timer.worker.ts`)
- Build `useTimer` hook:
  - Reads/writes localStorage (`nuva_timer_state`)
  - Computes remaining = duration - (now - started_at - paused_total)
  - On mount, checks for existing running timer in localStorage
  - Exposes: start, pause, resume, cancel, remaining, status
- Timer screen (idle): department select, project select, duration radio, planned title input, start button
- Timer screen (running): countdown display (MM:SS), progress bar, department/project/title display
- On start: call API, store state in localStorage, start Web Worker
- On `visibilitychange`: recalculate remaining time
- Prevent starting a new session if one exists (check localStorage + API)

### QA Checklist
- [ ] Timer counts down accurately (±1s over 30 minutes)
- [ ] Switching tabs does not stop or drift the timer
- [ ] Refreshing the page restores the running timer with correct remaining time
- [ ] Cannot start two sessions simultaneously
- [ ] Timer UI updates every second

### Definition of Done
- User can start a 30-min or 60-min session and see it count down accurately
- Timer survives tab switch and page refresh

### Demo Checklist
- [ ] Start a 30-min session, show countdown
- [ ] Switch to another tab for 30 seconds, come back — timer still accurate
- [ ] Refresh page — timer continues from correct time
- [ ] Try starting second session — blocked

---

## Week 4: Timer Controls — Pause, Resume, Cancel

### Objectives
- Implement Pause/Resume with accurate time accounting
- Implement Cancel with confirmation and elapsed time recording
- Refine timer UI states

### Deliverables
- Pause/Resume API endpoints + frontend integration
- Cancel API endpoint + confirmation modal + frontend integration
- Updated localStorage persistence for pause state

### Engineering Tasks
**Backend:**
- `POST /api/sessions/:id/pause` — validate session is running, record pause start, set status=paused
- `POST /api/sessions/:id/resume` — validate session is paused, accumulate paused_total_seconds, set status=running
- `POST /api/sessions/:id/cancel` — validate session is running/paused, set status=canceled, calculate elapsed_seconds, set canceled_at
- Add pause tracking: either store `paused_at` timestamp on session or keep a running `paused_total_seconds`

**Frontend:**
- Pause button: calls API, updates localStorage, pauses Web Worker display
- Resume button: calls API, updates localStorage, resumes display
- Cancel button: shows confirmation dialog ("Cancel this session? Elapsed time will be saved.")
- Confirmation modal: Cancel / Confirm buttons
- On confirm cancel: call API, clear localStorage timer state, return to idle
- Update `useTimer` hook for pause/resume state management
- Paused UI state: show "Paused" indicator, frozen time, Resume button

### QA Checklist
- [ ] Pause stops countdown display; time does not count while paused
- [ ] Resume continues countdown correctly (paused time excluded)
- [ ] Multiple pause/resume cycles produce accurate remaining time
- [ ] Cancel shows confirmation; declining returns to timer
- [ ] Cancel confirms → session saved as canceled with correct elapsed time
- [ ] Refresh during pause → restored in paused state

### Definition of Done
- Full timer lifecycle works: start → pause → resume → (time passes) → timer still accurate
- Cancel creates a proper canceled session record
- All states persist across page refresh

### Demo Checklist
- [ ] Start → Pause → wait 10s → Resume → time still correct
- [ ] Start → Cancel → confirm → see timer return to idle
- [ ] Pause → refresh page → still paused with correct time

---

## Week 5: Alarm + Completion Flow

### Objectives
- Implement alarm system (audio + visual)
- Build completion modal (Yes/No + actual_title)
- Complete the full session lifecycle

### Deliverables
- Audio alarm (pre-loaded, unlocked on start gesture)
- Visual alarm overlay (full-screen pulsing)
- Completion modal with conditional fields
- Complete API endpoint
- Session detail view

### Engineering Tasks
**Backend:**
- `POST /api/sessions/:id/complete` — validate:
  - Session must be in running status and timer must have elapsed
  - If `completed: false`, `actual_title` is required
  - Set status to `completed_yes` or `completed_no`
  - Set `ended_at = now()`
  - Store actual_title, notes

**Frontend:**
- Audio system:
  - On "Start Timer" click, create AudioContext + play silent buffer (unlock)
  - Pre-load `/alarm.mp3` audio element
  - When timer reaches 0, play alarm on loop
- Visual alarm:
  - Full-screen overlay with pulsing animation
  - "Time's Up!" message + session info
  - "Stop Alarm" button (prominent, auto-focused)
  - Respect `prefers-reduced-motion`
- Completion modal:
  - Radio: "Did you complete the goal?" Yes / No
  - If No: show required "What I actually did" textarea
  - Optional notes textarea
  - "Save Session" button
  - Validation: if No and actual_title empty, show error
- On save: call complete API, clear localStorage timer state, show success
- Optional: vibration on alarm (`navigator.vibrate([500, 200, 500])`)
- ARIA: alarm modal has `role="alertdialog"`, focus trap

### QA Checklist
- [ ] Alarm sound plays when timer reaches 0
- [ ] Visual overlay appears and pulses
- [ ] Clicking "Stop Alarm" stops sound and shows completion modal
- [ ] Completing with Yes saves correctly (no actual_title required)
- [ ] Completing with No requires actual_title, blocks save if empty
- [ ] Session appears in database with correct status and fields
- [ ] Alarm works even if tab was in background

### Definition of Done
- Full session lifecycle: start → run → alarm → complete (Yes or No)
- Audio + visual alarm reliable on Chrome, Firefox, Safari
- Completion data correctly stored

### Demo Checklist
- [ ] Full 30-min session (use short duration for demo, e.g., 10s)
- [ ] Alarm fires with sound + visual
- [ ] Complete with Yes → session saved
- [ ] Complete with No → must enter actual title → saved
- [ ] Show session data in database

---

## Week 6: Review Screen — Day/Week View + Summary

### Objectives
- Build the Review screen with day/week toggle
- Implement summary calculations (totals, department distribution)
- Build session list with chronological display

### Deliverables
- Review screen with day/week toggle
- Summary cards (total time, session count)
- Department distribution chart (horizontal bars)
- Chronological session list
- Reports API endpoint

### Engineering Tasks
**Backend:**
- `GET /api/reports/summary?start=YYYY-MM-DD&end=YYYY-MM-DD`
  - Calculate total_minutes (exclude canceled by default)
  - Calculate session_count
  - Calculate by_department: `[{ department_id, name, total_minutes, count }]`
  - Timezone-aware: interpret start/end as Asia/Taipei dates
- `GET /api/sessions?start=&end=&...`
  - Return sessions in range with department/project names joined
  - Sort by started_at descending

**Frontend:**
- Review screen layout: header, toggle, summary, chart, list
- Day/Week segmented control toggle
  - Day: shows single day (default: today)
  - Week: shows Mon-Sun week (default: current week)
- Navigation: ← previous / next → for day or week
- Summary cards component: total time (Xh Ym), session count
- Department distribution: horizontal bar chart (Recharts `BarChart`)
  - Show department name + time + percentage
- Session list component:
  - Each card: time, department/project, duration, display_title, status indicator
  - Click to expand/view detail
- Date utilities:
  - `getWeekNumber(date)` — compute week # anchored at 2026-02-02
  - `getWeekRange(weekNum)` — return { start, end } for a week number
  - All using Asia/Taipei timezone

### QA Checklist
- [ ] Day view shows correct sessions for selected date
- [ ] Week view shows Mon-Sun range correctly
- [ ] Summary totals are accurate
- [ ] Department distribution percentages add up to 100%
- [ ] Session list is chronologically sorted
- [ ] Canceled sessions excluded from totals by default
- [ ] Week numbers match expected dates (Week 1 = Feb 2-8, 2026)

### Definition of Done
- Review screen shows day and week views with correct data
- Summary, chart, and session list render properly
- Navigation between days/weeks works

### Demo Checklist
- [ ] Show day view with today's sessions
- [ ] Switch to week view
- [ ] Navigate to previous week
- [ ] Show department distribution chart
- [ ] Click a session to see detail

---

## Week 7: Review Screen — Filters, Search, Week Selector, Date Range Picker

### Objectives
- Add filtering and search to review screen
- Build Week # selector (Week 1 anchored at Feb 2)
- Build Airbnb-style date range picker for custom ranges

### Deliverables
- Filter dropdowns (department, project, status)
- Keyword search across titles/notes
- Week # selector dropdown
- Date range picker (react-day-picker)
- Week range selector (Week X to Week Y)

### Engineering Tasks
**Backend:**
- Enhance `GET /api/sessions` with query params:
  - `department_id` — filter by department
  - `project_id` — filter by project
  - `status` — filter by status (completed_yes, completed_no, canceled)
  - `q` — keyword search (ILIKE on planned_title, actual_title, notes)
- Enhance `GET /api/reports/summary` to accept same filters

**Frontend:**
- Filter bar component:
  - Department dropdown (populated from user's departments)
  - Project dropdown (populated from user's projects)
  - Status dropdown (Completed ✓, Changed ✗, Canceled ○)
  - Search input with debounce (300ms)
- Week # selector:
  - Dropdown showing "Week 1 (Feb 2-8)", "Week 2 (Feb 9-15)", etc.
  - Calculate available weeks from Week 1 to current week
  - Support selecting a range: "Week 3 – Week 5"
- Date range picker:
  - Use `react-day-picker` in range mode
  - Two-month calendar view
  - Click start date, click end date
  - Selected range highlighted
  - Apply button
- Wire filters to API: update query params, refetch data
- URL state: sync filters to URL search params for shareability

### QA Checklist
- [ ] Department filter shows only sessions from selected department
- [ ] Project filter works correctly
- [ ] Status filter shows only matching sessions
- [ ] Keyword search finds matches in planned_title, actual_title, notes
- [ ] Week # selector maps to correct date ranges
- [ ] Date range picker allows arbitrary range selection
- [ ] Multiple filters can be combined
- [ ] Summary updates to reflect filtered data

### Definition of Done
- All filters and search working
- Week selector and date range picker functional
- Filters reflected in both summary and session list

### Demo Checklist
- [ ] Filter by department → summary and list update
- [ ] Search for keyword → matching sessions shown
- [ ] Select "Week 2" → correct date range loaded
- [ ] Use date range picker to select custom range
- [ ] Combine department filter + week selector

---

## Week 8: Export (CSV + Markdown)

### Objectives
- Implement CSV export for selected date ranges
- Implement Markdown summary export
- Polish export UX

### Deliverables
- CSV export endpoint + download button
- Markdown export endpoint + download button
- Export includes totals, distribution, and session rows

### Engineering Tasks
**Backend:**
- `GET /api/exports/sessions.csv?start=&end=&department_id=&project_id=&status=`
  - Use PapaParse `unparse()` to generate CSV
  - Columns: Date, Time, Department, Project, Duration (min), Status, Planned Title, Actual Title, Notes
  - Include summary rows at top: Total Time, Total Sessions, By Department
  - Set headers: `Content-Type: text/csv`, `Content-Disposition: attachment; filename=nuva-sessions-YYYYMMDD-YYYYMMDD.csv`
- `GET /api/exports/summary.md?start=&end=`
  - Generate Markdown template:
    ```
    # nuva Weekly Report — Week X (Feb DD – Feb DD, 2026)
    ## Summary
    - Total: Xh Ym
    - Sessions: N
    ## By Department
    - 開發: Xh Ym (N sessions)
    - ...
    ## Sessions
    | Time | Dept | Project | Duration | Title | Status |
    | ... |
    ```
  - Set headers: `Content-Type: text/markdown`, `Content-Disposition: attachment`

**Frontend:**
- "Export CSV" button on review screen
- "Export MD" button on review screen
- Buttons trigger download (link to API endpoint with current filters as query params)
- Loading state while export generates
- Respect current filter/date selection for export

### QA Checklist
- [ ] CSV downloads with correct filename
- [ ] CSV contains all required columns
- [ ] CSV totals match review screen totals
- [ ] CSV respects active filters
- [ ] Markdown export contains proper formatting
- [ ] Markdown summary matches review data
- [ ] Large exports (100+ sessions) work without timeout

### Definition of Done
- CSV and Markdown export fully functional
- Export matches what user sees on review screen
- Files download cleanly in all major browsers

### Demo Checklist
- [ ] Export CSV for current week, open in Excel/Sheets
- [ ] Export CSV with department filter applied
- [ ] Export Markdown summary, view formatted
- [ ] Verify export data matches review screen

---

## Week 9: Polish, Accessibility, Edge Cases

### Objectives
- Accessibility audit and fixes
- UI polish and responsive design
- Edge case handling
- Performance optimization

### Deliverables
- Fully accessible UI (keyboard nav, ARIA, focus management)
- Responsive design (desktop + tablet + mobile)
- Edge case handling (multiple tabs, network errors, etc.)
- Loading states, error boundaries, empty states

### Engineering Tasks
**Frontend:**
- Accessibility:
  - Keyboard navigation for all interactive elements
  - Visible focus indicators (`:focus-visible` styling)
  - ARIA labels for timer countdown, modals, buttons
  - `role="alertdialog"` on alarm modal
  - `role="timer"` + `aria-live="polite"` on countdown display
  - `prefers-reduced-motion` support (disable alarm animation)
  - Tab order audit
  - Screen reader testing
- Responsive design:
  - Mobile: stack layout, larger touch targets
  - Tablet: comfortable spacing
  - Desktop: centered content, max-width
- Edge cases:
  - Multiple tab detection (BroadcastChannel: warn user, prevent dual timers)
  - Network error handling (retry with exponential backoff for API calls)
  - Session expired mid-timer (handle 401, re-auth flow)
  - Empty states: no sessions, no departments, no results for filter
- Polish:
  - Loading skeletons for data fetches
  - Toast notifications for success/error actions
  - Smooth transitions between timer states
  - Consistent Traditional Chinese labels throughout
  - Error boundaries to catch React crashes

**Backend:**
- Input sanitization audit
- Rate limiting on auth-related endpoints
- Request logging (structured JSON)
- Error response consistency audit

### QA Checklist
- [ ] Tab through entire app with keyboard only
- [ ] Screen reader announces timer state changes
- [ ] Alarm modal traps focus and is announced
- [ ] App usable on 375px-width mobile screen
- [ ] Multiple tab scenario handled gracefully
- [ ] Network disconnect during timer shows error, recovers on reconnect
- [ ] Empty states display helpful messages
- [ ] No console errors in normal flow

### Definition of Done
- WCAG 2.1 AA compliance for core flows
- Responsive on mobile/tablet/desktop
- All edge cases handled gracefully
- No unhandled errors in normal usage

### Demo Checklist
- [ ] Keyboard-only navigation through full timer cycle
- [ ] Show mobile layout
- [ ] Open two tabs — second tab shows warning
- [ ] Show empty state for new user with no sessions
- [ ] Disconnect network — show error handling

---

## Week 10: Testing, Bug Fixes, Deployment

### Objectives
- Write and run comprehensive tests
- Fix bugs discovered during testing
- Deploy to production
- Documentation

### Deliverables
- Unit test suite (timer logic, date utils, API validation)
- Integration test suite (API endpoints, auth)
- E2E test suite (Playwright: core flows)
- Production deployment
- User guide (brief)

### Engineering Tasks
**Testing:**
- Unit tests:
  - Timer computation: `computeRemaining()` with various started_at, paused_total, durations
  - Date utils: `getWeekNumber()`, `getWeekRange()`, timezone edge cases
  - API validation: all endpoints with valid/invalid/edge inputs
- Integration tests:
  - Auth middleware: valid token → 200, invalid → 401, expired → 401
  - Session lifecycle: start → pause → resume → complete
  - Session cancel: start → cancel → verify elapsed_seconds
  - Cross-user isolation: user A's token cannot access user B's sessions
  - Filters: verify query params filter correctly
  - Export: verify CSV content matches query results
- E2E tests (Playwright):
  - Login flow (mock magic link)
  - Onboarding completion
  - Full session cycle (using shortened timer for testing)
  - Review screen navigation + filtering
  - CSV export download verification

**Deployment:**
- Frontend: deploy to Vercel (or Netlify)
- Backend: deploy to Railway (or Render)
- Environment variables configured
- Supabase production project configured
- Custom domain (if available)
- HTTPS enforced

**Bug fixes:**
- Triage and fix all bugs found during testing
- Performance profiling (Lighthouse audit)
- Security review (OWASP checklist)

### QA Checklist
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Production deployment accessible
- [ ] Auth works on production (Magic Link emails deliver)
- [ ] Google OAuth works on production
- [ ] Timer accurate on production
- [ ] Export downloads work on production
- [ ] No console errors on production
- [ ] Lighthouse score > 90 for performance

### Definition of Done
- All tests green
- Production deployment live and accessible
- Core user flows verified on production
- Known issues documented

### Demo Checklist
- [ ] Full app walkthrough on production URL
- [ ] Login → Onboard → Start session → Complete → Review → Export
- [ ] Show test results (all passing)
- [ ] Lighthouse audit results

---

# STOP — Awaiting Approval

The Research Summary, PRD, and 10-Week Execution Plan are complete.

**Please review and confirm before I begin implementing Week 1.**

I will not write any code until you explicitly approve.
