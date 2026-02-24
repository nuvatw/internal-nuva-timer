# PRD: Session 時間編輯後顯示未更新 Bug 修復

## 問題描述

使用者在 Review 頁面的 SessionDetailPanel 中編輯 session 時間（例如將 10:22 改為 10:00 ~ 10:30），API 回傳成功並顯示 "Session updated" toast，但面板上顯示的時間仍然是舊值 10:22，需要關閉面板重新點擊才會看到更新後的時間。

---

## 根因分析

### Bug #1（主因）：`selectedSession` 狀態未同步更新

**影響程度：HIGH**

資料流：

```
使用者點擊 Save
  → api.patch() 成功
  → toast.success("Session updated")
  → onUpdated() → fetchData()
  → setSessions(sessionsData)  ✅ sessions 陣列已更新
  → selectedSession 仍是舊物件 ❌ 未更新
  → SessionDetailPanel 顯示舊資料
```

**關鍵程式碼：**

| 檔案 | 行號 | 問題 |
|------|------|------|
| `client/src/pages/ReviewPage.tsx` | 61 | `selectedSession` 是獨立的 state，不會隨 `sessions` 陣列自動更新 |
| `client/src/pages/ReviewPage.tsx` | 96-111 | `fetchData()` 只呼叫 `setSessions()`，未更新 `selectedSession` |
| `client/src/components/SessionDetailPanel.tsx` | 187-189 | `handleSave` 成功後呼叫 `onUpdated()`（即 `fetchData`），但 panel 接收的 `session` prop 仍是舊參考 |

**為什麼 React 不會自動更新？**

`selectedSession` 和 `sessions` 是兩個獨立的 state。`setSessions(newArray)` 更新陣列後，`selectedSession` 仍指向原始物件的記憶體參考。React 不會因為陣列中有一個 ID 相同的物件就自動更新另一個 state。

---

### Bug #2（次因）：時區硬編碼

**影響程度：MEDIUM**

```typescript
// SessionDetailPanel.tsx:176-177
const started_at = `${editDate}T${editStartTime}:00+08:00`;
const ended_at   = `${editDate}T${editEndTime}:00+08:00`;
```

前端將時間硬編碼為 `+08:00`（Asia/Taipei）。目前使用者都在台灣所以功能正常，但屬於技術債。若未來支援多時區會壞掉。

後端處理也有冗餘轉換：

```typescript
// server/src/routes/sessions.ts:476,481
updates.started_at = d.toISOString(); // 再轉一次 UTC，PostgreSQL TIMESTAMPTZ 會自行處理
```

目前不會造成時間偏移（`+08:00` → UTC → 存入 DB → 取出時用 Asia/Taipei 格式化 → 顯示正確），但增加了理解和維護成本。

---

## 修復方案

### Task 1：修復 `selectedSession` 同步問題（P0）

**檔案：** `client/src/pages/ReviewPage.tsx`

**方案：** 在 `fetchData` 完成後，用新資料更新 `selectedSession`。

```typescript
// ReviewPage.tsx — fetchData callback
const fetchData = useCallback(async () => {
  setLoading(true);
  try {
    const qs = buildQueryParams(dateRange.start, dateRange.end, filters);
    const [summaryData, sessionsData] = await Promise.all([
      api.get<Summary>(`/reports/summary?${qs}`),
      api.get<Session[]>(`/sessions?${qs}`),
    ]);
    setSummary(summaryData);
    setSessions(sessionsData);

    // ✅ 同步更新 selectedSession
    setSelectedSession((prev) => {
      if (!prev) return null;
      return sessionsData.find((s) => s.id === prev.id) ?? null;
    });
  } catch {
    setSummary(null);
    setSessions([]);
  }
  setLoading(false);
}, [dateRange.start, dateRange.end, filters]);
```

**為什麼用 `setSelectedSession(prev => ...)` 而不是直接引用 `selectedSession`？**

避免將 `selectedSession` 加入 `useCallback` 的依賴陣列，否則每次選擇 session 都會重建 `fetchData`，導致 `useEffect` 無限觸發重新請求。

### Task 2：替代方案 — 用 API 回傳值直接更新（可選優化）

**檔案：** `client/src/components/SessionDetailPanel.tsx`

目前 `handleSave` 呼叫 `api.patch()` 後丟棄回傳值。可以直接用回傳的更新資料刷新 panel，減少一次 API round-trip：

```typescript
const handleSave = useCallback(async () => {
  if (!session) return;
  setSaving(true);
  try {
    const started_at = `${editDate}T${editStartTime}:00+08:00`;
    const ended_at = `${editDate}T${editEndTime}:00+08:00`;

    const updated = await api.patch<Session>(`/sessions/${session.id}`, {
      department_id: editDeptId,
      project_id: editProjId,
      started_at,
      ended_at,
      duration_minutes: editDuration,
      notes: editNotes.trim() || null,
    });

    toast.success("Session updated");
    setEditing(false);
    onUpdated(updated); // 傳回更新後的 session
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Failed to save");
  }
  setSaving(false);
}, [/* deps */]);
```

**注意：** 此方案需要修改 `onUpdated` 的型別簽名和 ReviewPage 的處理邏輯，增加了改動範圍。Task 1 已經足夠解決問題，此項為可選優化。

### Task 3：清理時區硬編碼（P2，技術債）

目前不影響功能，可排入後續迭代。主要改動：
- 前端使用 `Intl.DateTimeFormat` 或 `date-fns-tz` 動態取得使用者時區
- 後端直接將前端傳入的 ISO 字串寫入 DB，不做多餘的 `toISOString()` 轉換

---

## 實作範圍

| Task | 檔案 | 改動量 | 優先級 |
|------|------|--------|--------|
| 1. 修復 selectedSession 同步 | `ReviewPage.tsx` | ~5 行 | P0 |
| 2. 用 API 回傳值直接更新 | `SessionDetailPanel.tsx`, `ReviewPage.tsx` | ~15 行 | P1（可選） |
| 3. 清理時區硬編碼 | `SessionDetailPanel.tsx`, `sessions.ts` | ~10 行 | P2（技術債） |

---

## 測試計畫

### 手動測試
1. 在 Review 頁面點擊任一 completed session
2. 點擊編輯，修改 start_time 和 end_time
3. 點擊 Save
4. **驗證：** 面板立即顯示更新後的時間，無需關閉重開
5. **驗證：** 左側 session 列表中的時間也同步更新
6. 關閉面板，重新點擊同一 session，確認時間仍是更新後的值

### 邊界情況
- 編輯後 session 被刪除（filter 改變導致不在列表中）→ panel 應自動關閉
- 同時修改時間和 notes → 所有欄位都應正確更新
- 快速連續編輯兩次 → 第二次應基於第一次的結果
