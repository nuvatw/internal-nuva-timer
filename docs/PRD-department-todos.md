# PRD: Department Todos — 6-Week Implementation Plan

**Product:** nuva Focus Timer
**Author:** Claude
**Date:** 2026-03-04
**Status:** Draft

---

## 1. Overview

在 Timer 頁面整合「部門代辦」功能，讓使用者可以在五個部門（營運、行銷、課程、社群、開發）下各自管理待辦事項。點擊代辦即可自動帶入 Timer 的 Goal 欄位並開始計時，完成後自動打勾。支援截止日期、星級緊急度、拖拉排序。

### 1.1 Core User Flow

```
Timer Page (idle)
├── DailyProgress          ← existing
├── DepartmentDashboard    ← existing
├── ★ DepartmentTodos      ← NEW
│   ├── [營運] tab
│   │   ├── Todo item (★★★ 紅色=今天到期) → click → auto-fill Goal
│   │   ├── Todo item (★★ 明天到期)
│   │   └── + Add todo input
│   ├── [行銷] tab
│   │   └── ...
│   ├── [課程] tab
│   ├── [社群] tab
│   └── [開發] tab
└── IdleForm               ← existing, Goal pre-filled from todo
```

---

## 2. Feature Requirements

### 2.1 Todo CRUD

| Feature | Detail |
|---------|--------|
| 新增 Todo | 每個部門下方有 inline input，輸入後按 Enter 即建立 |
| 編輯 Todo | 雙擊 or 點擊編輯 icon 可修改標題 |
| 刪除 Todo | Swipe or 點擊刪除 icon |
| 完成 Todo | 點擊 checkbox 手動打勾，or Timer 完成後自動打勾 |
| 檢視已完成 | 折疊式「X Completed · Clear」（參考截圖 UI） |

### 2.2 Todo Attributes

| Field | Type | Required | Detail |
|-------|------|----------|--------|
| `title` | text (200 chars) | Yes | 代辦標題 |
| `department_id` | UUID FK | Yes | 所屬部門 |
| `due_date` | date (nullable) | No | 截止日期 |
| `urgency` | int (1-3) | No, default 1 | ★ = 1, ★★ = 2, ★★★ = 3 |
| `position` | int | Yes | 排序順序（drag & drop） |
| `is_completed` | boolean | Yes | 是否已完成 |
| `completed_at` | timestamptz | No | 完成時間 |
| `linked_session_id` | UUID FK (nullable) | No | 關聯的 Timer session |

### 2.3 Priority / Urgency Display

- ★☆☆ (urgency=1) — 一般，預設
- ★★☆ (urgency=2) — 重要
- ★★★ (urgency=3) — 緊急

### 2.4 Due Date Styling

| Condition | Style |
|-----------|-------|
| 到期日 = 今天 | **紅色文字** + 紅色日期標籤 |
| 到期日 = 明天 | 橘色日期標籤 |
| 已逾期 (過去) | 紅色文字 + ~~刪除線~~ 日期 |
| 未來日期 | 灰色日期標籤 |
| 無到期日 | 不顯示 |

### 2.5 Timer Integration

#### Click-to-Start Flow
1. User clicks a todo item
2. IdleForm 自動填入：
   - **Department** → todo 所屬部門 (auto-select)
   - **Goal** → todo 標題 (auto-fill `plannedTitle`)
   - Scroll to IdleForm
3. User 選擇 Project + Duration，按 Start
4. `linked_session_id` 記錄到 todo

#### Auto-Complete Flow
1. Timer 結束 → CompletionModal 顯示
2. User 選擇 "Yes" (completed_yes)
3. Server-side:
   - Complete session (existing logic)
   - Auto-mark linked todo as `is_completed = true`
4. Client-side:
   - Todo list 即時更新（打勾動畫）

### 2.6 Drag & Drop Reordering

- 長按 or drag handle 開始拖動
- 同部門內自由上下排序
- 拖放後更新 `position` 欄位
- 使用 optimistic update（先更新 UI，再 sync server）

---

## 3. Technical Design

### 3.1 Database Schema

```sql
-- Migration: 004_create_todos.sql

CREATE TABLE todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_date DATE,
  urgency INT NOT NULL DEFAULT 1 CHECK (urgency BETWEEN 1 AND 3),
  position INT NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  linked_session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_todos_user ON todos(user_id);
CREATE INDEX idx_todos_dept ON todos(user_id, department_id);
CREATE INDEX idx_todos_active ON todos(user_id, is_completed, position);

-- RLS
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
CREATE POLICY todos_all ON todos
  FOR ALL USING (user_id = (SELECT auth.uid()));
```

### 3.2 API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/todos` | 取得所有未完成的 todos（可選 `?include_completed=true`） |
| `GET` | `/api/todos?department_id=xxx` | 依部門篩選 |
| `POST` | `/api/todos` | 新增 todo |
| `PATCH` | `/api/todos/:id` | 更新 todo（標題、日期、緊急度、完成狀態） |
| `DELETE` | `/api/todos/:id` | 刪除 todo |
| `POST` | `/api/todos/:id/complete` | 標記完成 |
| `POST` | `/api/todos/reorder` | 批次更新排序 `[{id, position}]` |
| `DELETE` | `/api/todos/completed` | 清除所有已完成的 todos |

### 3.3 Frontend Architecture

```
client/src/
├── contexts/
│   └── TodoContext.tsx          ← NEW: global todo state
├── components/
│   └── todos/
│       ├── DepartmentTodos.tsx  ← NEW: container with dept tabs
│       ├── TodoList.tsx         ← NEW: sortable list per dept
│       ├── TodoItem.tsx         ← NEW: single todo row
│       ├── TodoInput.tsx        ← NEW: inline add input
│       └── TodoDatePicker.tsx   ← NEW: date + urgency picker
├── hooks/
│   └── useTodos.ts             ← NEW: CRUD + reorder logic
├── types/
│   └── models.ts               ← UPDATE: add Todo interface
└── pages/
    └── TimerPage.tsx            ← UPDATE: integrate DepartmentTodos
```

### 3.4 State Management

```typescript
// TodoContext 提供：
interface TodoContextValue {
  todos: Todo[];                          // all active todos
  loading: boolean;
  addTodo: (dept_id: string, title: string) => Promise<void>;
  updateTodo: (id: string, updates: Partial<Todo>) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  completeTodo: (id: string) => Promise<void>;
  reorderTodos: (dept_id: string, orderedIds: string[]) => Promise<void>;
  clearCompleted: () => Promise<void>;
  linkTodoToSession: (todoId: string, sessionId: string) => void;
  selectedTodo: Todo | null;              // 被點擊準備開始的 todo
  selectTodo: (todo: Todo | null) => void;
}
```

### 3.5 Timer Integration Points

**IdleForm Changes:**
- Accept optional `prefill` prop: `{ departmentId, plannedTitle, todoId }`
- When `selectedTodo` exists in TodoContext, auto-fill department + goal
- Pass `todoId` when calling `onStart`

**StartParams Extension:**
```typescript
interface StartParams {
  // ... existing fields
  todoId?: string;  // NEW: linked todo ID
}
```

**Session Start API:**
- Accept optional `todo_id` in POST `/sessions/start`
- Set `linked_session_id` on the todo

**Session Complete API:**
- After completing a session (completed_yes), check if linked todo exists
- If yes, mark todo as completed

---

## 4. UI/UX Design

### 4.1 DepartmentTodos Layout

```
┌─────────────────────────────────────────┐
│  TODOS                                  │
│  ┌─────┬─────┬─────┬─────┬─────┐       │
│  │ OPS │ MKT │ COU │ SOC │ R&D │ tabs  │
│  └─────┴─────┴─────┴─────┴─────┘       │
│                                         │
│  ★★★ 修改 validate N 8N          3/4  🔴│
│  ★★  做名片                      3/5    │
│  ★   這個月做影片                 3/10   │
│                                         │
│  ┌─ + Add a todo... ─────────────────┐  │
│  └───────────────────────────────────┘  │
│                                         │
│  ▼ 3 Completed · Clear                  │
│    ✓ 完成 HPV 調查                      │
│    ✓ Order picnic mat                   │
│    ✓ Find clove progress                │
└─────────────────────────────────────────┘
```

### 4.2 Todo Item Anatomy

```
┌──────────────────────────────────────────┐
│ ⠿  ○  ★★★  修改 validate N 8N    3/4 🔴 │
│ ↑  ↑   ↑         ↑                ↑   ↑ │
│ drag  check stars  title         date  due│
│ handle                           today   │
└──────────────────────────────────────────┘
```

### 4.3 Interaction States

- **Hover:** 顯示 drag handle + edit/delete icons
- **Click:** 選中 todo → highlight → auto-fill IdleForm → smooth scroll down
- **Active (linked to running session):** 顯示 pulse 動畫 + "In progress" badge
- **Completed:** 打勾動畫 → 移至 Completed 區塊
- **Dragging:** 半透明 + shadow elevation

### 4.4 Empty State

```
┌─────────────────────────────────┐
│                                 │
│     No todos for this dept.     │
│     Add one below to get        │
│     started!                    │
│                                 │
└─────────────────────────────────┘
```

---

## 5. Dependencies

| Package | Purpose | Version |
|---------|---------|---------|
| `@dnd-kit/core` | Drag & drop primitives | latest |
| `@dnd-kit/sortable` | Sortable list preset | latest |
| `@dnd-kit/utilities` | CSS transform helpers | latest |

All other UI is built with existing stack (Framer Motion, Lucide, TailwindCSS).

---

## 6. Six-Week Implementation Plan

### Week 1: Database + API Foundation

**Goal:** Todo 的 CRUD API 完成並通過測試

| Day | Task | Files |
|-----|------|-------|
| Mon | Design & create `todos` table migration | `supabase/migrations/004_create_todos.sql` |
| Tue | Server: todo routes - GET, POST | `server/src/routes/todos.ts` |
| Wed | Server: todo routes - PATCH, DELETE | `server/src/routes/todos.ts` |
| Thu | Server: reorder endpoint + complete endpoint | `server/src/routes/todos.ts` |
| Fri | Server: clear completed + register routes | `server/src/routes/todos.ts`, `server/src/app.ts` |

**Deliverables:**
- `todos` table in Supabase with RLS
- Full CRUD API at `/api/todos/*`
- Reorder batch endpoint
- Complete todo endpoint

---

### Week 2: Frontend Todo Context + Basic UI

**Goal:** 基礎 todo 列表渲染，可新增/刪除/完成

| Day | Task | Files |
|-----|------|-------|
| Mon | Add `Todo` type to models | `client/src/types/models.ts` |
| Mon | Create `useTodos` hook (fetch + CRUD) | `client/src/hooks/useTodos.ts` |
| Tue | Create `TodoContext` provider | `client/src/contexts/TodoContext.tsx` |
| Wed | Build `TodoItem` component (checkbox, title, stars, date) | `client/src/components/todos/TodoItem.tsx` |
| Thu | Build `TodoInput` component (inline add) | `client/src/components/todos/TodoInput.tsx` |
| Thu | Build `TodoList` component (list + empty state) | `client/src/components/todos/TodoList.tsx` |
| Fri | Build `DepartmentTodos` container (tabs + lists) | `client/src/components/todos/DepartmentTodos.tsx` |

**Deliverables:**
- Todo data layer (context + hook)
- Basic todo list per department with tabs
- Add / complete / delete todos
- Renders on Timer page

---

### Week 3: Due Date, Urgency & Visual Polish

**Goal:** 完整的日期、緊急度功能 + 視覺設計

| Day | Task | Files |
|-----|------|-------|
| Mon | Add date picker to TodoInput (inline) | `TodoInput.tsx`, `TodoDatePicker.tsx` |
| Mon | Add urgency star selector (1-3 stars) | `TodoInput.tsx` |
| Tue | Implement due date conditional styling | `TodoItem.tsx` |
|     | - 今天 = 紅色文字 | |
|     | - 明天 = 橘色標籤 | |
|     | - 逾期 = 紅色 + 刪除線 | |
| Wed | Star display in todo items | `TodoItem.tsx` |
| Wed | Completed section (折疊式 + Clear button) | `TodoList.tsx` |
| Thu | Inline edit mode (雙擊編輯標題) | `TodoItem.tsx` |
| Thu | Edit urgency + due date on existing todos | `TodoItem.tsx` |
| Fri | Visual polish: Framer Motion transitions | All todo components |
|     | - Add/remove animations | |
|     | - Complete checkmark animation | |
|     | - Tab switch transitions | |

**Deliverables:**
- Full date picker with conditional red/orange styling
- 1-3 star urgency selector + display
- Inline editing
- Completed section with clear functionality
- Smooth animations

---

### Week 4: Drag & Drop + Timer Integration

**Goal:** 拖拉排序 + 點擊 todo 自動帶入 Timer

| Day | Task | Files |
|-----|------|-------|
| Mon | Install `@dnd-kit/*` packages | `client/package.json` |
| Mon | Implement sortable TodoList with dnd-kit | `TodoList.tsx`, `TodoItem.tsx` |
| Tue | Optimistic reorder + server sync | `useTodos.ts`, `TodoContext.tsx` |
| Tue | Drag handle UI + drag overlay styling | `TodoItem.tsx` |
| Wed | **Timer Integration: Click-to-Start** | |
|     | - `selectTodo()` in TodoContext | `TodoContext.tsx` |
|     | - IdleForm accepts `prefill` prop | `IdleForm.tsx` |
|     | - Auto-fill department + goal | `IdleForm.tsx` |
|     | - Smooth scroll to form | `TimerPage.tsx` |
| Thu | **Timer Integration: Link todo to session** | |
|     | - Pass `todoId` in StartParams | `types/timer.ts` |
|     | - Send `todo_id` to `/sessions/start` | `useTimer.ts` |
|     | - Server: set `linked_session_id` | `routes/sessions.ts`, `routes/todos.ts` |
| Fri | **Timer Integration: Auto-complete todo** | |
|     | - Server: on session complete, mark linked todo done | `routes/sessions.ts` |
|     | - Client: refresh todo list after completion | `TimerPage.tsx`, `TodoContext.tsx` |
|     | - "In progress" badge on linked todo | `TodoItem.tsx` |

**Deliverables:**
- Drag & drop reordering within each department
- Click todo → auto-fill timer form
- Start session → link to todo
- Complete session → auto-complete todo
- In-progress visual indicator

---

### Week 5: Edge Cases, Error Handling & Polish

**Goal:** 處理邊界情況、錯誤處理、效能優化

| Day | Task | Files |
|-----|------|-------|
| Mon | Handle session cancel → unlink todo (不打勾) | `routes/sessions.ts` |
| Mon | Handle session complete_no → unlink todo (不打勾) | `routes/sessions.ts` |
| Tue | Loading skeletons for todo lists | `DepartmentTodos.tsx` |
| Tue | Optimistic updates for all CRUD ops | `useTodos.ts` |
| Wed | Error toasts for failed operations | All todo components |
| Wed | Rate limiting on todo endpoints | `server/src/app.ts` |
| Thu | Auto-sort: urgency ★★★ first, then by position | `TodoList.tsx` |
| Thu | Overdue todos visual warning | `TodoItem.tsx` |
| Fri | Responsive layout (mobile vs desktop) | All todo components |
| Fri | Accessibility: keyboard navigation, ARIA labels | All todo components |

**Deliverables:**
- Robust error handling
- Loading states
- Optimistic UI
- Cancel/fail session → todo stays active
- Mobile-friendly layout
- Keyboard accessible

---

### Week 6: Testing, Integration & Launch

**Goal:** 全面測試、修 bug、部署

| Day | Task | Files |
|-----|------|-------|
| Mon | Unit tests: todo API routes | `server/src/__tests__/todos.test.ts` |
| Mon | Unit tests: useTodos hook | `client/src/__tests__/useTodos.test.ts` |
| Tue | Integration test: click-to-start flow | E2E test file |
| Tue | Integration test: auto-complete flow | E2E test file |
| Wed | Cross-browser testing (Chrome, Safari, Firefox) | — |
| Wed | Mobile testing (iOS Safari, Android Chrome) | — |
| Thu | Performance profiling (大量 todos 的渲染效能) | — |
| Thu | Bug fixes from testing | Various |
| Fri | Deploy migration to Supabase production | `004_create_todos.sql` |
| Fri | Deploy client + server updates | Vercel + server deploy |
| Fri | Smoke test in production | — |

**Deliverables:**
- Test coverage for API + hooks
- Cross-browser/device verified
- Production deployment
- Feature live

---

## 7. Data Flow Diagrams

### 7.1 Add Todo

```
User types in TodoInput → Enter
  ↓
POST /api/todos { title, department_id, due_date?, urgency? }
  ↓
Server: INSERT into todos table (position = max + 1)
  ↓
Response: { id, title, department_id, ... }
  ↓
Client: optimistic update → append to list
```

### 7.2 Click-to-Start Flow

```
User clicks TodoItem
  ↓
TodoContext.selectTodo(todo)
  ↓
IdleForm receives prefill → auto-set department + goal
  ↓
User adjusts project/duration → clicks "Start Focus"
  ↓
POST /sessions/start { ..., todo_id: todo.id }
  ↓
Server: create session + UPDATE todos SET linked_session_id = session.id
  ↓
Client: timer starts, TodoItem shows "In progress" badge
```

### 7.3 Auto-Complete Flow

```
Timer finishes → CompletionModal
  ↓
User clicks "Yes" (completed_yes)
  ↓
POST /sessions/:id/complete { completed: true }
  ↓
Server:
  1. Complete session (existing)
  2. Find todo WHERE linked_session_id = session.id
  3. UPDATE todo SET is_completed = true, completed_at = now()
  ↓
Response includes: { gamification, todo_completed: true }
  ↓
Client: TodoContext.refresh() → todo moves to "Completed" section with ✓ animation
```

---

## 8. Migration Strategy

### 8.1 Database Migration

- 單一 migration file: `004_create_todos.sql`
- 不影響現有 tables（純新增）
- RLS policy 與 departments/sessions 一致

### 8.2 API Backwards Compatibility

- 新增 `/api/todos/*` routes，不修改現有 endpoints
- `/sessions/start` 新增 optional `todo_id` field（不破壞 existing clients）
- `/sessions/:id/complete` 新增 auto-complete logic（對無 linked todo 的 session 無影響）

### 8.3 Frontend Rollout

- `DepartmentTodos` 在 TimerPage idle state 新增
- 不影響 running/paused/finished/scheduled states
- TodoContext 在 App level wrap（與其他 contexts 並列）

---

## 9. Success Metrics

| Metric | Target |
|--------|--------|
| Todo 使用率 | 每週有 >50% 的 sessions 從 todo 啟動 |
| 完成率 | >70% 從 todo 啟動的 session 標記 completed_yes |
| 平均 todos/user | >5 active todos |
| 日期使用率 | >30% 的 todos 設有 due_date |

---

## 10. Out of Scope (Future)

- 跨部門拖拉 todo
- Todo 重複（recurring）
- Todo 預估時間
- Todo 子任務
- Todo 標籤 / Tags
- Todo 與 Project 關聯
- 通知 / 提醒（push notification for due dates）
- Todo 匯出

---

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Drag & drop 在 mobile 不流暢 | UX 差 | 使用 `@dnd-kit` 的 touch sensor，加上 long-press delay |
| 大量 todos 影響渲染效能 | 卡頓 | 限制顯示 active todos（50 per dept），completed 折疊 |
| 多 tab 同步 | 資料不一致 | 在 tab focus 時 refetch todos（類似現有 timer 做法） |
| 網路錯誤導致 reorder 失敗 | 排序錯亂 | Optimistic update + rollback on error + toast |
