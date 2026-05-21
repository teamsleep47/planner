# Planner — Full Technical Handoff

**Live site:** https://teamsleep47.github.io/planner/  
**Repo:** https://github.com/teamsleep47/planner  
**Local path:** `G:\My Drive\Claude work\HTML\planner`  
**Git bash command:** `cd "/g/My Drive/Claude work/HTML/planner"`  
**Stable tag:** `v1-stable` (tagged before sprint A/B/C/D)  
**Companion tool:** https://teamsleep47.github.io/scf-planner/ (program planning, GPA — keep separate)

---

## User Context

**Name:** Jose Gaona-garcia (GitHub: teamsleep47)  
**Situation:** Radiography pre-req student at State College of Florida  
**Class schedule:** Mon/Wed only  
**Current courses:** Humanities, Written Communication (Summer 2026)  
**Upcoming:** Anatomy & Physiology, A&P Lab, American Government (Fall 2026)  
**Goal:** A personal academic planner that beats commercial options, owns his data, syncs across devices

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | React + Vite | ~70-80% less context cost per fix vs single HTML |
| Routing | HashRouter | Required for GitHub Pages (no server-side routing) |
| Deployment | GitHub Actions → GitHub Pages | Auto-deploys on push to main |
| Auth | Google OAuth implicit flow | Token in localStorage, never in git |
| Sync | Google Drive REST API | Saves `planner_data_v1.json` to user's Drive |
| Styling | Custom CSS + glassmorphism | DM Sans + DM Mono, CSS variables, dark/light + 4 accent schemes |
| State | localStorage only | No backend, no database |

---

## Repository Structure

```
planner/
├── .github/workflows/deploy.yml    ← GitHub Actions (uses VITE_GOOGLE_CLIENT_ID secret)
├── index.html
├── vite.config.js
├── src/
│   ├── App.jsx                     ← MASTER — all routes, ALL_KEYS, hook wiring, sidebar, nav
│   ├── main.jsx                    ← AuthProvider wrapper
│   ├── index.css                   ← All CSS — glassmorphism tokens, responsive breakpoints
│   ├── hooks/
│   │   ├── useAuth.jsx             ← Google OAuth, token persistence, token-expired event
│   │   ├── useDriveSync.js         ← Auto-save to Drive, load on boot, drive-loaded event
│   │   ├── useTheme.js             ← light/dark + 4 color schemes
│   │   ├── useNotifications.js     ← In-app bell + browser push notifications
│   │   └── useCanvas.js            ← Canvas LMS API integration
│   ├── utils/
│   │   ├── storage.js              ← localStorage helpers (prefix: planner_v1_)
│   │   ├── termData.js             ← Term/course data layer, DEFAULT_TERMS, shared course names
│   │   ├── timeFormat.js           ← Relative time formatting ("Due tomorrow by noon")
│   │   ├── srs.js                  ← SM-2 spaced repetition algorithm (Anki-compatible)
│   │   └── testData.js             ← Dev mode test data
│   ├── pages/
│   │   ├── WeeklyHome.jsx          ← Home dashboard — timer, tasks, weather, upcoming assignments
│   │   ├── Courses.jsx             ← Term→Course→Assignment hierarchy (MAIN DATA ENTRY)
│   │   ├── StudySessions.jsx       ← Pomodoro + active recall + weekly goal
│   │   ├── Goals.jsx               ← Habits, recurring tasks, heatmaps, semester goals
│   │   ├── FlashcardsPage.jsx      ← SRS + shuffle flashcards, deck management
│   │   ├── CalendarPage.jsx        ← Day/week/month calendar, drag-to-create blocks
│   │   ├── ResourcesPage.jsx       ← Drive PDF/DOCX/PPTX search, pin by course, upload
│   │   ├── NotesPage.jsx           ← Full course notes editor
│   │   ├── Notes.jsx               ← Quick links page
│   │   ├── CanvasPage.jsx          ← Canvas grades/modules/files
│   │   ├── SettingsPage.jsx        ← Appearance, Canvas token, notifications, data mgmt
│   │   └── LoginPage.jsx           ← Google sign-in
│   └── components/
│       ├── TopBar.jsx              ← Flip clock, quick links, theme panel, save indicator, bell
│       ├── FlipClock.jsx           ← 3D card-flip clock animation
│       ├── NotificationBell.jsx    ← In-app notification dropdown
│       ├── RichNotes.jsx           ← Markdown notes (toolbar + rendered preview + mobile sheet)
│       ├── InlineNotes.jsx         ← Thin wrapper around RichNotes (backward compat)
│       ├── BottomSheet.jsx         ← Mobile full-screen slide-up sheet
│       ├── SidebarMiniTasks.jsx    ← Mini task widget in sidebar (not on Home)
│       ├── SidebarMiniAssignments.jsx ← Mini upcoming assignments in sidebar
│       └── Tooltip.jsx             ← Mouse-following tooltip with lerp smoothing
```

---

## ALL_KEYS — Complete Storage Manifest

Every key here syncs to Drive and is included in export/import JSON.  
**Critical:** Any new feature that saves to localStorage MUST add its key here.

```javascript
// In App.jsx — also auto-discovers any new planner_v1_* keys via getFullKeyList()
const ALL_KEYS = [
  // Core
  'home_tasks', 'study_sessions', 'habit_grid', 'habit_history',
  'timer_settings', 'streak', 'study_week_goal', 'sem_end_date',
  // Terms/courses/assignments
  'terms_v1',
  // Legacy (kept for compatibility)
  'assignments',
  // Notes
  'course_notes', 'full_course_notes',
  // UI / preferences
  'quick_links', 'page_links', 'weather_city', 'scheme', 'theme',
  // Flashcards
  'flashcard_decks', 'flashcard_cards',
  // Habits + recurring
  'habits_config', 'recurring_tasks', 'rec_history', 'goals_config',
  // Calendar
  'calendar_blocks',
  // Notifications
  'notification_settings',
  // Resources
  'saved_resources', 'resource_sort',
]
```

**Keys stored outside planner_v1_ prefix (not in export):**
- `planner_token_v1` — Google OAuth token
- `planner_profile_v1` — Google profile
- `planner_hint_v1` — Google login hint (email for silent re-auth)
- `canvas_token_v1` — Canvas API token
- `canvas_url_v1` — Canvas base URL
- `canvas_ical_v1` — Canvas iCal URL
- `canvas_warned_v1` — Security warning dismissed flag
- `planner_weather_cache` — sessionStorage, not persisted

---

## Data Schemas

### Terms (key: `terms_v1`)
```javascript
[{
  id: "t1",
  name: "Summer 2026",
  active: true,              // Only one term is active at a time
  courses: [{
    id: "c1",
    name: "Humanities",
    instructor: "",
    days: "Mon / Wed",
    time: "",
    room: "",
    credits: 3,
    gradeTarget: 90,
    color: "#6366f1",
    notes: "",
    assignments: [{
      id: "a1",
      title: "Discussion Post Week 1",
      type: "Discussion Post",  // Essay|Discussion Post|Reading Response|Quiz|Exam|Lab Report|Other
      due: "2026-05-26",        // YYYY-MM-DD
      dueTime: "23:59",         // HH:MM optional
      status: "To do",          // To do|In progress|Done
      priority: "none",         // none|low|medium|high|urgent
      notes: "",                // Markdown supported
    }]
  }]
}]
```

### Home Tasks (key: `home_tasks`)
```javascript
[{
  id: 1,
  text: "Read ahead — Humanities Ch.1",
  course: "HUM",              // Short code, matches COURSE_COLORS
  done: false,
  urgency: "low",             // none|low|medium|high (ring color)
  due: "2026-05-26",          // Optional
}]
```

### Flashcard Decks (key: `flashcard_decks`)
```javascript
[{ id: "abc123", name: "A&P Chapter 1", course: "Anatomy & Physiology", created: "ISO date" }]
```

### Flashcard Cards (key: `flashcard_cards`)
```javascript
[{
  id: "xyz789",
  front: "What is the axial skeleton?",
  back: "Skull, vertebral column, and rib cage",
  deckId: "abc123",
  interval: 1,          // SM-2: days until next review
  easeFactor: 2.5,      // SM-2: difficulty multiplier
  repetitions: 0,       // SM-2: successful review count
  nextReview: "2026-05-21",   // YYYY-MM-DD
  lastReview: null,
}]
```

### Calendar Blocks (key: `calendar_blocks`)
```javascript
[{
  id: "blk1",
  title: "A&P Study Session",
  date: "2026-05-21",
  startHour: 9,         // 6-22 (6am to 10pm)
  endHour: 11,
  color: "#6366f1",
  allDay: false,
}]
```

### Habits Config (key: `habits_config`)
```javascript
[{ id: "h1", label: "Study on off-days", emoji: "📚", desc: "Tue, Thu, Fri, Sat, Sun" }]
```

### Recurring Tasks (key: `recurring_tasks`)
```javascript
[{
  id: "r1",
  label: "Review flashcards",
  emoji: "🃏",
  recurrence: "daily",        // daily|every-n-days|weekly
  intervalDays: 1,            // used when recurrence = every-n-days
  daysOfWeek: [],             // [0-6] used when recurrence = weekly (Mon=0)
}]
```

---

## Authentication Flow

```
App loads → useAuth checks localStorage for token
  → token found → validate via Google userinfo API
    → valid → load profile, start 55min refresh timer
    → 401 → dispatch 'token-expired' event → redirect to OAuth
  → no token → show LoginPage

LoginPage → window.location.href = buildOauthUrl(hint)
  → Google OAuth popup → redirect back with #access_token=...
  → useAuth.handleCallback() → save token → boot app

Token expiry recovery:
  → useDriveSync gets 401 → dispatches 'token-expired'
  → useAuth listener → checks for saved login hint (email)
    → hint exists → silent re-auth redirect (user doesn't see login page)
    → no hint → show LoginPage
```

**Google Cloud Console:**
- Client ID: `1057441350764-v6i3b7qi884kda318uev0s90cs1v4fk6.apps.googleusercontent.com`
- Authorized JS origin: `https://teamsleep47.github.io`
- Authorized redirect URI: `https://teamsleep47.github.io/planner/`
- Scopes: `drive.file`, `userinfo.profile`, `userinfo.email`

---

## Drive Sync Flow

```
User changes data → save(key, value) → triggers onDataChange()
  → useDriveSync debounces 1.5s → getAllData() collects all keys
  → finds or creates planner_data_v1.json in Drive
  → PATCH file with full JSON blob
  → logs "[drive] saved ok"

App boot → useDriveSync.loadFromDrive()
  → fetches planner_data_v1.json
  → setAllData() writes all keys to localStorage
  → dispatches 'drive-loaded' event
  → driveKey increments → all pages re-render with fresh data
```

---

## Canvas Integration

**Base URL:** `https://scf.instructure.com` (user-configurable in Settings)  
**Token:** Stored in `canvas_token_v1` localStorage only, never in code  
**CORS risk:** Canvas may block requests from `teamsleep47.github.io` — iCal import always works, API features may not  

**Feature toggles (localStorage):**
- `canvas_grades` — grade sync on/off
- `canvas_modules` — module progress on/off
- `canvas_files` — file access on/off
- `canvas_ical` — iCal import on/off

---

## Design System

```css
/* Fonts */
--font-main: 'DM Sans'
--font-mono: 'DM Mono'

/* Accent schemes */
indigo:  #6366f1  (default)
teal:    #14b8a6
rose:    #f43f5e
amber:   #f59e0b

/* Key CSS variables */
--bg-base, --glass-bg, --glass-bg-2, --glass-border
--text-1, --text-2, --text-3
--accent, --accent-dim, --accent-glow
--radius-sm, --radius-md, --radius-lg, --radius-xl
--blur, --blur-sm, --shadow

/* Breakpoints */
Mobile: max-width 768px — sidebar becomes drawer, bottom nav removed
Very small: max-width 400px — tighter padding
```

---

## Navigation Structure

```
Sidebar nav:
  Dashboard    → /
  Assignments  → /courses
  Study        → /study
  Habits       → /goals
  Resources:
    Quick links  → /links
    Course notes → /notes
    Canvas       → /canvas
    Resources    → /resources
    Flashcards   → /flashcards
    Calendar     → /calendar
    Settings     → /settings

Mobile: sidebar accessed via hamburger, no bottom nav
```

---

## Recurring Bug Patterns & Fixes

### 1. `notifs is not defined` (CRITICAL — happens often)
**Cause:** App.jsx is replaced but the `useNotifications()` call is missing  
**Symptom:** Site is completely blank, console shows `ReferenceError: notifs is not defined`  
**Fix:** Run in Git Bash:
```bash
sed -i 's/const { syncToDrive, saveState, synced } = useDriveSync()/const { syncToDrive, saveState, synced } = useDriveSync()\n  const { notifs, unread, markAllRead, clearNotif } = useNotifications()/' src/App.jsx
git add src/App.jsx && git commit -m "fix notifs" && git push
```

### 2. Blank page — missing Route
**Cause:** Component imported and added to nav but `<Route>` not added to `<Routes>` block  
**Symptom:** Page is blank, no console errors  
**Fix:** Check `grep "Route path" src/App.jsx` — verify the route exists  
**Prevention:** When adding a new page, always add import + nav item + Route in same commit

### 3. Old bundle serving (cache)
**Cause:** GitHub Pages serves cached JS after deploy  
**Symptom:** New JS hash not loading  
**Fix:** Lock icon → Site settings → Clear data → reload  
**Verify:** Check JS filename in Network tab — hash should match latest build

### 4. Drive sync 401 loop
**Cause:** Google OAuth token expired (1hr limit)  
**Symptom:** `[drive] load error: HTTP 401` in console  
**Fix:** Sign out and sign back in. Auto-recovery fires if login hint is saved.

### 5. Python sed patch misses (when editing App.jsx programmatically)
**Cause:** Whitespace/indentation mismatch in search string  
**Fix:** Always verify patch applied: `grep -n "target string" src/App.jsx`  
**Better:** Use `python3` with exact string matching, not shell `sed`

---

## Deployment

```yaml
# .github/workflows/deploy.yml
# Triggers on push to main
# Uses secret: VITE_GOOGLE_CLIENT_ID
# Runs: npm ci → npm run build → deploys dist/ to gh-pages branch
```

**To deploy:** Push to main. GitHub Actions handles everything.  
**To force redeploy:** Actions tab → Deploy to GitHub Pages → Run workflow  
**Stable restore point:** `git checkout v1-stable`  
**Nuclear rollback:** `git reset --hard v1-stable && git push origin main --force`

---

## Features Inventory

| Feature | Status | Location |
|---------|--------|----------|
| Flip clock | ✅ | TopBar → FlipClock.jsx |
| Weather (7-day) | ✅ | WeeklyHome.jsx (Open-Meteo API) |
| Today's tasks | ✅ | WeeklyHome.jsx |
| Pomodoro timer | ✅ | WeeklyHome.jsx |
| Upcoming assignments | ✅ | WeeklyHome.jsx (priority-sorted) |
| Semester countdown | ✅ | WeeklyHome.jsx (editable date) |
| Term/course/assignment hierarchy | ✅ | Courses.jsx |
| Assignment priority pills | ✅ | Courses.jsx |
| Assignment editing | ✅ | Courses.jsx (inline) |
| Relative timestamps | ✅ | timeFormat.js |
| Habit tracker | ✅ | Goals.jsx (editable) |
| 30-day heatmap | ✅ | Goals.jsx |
| Recurring tasks | ✅ | Goals.jsx (daily/nDays/weekly) |
| Recurring task heatmap | ✅ | Goals.jsx |
| Semester goals | ✅ | Goals.jsx (editable) |
| Flashcards SRS | ✅ | FlashcardsPage.jsx (SM-2) |
| Flashcards shuffle | ✅ | FlashcardsPage.jsx |
| Card import (front>back) | ✅ | FlashcardsPage.jsx |
| Calendar day/week/month | ✅ | CalendarPage.jsx |
| Drag-to-create blocks | ✅ | CalendarPage.jsx |
| Resources (Drive search) | ✅ | ResourcesPage.jsx |
| Resources (upload to Drive) | ✅ | ResourcesPage.jsx |
| Canvas iCal import | ✅ | SettingsPage.jsx |
| Canvas grade sync | ✅ | CanvasPage.jsx (CORS-dependent) |
| Canvas module progress | ✅ | CanvasPage.jsx (CORS-dependent) |
| Rich notes (markdown) | ✅ | RichNotes.jsx |
| Course notes | ✅ | NotesPage.jsx |
| In-app notifications | ✅ | NotificationBell.jsx |
| Browser push notifications | ✅ | useNotifications.js |
| Google Drive sync | ✅ | useDriveSync.js |
| Export/import JSON | ✅ | TopBar.jsx + future-proof |
| Sidebar mini tasks | ✅ | SidebarMiniTasks.jsx |
| Sidebar mini assignments | ✅ | SidebarMiniAssignments.jsx |
| Mobile bottom sheets | ✅ | BottomSheet.jsx |
| Dark/light + 4 accents | ✅ | useTheme.js |
| Mouse-following tooltips | ✅ | Tooltip.jsx |

---

## Known Limitations / Future Work

- **Canvas CORS:** Grade sync and module progress may be blocked by SCF's CORS policy. iCal import is always safe.
- **Exam countdown on Home:** Currently auto-detects from assignments. Override not yet built.
- **Mini calendar on Home:** Only a week strip exists. A mini month widget was discussed but not built.
- **Eisenhower Matrix:** Discussed, not built.
- **Grade calculator:** Discussed, decided against for now.
- **Mind mapping:** Discussed, deferred (overkill for current semester).
- **Mobile design:** Functional but still iterating — some pages need more mobile polish.
- **SRS deck sync:** Cards sync via Drive JSON. Heavy card libraries (500+) may make the JSON blob large.

---

## Development Workflow

```bash
# Start dev server
cd "/g/My Drive/Claude work/HTML/planner"
npm run dev

# Build and check for errors
npm run build

# Deploy (just push to main)
git add .
git commit -m "description"
git push

# Tag a stable checkpoint
git tag -a v2-stable -m "description"
git push origin v2-stable

# Restore to stable
git checkout v2-stable
# or full rollback:
git reset --hard v2-stable && git push origin main --force
```

---

## Claude-Specific Notes

1. **Always bake `useNotifications()` into App.jsx** — the Python sed patch often misses it. Verify with `grep -n "useNotifications()" src/App.jsx` before pushing.

2. **When adding a new page**, do all three in one commit:
   - Add import at top of App.jsx
   - Add nav item to NAV array
   - Add `<Route path="..." element={...}/>` inside `<Routes>`

3. **When adding a new localStorage key**, add it to `ALL_KEYS` in App.jsx in the same commit.

4. **React components using useLocation/useNavigate** must be rendered inside `<HashRouter>`. Define them outside but only render them inside the router tree.

5. **Python string patching** — always verify the patch applied. If `str.replace()` returns the same string, the search didn't match (usually whitespace/indent mismatch).

6. **Build hash changes** mean the deploy worked. If the live site shows the old hash after clearing cache, check GitHub Actions for a failed run.

7. **The transcript file** at `/mnt/transcripts/` contains the full conversation history if context is needed.
