# CLAUDE.md — Academic Planner (teamsleep47/planner)

Auto-read by Claude Code at session start. Keep this file accurate.

---

## Project identity
- **Owner:** Jose Gaona-garcia (teamsleep47), radiography pre-req student at State College of Florida
- **Live URL:** https://teamsleep47.github.io/planner
- **Repo:** https://github.com/teamsleep47/planner
- **Local path (Git Bash):** `/g/My Drive/Claude work/HTML/planner`

---

## Tech stack
- React 18 + Vite, React Router v6 (HashRouter — required for GitHub Pages)
- Lucide icons, DM Sans + DM Mono fonts
- localStorage for all data (prefix: `planner_v1_`)
- Google OAuth2 implicit flow → token stored in `planner_token_v1`
- Google Drive REST sync via `useDriveSync.js` — saves all data as a single JSON file
- GitHub Actions auto-deploys on push to `main` (see `.github/workflows/deploy.yml`)
- Secret `VITE_GOOGLE_CLIENT_ID` set in GitHub repo settings

---

## CRITICAL RULES — violations cause silent failures or blank sites

### 1. useNotifications() must always be called in App.jsx
```bash
grep -n "useNotifications()" src/App.jsx
```
If missing → site goes completely blank with no useful console error. Check after every App.jsx edit.

### 2. HashRouter is required — never BrowserRouter
GitHub Pages has no server-side routing. `BrowserRouter` breaks all navigation on reload.

### 3. ALL_KEYS in TopBar.jsx must stay in sync with App.jsx
`App.jsx` has the authoritative `ALL_KEYS` array used for export/import and Drive sync.
`TopBar.jsx` has its own `ALL_KEYS` for export — they must match.
Adding a new localStorage key → add it to both immediately.

### 4. Build before pushing
```bash
npm run build
```
Never push code that doesn't build clean. Check for TypeScript/lint errors in the output.

### 5. Never use alert()
Replace all `alert()` calls with inline error states or toast banners. The codebase must have zero `alert(` calls.

### 6. Calendar plan writes use load/save helpers
Never write to `calendar_blocks` via raw `localStorage`. Always use `load()`/`save()` from `src/utils/storage.js`.

### 7. TaskRow defined outside parent component
If `TaskRow` (or any row component with inputs) is defined inside its parent, React re-mounts it on every keystroke, causing cursor-jump. Always define such components at module scope.

### 8. Inline styles override CSS media queries
For responsive behavior, use CSS classes (defined in `index.css`) not inline styles. Inline styles win over media queries and break mobile layouts.

---

## File structure
```
src/
  App.jsx                    — shell, routing, auth, Drive sync, ALL_KEYS
  index.css                  — all design tokens, themes, component styles
  main.jsx                   — entry point, applies saved theme/scheme before render
  hooks/
    useAuth.jsx              — Google OAuth implicit flow, token/profile management
    useDriveSync.js          — Drive read on boot, debounced write on data change
    useNotifications.js      — in-app + browser push notification system
    useTheme.js              — theme (dark/light) + scheme (indigo only) persistence
    useCanvas.js             — Canvas LMS API helpers
  pages/
    WeeklyHome.jsx           — dashboard: tasks, Pomodoro timer, weather, upcoming
    Courses.jsx              — terms → courses → assignments (master data structure)
    CalendarPage.jsx         — day/week/month calendar with draggable blocks
    Goals.jsx                — habits, recurring tasks, streak heatmap
    StudySessions.jsx        — study session logger
    FlashcardsPage.jsx       — flashcard decks with spaced repetition (SM-2)
    Notes.jsx                — quick links page (/links route)
    NotesPage.jsx            — rich course notes (/notes route)
    ResourcesPage.jsx        — Google Drive file browser + saved resources
    CanvasPage.jsx           — Canvas LMS integration (grades, modules, files)
    SettingsPage.jsx         — Canvas token, features, data wipe
    LoginPage.jsx            — Google sign-in screen
  components/
    TopBar.jsx               — desktop header: clock, quick links, theme toggle, settings nav
    NotificationBell.jsx     — in-app notification dropdown
    SidebarMiniTasks.jsx     — sidebar widget: today's tasks
    SidebarMiniAssignments.jsx — sidebar widget: upcoming assignments
    FlipClock.jsx            — animated digital clock
    Tooltip.jsx              — hover tooltip wrapper
    RichNotes.jsx            — markdown editor/preview
    BottomSheet.jsx          — mobile bottom sheet modal
  utils/
    storage.js               — load(key, fallback) / save(key, value) with planner_v1_ prefix
    termData.js              — terms/courses/assignments data layer, DEFAULT_TERMS
    timeFormat.js            — relative due date formatting
    testData.js              — dev mode test data
```

---

## Data architecture

### Master data: `terms_v1` (localStorage key: `planner_v1_terms_v1`)
```js
[
  {
    id: 't1',
    name: 'Summer 2026',
    active: true,          // only one term is active at a time
    courses: [
      {
        id: 'c1',
        name: 'Humanities',
        instructor: '',
        days: 'Mon / Wed',
        time: '',
        room: '',
        credits: 3,
        gradeTarget: 90,
        color: '#6366f1',  // used for assignment dots, pills, calendar display
        notes: '',
        assignments: [
          {
            id: 'a1',
            title: 'Essay 1',
            type: 'Essay',
            due: '2026-07-25',   // ISO date string YYYY-MM-DD
            status: 'To do',     // 'To do' | 'In progress' | 'Done'
            priority: 'medium',  // 'none' | 'low' | 'medium' | 'high' | 'urgent'
            notes: '',
            url: '',             // optional reference link
          }
        ]
      }
    ]
  }
]
```

### Calendar blocks: `calendar_blocks` (localStorage key: `planner_v1_calendar_blocks`)
```js
[
  {
    id: 'abc123',
    title: 'Study session',
    date: '2026-07-21',    // ISO date string
    startHour: 9,          // 6–22
    endHour: 11,
    color: '#6366f1',
    allDay: false,
    done: false,           // completion checkbox
    url: '',               // optional reference link
  }
]
```

### ALL_KEYS (must match in App.jsx and TopBar.jsx)
```js
[
  'home_tasks', 'study_sessions', 'habit_grid', 'habit_history',
  'timer_settings', 'streak', 'study_week_goal', 'sem_end_date',
  'terms_v1', 'assignments',
  'habits_config', 'recurring_tasks', 'rec_history', 'goals_config',
  'course_notes', 'full_course_notes',
  'quick_links', 'page_links', 'weather_city', 'scheme', 'theme',
  'flashcard_decks', 'flashcard_cards',
  'calendar_blocks',
  'notification_settings',
  'saved_resources', 'resource_sort',
]
```

---

## Design system

### Themes
- **Dark:** `[data-theme="dark"]` — deep navy base (`#02202f`), warm sand glass borders
- **Light:** `[data-theme="light"]` — white base, teal/navy text from brand palette
- Applied via `document.documentElement.setAttribute('data-theme', theme)`
- Single accent scheme: `indigo` — `--accent: #818cf8`, applied permanently

### CSS variables (key ones)
```
--accent, --accent-2, --accent-dim, --accent-glow
--glass-bg, --glass-bg-2, --glass-border, --glass-hover
--blur, --blur-sm
--text-1, --text-2, --text-3
--shadow, --shadow-sm
--radius-sm, --radius-md, --radius-lg, --radius-xl  (all 0px — squared off)
--teal, --amber, --coral, --green (+ -dim variants, used for status colors)
--gloss  (card gloss overlay gradient)
```

### Card pattern (liquid glass)
```css
.card {
  background: var(--glass-bg);
  backdrop-filter: var(--blur);
  border: 1px solid var(--glass-border);
  position: relative; overflow: hidden;
}
.card::before {
  content: ''; position: absolute; inset: 0;
  background: var(--gloss); pointer-events: none; z-index: 0;
}
.card > * { position: relative; z-index: 1; }
```

### Corner radius
All radii are `0px` — the site uses squared corners everywhere. Do not add `borderRadius` to new components without explicit instruction.

---

## Common patterns

### Adding a new page
All three must be in the same commit:
1. `import NewPage from './pages/NewPage.jsx'` in App.jsx
2. Nav item in the `NAV` array in App.jsx
3. `<Route path="/new-page" element={<NewPage key={driveKey} onDataChange={handleDataChange}/>}/>` in App.jsx
4. Add any new localStorage key to `ALL_KEYS` in both App.jsx and TopBar.jsx

### Dispatching data change events
After mutating localStorage data, always fire both:
```js
onDataChange?.()                                    // triggers Drive sync
window.dispatchEvent(new Event('assignments-updated'))  // if assignments changed
```

### Refreshing calendar from external changes
`CalendarPage.jsx` listens for `drive-loaded` and `assignments-updated` events to re-read `dotMap`. Always dispatch `assignments-updated` when Courses.jsx saves assignment data.

### Error display (no alert())
```jsx
const [flashMsg, setFlashMsg] = useState(null)
const flash = (text, type='error') => {
  setFlashMsg({text,type})
  setTimeout(()=>setFlashMsg(null), 3000)
}
// Render at bottom of component:
{flashMsg && (
  <div style={{
    position:'fixed', bottom:20, left:'50%', transform:'translateX(-50%)',
    padding:'10px 20px',
    background: flashMsg.type==='error' ? 'var(--coral-dim)' : 'var(--green-dim)',
    border: `1px solid ${flashMsg.type==='error' ? 'var(--coral)' : 'var(--green)'}`,
    color: flashMsg.type==='error' ? 'var(--coral)' : 'var(--green)',
    fontSize:13, fontWeight:600, zIndex:9999, boxShadow:'var(--shadow)',
  }}>
    {flashMsg.text}
  </div>
)}
```

### Weather fetch (WeeklyHome.jsx)
Uses Open-Meteo (free, no key needed). Bradenton fallback coords: `lat: 27.4989, lng: -82.5748`.
Cache in `sessionStorage` under `planner_weather_cache` to avoid repeat fetches.

---

## Header layout (TopBar.jsx — desktop)
Left to right in `top-bar-right`:
1. Notification bell
2. Quick link chips (draggable, open modal editor via pencil icon)
3. Theme toggle pill (🌙/☀️)
4. Settings icon → navigates to `/settings`

Mobile header has: hamburger | "Planner" title | theme toggle pill | avatar dropdown (with settings nav item)

---

## Known issues / lessons learned
- **Drive sync boot race:** `useDriveSync` fires `drive-loaded` after loading — pages must listen for this event rather than assuming data is ready on mount
- **Calendar dot map stale:** `getAssignmentDots()` was a one-time snapshot; now reactive via event listeners
- **node_modules on Drive:** If npm install fails with write conflicts, clone fresh to `/tmp` outside Google Drive, build there, copy `dist/` back
- **After deploy:** Hard refresh (Ctrl+Shift+R) required to bust cached assets

---

## Git workflow
```bash
cd "/g/My Drive/Claude work/HTML/planner"
git add -A
git commit -m "feat: description"
git push origin main
# If diverged: git pull --rebase && git push
```
Push to `main` → GitHub Actions builds and deploys automatically (~90 seconds).
