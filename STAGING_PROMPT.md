# Planner App — Redesign & Feature Overhaul Staging Prompt
**For use with Claude Code. Read CLAUDE.md and HANDOFF.md first.**

---

## CRITICAL RULES (never violate)
1. After ANY edit to `src/App.jsx`, run: `grep -n "useNotifications()" src/App.jsx` — must be present or site goes blank.
2. HashRouter required — never change to BrowserRouter.
3. `ALL_KEYS` in `TopBar.jsx` must stay in sync with `App.jsx`.
4. Build locally before pushing: `npm run build` must succeed clean.
5. Never use `alert()` anywhere.

---

## SESSION GOAL
A large multi-part overhaul. Tackle each section in order. Build and verify locally after completing each major section before moving to the next.

---

## SECTION 1 — Theme Redesign

### New color palettes (replace existing theme variables in `src/index.css`)

**Light theme** — source: huemint.com/brand-intersection
```css
[data-theme="light"] {
  /* Base palette from Huemint */
  --bg-base:      #ffffff;
  --bg-mesh-1:    #f0f4f7;
  --bg-mesh-2:    #e8f2f7;
  --bg-mesh-3:    #f5f8fa;

  /* Glass surfaces */
  --glass-bg:     rgba(255,255,255,0.60);
  --glass-bg-2:   rgba(255,255,255,0.82);
  --glass-border: rgba(31,60,76,0.12);
  --glass-hover:  rgba(255,255,255,0.92);

  /* Blur */
  --blur:         blur(20px);
  --blur-sm:      blur(10px);

  /* Text — using palette's dark navy */
  --text-1:       #04070e;
  --text-2:       #1f3c4c;
  --text-3:       #6a8a9a;

  /* Shadows */
  --shadow:       0 8px 32px rgba(4,7,14,0.10);
  --shadow-sm:    0 2px 12px rgba(4,7,14,0.06);

  /* Flip clock */
  --flip-bg:      rgba(4,7,14,0.07);
  --flip-border:  rgba(4,7,14,0.12);

  /* Card gloss highlight (new) */
  --gloss:        linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.1) 60%);

  /* Primary brand mid — used for panels/dropdowns */
  --panel-bg:     #ffffff;
  --panel-border: rgba(4,7,14,0.12);
}
```

**Dark theme** — source: huemint.com/brand-2
```css
[data-theme="dark"] {
  /* Base palette from Huemint */
  --bg-base:      #02202f;
  --bg-mesh-1:    #051c28;
  --bg-mesh-2:    #03182a;
  --bg-mesh-3:    #011820;

  /* Glass surfaces */
  --glass-bg:     rgba(203,183,151,0.04);
  --glass-bg-2:   rgba(203,183,151,0.08);
  --glass-border: rgba(203,183,151,0.12);
  --glass-hover:  rgba(203,183,151,0.13);

  /* Blur */
  --blur:         blur(20px);
  --blur-sm:      blur(10px);

  /* Text */
  --text-1:       #e8ddd0;
  --text-2:       #a89880;
  --text-3:       #636070;

  /* Shadows */
  --shadow:       0 8px 32px rgba(2,32,47,0.6);
  --shadow-sm:    0 2px 12px rgba(2,32,47,0.4);

  /* Flip clock */
  --flip-bg:      rgba(203,183,151,0.07);
  --flip-border:  rgba(203,183,151,0.14);

  /* Card gloss (subtle warm shimmer) */
  --gloss:        linear-gradient(135deg, rgba(203,183,151,0.10) 0%, rgba(203,183,151,0.02) 60%);

  /* Panel */
  --panel-bg:     #051c28;
  --panel-border: rgba(203,183,151,0.14);
}
```

Also remove all accent color scheme options — only `indigo` scheme will remain as the sole scheme. Remove `[data-scheme="teal"]`, `[data-scheme="rose"]`, `[data-scheme="amber"]` from `index.css`. Keep `[data-scheme="indigo"]` as-is (accent is still user-facing indigo). Remove `SCHEMES`, `SCHEME_COLORS`, `setScheme` props everywhere they're passed — App.jsx, TopBar.jsx, SettingsPage.jsx, MobileHeader. Replace with just the single scheme applied.

> NOTE: Keep `--teal`, `--amber`, `--coral`, `--green` and their `-dim` variants — they're used for status badges and notifications.

---

## SECTION 2 — Liquid Glass Cards + Square Corners

### Global corner radius change
In `src/index.css`, change:
```css
--radius-sm:  0px;    /* was 8px */
--radius-md:  0px;    /* was 12px */
--radius-lg:  0px;    /* was 18px */
--radius-xl:  0px;    /* was 24px */
```
This squares off every card, modal, chip, button, and panel site-wide.

### Liquid glass card effect
Update `.card` and `.stat-card` in `index.css`:
```css
.card {
  background: var(--glass-bg);
  backdrop-filter: var(--blur);
  -webkit-backdrop-filter: var(--blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);   /* will now be 0 */
  padding: 20px 22px;
  position: relative;
  overflow: hidden;
  transition: border-color .2s, box-shadow .2s;
}
/* Gloss highlight overlay */
.card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--gloss);
  pointer-events: none;
  z-index: 0;
}
.card > * { position: relative; z-index: 1; }
```
Apply same `::before` gloss pattern to `.stat-card`.

For **dark theme**, the glass border should use the warm sand tone (`rgba(203,183,151,...)`) giving a "warm frosted" look.
For **light theme**, the glass should feel clean and airy — near-white frosted with subtle shadow, no heavy blur tint.

---

## SECTION 3 — Weather Widget Fix

The weather code exists in `src/pages/WeeklyHome.jsx` but the widget isn't rendering for the user.

**Root cause to investigate:** The `fetchWeather` function is called in a `useEffect` on mount. Check whether:
1. The `weather` state starts as `null` and the render is gated on `weather?.daily` — if the fetch fails silently (network, CORS, bad city name), nothing shows.
2. The Open-Meteo geocoding API (`geocoding-api.open-meteo.com`) may not be in the allowed domains list.

**Fix:**
- Add a `weatherError` state. On catch, set `weatherError = true`.
- Add a small fallback UI below the greeting when `weather` is null and no error: show a subtle loading shimmer.
- When `weatherError` is true, show a small inline "Weather unavailable — check city name" text with an edit button.
- Hardcode a lat/lng fallback for Bradenton, FL (lat: 27.4989, lng: -82.5748) so the widget works immediately without geocoding:

```js
const fetchWeather = async (c) => {
  try {
    // Try geocoding first
    let lat = 27.4989, lng = -82.5748 // Bradenton fallback
    try {
      const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(c)}&count=1`)
      const gd  = await geo.json()
      if (gd.results?.length) { lat = gd.results[0].latitude; lng = gd.results[0].longitude }
    } catch(e) { /* use fallback coords */ }

    const wx  = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weathercode,temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=auto&forecast_days=7`)
    const wd  = await wx.json()
    const res = { city: c, daily: wd.daily }
    setWeather(res)
    setWeatherError(false)
    sessionStorage.setItem('planner_weather_cache', JSON.stringify(res))
  } catch(e) {
    setWeatherError(true)
  }
}
```

Also move the weather strip out of the page-header title area and into its **own dedicated card** on the dashboard — a horizontal scrollable row of day tiles. Style it as a liquid glass card with the same `::before` gloss. This makes it more prominent and fixes visibility issues on mobile.

---

## SECTION 4 — Calendar: Assignments → Calendar Sync Fix

**Bug:** Assignments added in the "Assignments" tab (`/courses` → Courses.jsx via `terms_v1`) do not appear in the calendar. The reverse works (calendar blocks appear in assignments) but this direction is broken.

**Root cause:** `CalendarPage.jsx` calls `getAssignmentDots()` on render to get assignment dots from `terms_v1`. However, this function reads `localStorage` directly at call time. When the user navigates to CalendarPage, it reads a snapshot — it does NOT re-read when data changes while on the calendar page.

**Fix:**
1. In `CalendarPage.jsx`, make the `dotMap` reactive — reload it from localStorage when the page mounts AND when a `drive-loaded` or custom `assignments-updated` event fires:

```js
const [dotMap, setDotMap] = useState(() => getAssignmentDots())

useEffect(() => {
  const refresh = () => setDotMap(getAssignmentDots())
  window.addEventListener('drive-loaded', refresh)
  window.addEventListener('assignments-updated', refresh)
  return () => {
    window.removeEventListener('drive-loaded', refresh)
    window.removeEventListener('assignments-updated', refresh)
  }
}, [])
```

2. In `Courses.jsx`, after any assignment is saved/created/deleted, dispatch the event:
```js
window.dispatchEvent(new Event('assignments-updated'))
```
Add this alongside wherever `onDataChange?.()` is called for assignment mutations.

3. Assignment dots in the calendar should render as **pills** (not just dots) in the month view when there's room — showing the assignment title truncated, using the course color. In week/day views, show them as non-draggable ghost blocks with a dashed border at the correct due time (or at 11:59pm if no time set, show as all-day).

---

## SECTION 5 — Calendar Color Overhaul

### Color picker: rainbow swatch palette
Replace the current `BLOCK_COLORS` array (7 colors) with a 16-color rainbow palette:
```js
const BLOCK_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#ec4899', // pink
  '#f43f5e', // rose
  '#ffffff', // white
  '#94a3b8', // slate
  '#1e293b', // dark
]
```

Display them in a 4×4 grid (not a horizontal row) in both the add and edit forms. Each swatch: 20×20px square (not circle), with a checkmark overlay when selected.

### Pill rendering — stronger color expression
**Light theme:** Pill = solid background at 25% opacity of the chosen color + left border 3px solid full color + text in a darkened version of the chosen color (use `color-mix(in srgb, <color> 80%, #000)` or just use the color directly — it should be readable on the tinted bg).

**Dark theme:** Pill = solid background at 18% opacity + left border 3px solid full color + text in the full chosen color at full brightness.

Concrete CSS pattern for pills:
```jsx
// In block rendering (TimeGrid and MonthGrid)
const pillBg    = `${b.color}30`  // ~19% opacity hex
const pillBorder = b.color
const pillText   = b.color  // full color for text in dark; add contrast check
```

Also square off all pills: `borderRadius: 0` or `2px`.

### Calendar: today tile highlight
In both `MonthGrid` and `TimeGrid`, when `ds === today`:
- **Light theme:** tile background `rgba(16,108,137,0.10)` (from light palette mid-color) with a top border `2px solid #106c89`
- **Dark theme:** tile background `rgba(203,183,151,0.08)` with a top border `2px solid rgba(203,183,151,0.5)`

The day number label should use `var(--accent)` color and be bold.

---

## SECTION 6 — Calendar: "Complete" Checkbox on Plans

In the edit popover for calendar blocks and in the block pill rendering:

1. Add a `done` boolean field to calendar blocks (default `false`).
2. In the **TimeGrid block pill**, render a small checkbox icon on the left:
   - Unchecked: `Circle` icon (Lucide), color `var(--text-3)`
   - Checked: `CheckCircle2` icon, color `var(--accent)`
   - Clicking the checkbox toggles `done` without opening the edit popover (stop propagation)
3. When `done === true`:
   - Block pill opacity drops to 0.45
   - Title gets `text-decoration: line-through`
   - Background tint becomes grayscale (`filter: saturate(0.2)`)
4. In the **MonthGrid pill**, show a small ✓ prefix on done items, same dim treatment.
5. No save button needed — toggle is immediate via `updateBlock`.

This should visually match the "done" task appearance in `WeeklyHome.jsx` (CheckCircle2 + dimmed row).

---

## SECTION 7 — Calendar: Hyperlink Field in Blocks

Add an optional `url` field to calendar blocks (and assignments in their popup).

**In block add/edit forms:**
- Add a URL input field: label "Link (optional)", placeholder `https://…`
- Small 🔗 icon prefix

**In the rendered block pill (TimeGrid):**
- If `block.url` exists, show a small `ExternalLink` icon (Lucide, size 10) at the right edge of the pill
- Clicking the icon opens `window.open(block.url, '_blank')` — stop propagation so it doesn't open the edit popover

**In assignment pills (Courses.jsx):**
- Add a `url` field to the assignment edit form: "Reference link (optional)"
- In the assignment view row, if `a.url` exists, show a small clickable `ExternalLink` icon next to the title

**In calendar popups** (the edit panel that appears when clicking a block):
- Show the URL as a clickable link if set: "🔗 Open reference" → `target="_blank"`

---

## SECTION 8 — Remove Alert() Calls Entirely

Search the entire codebase for `alert(` and replace every instance:
- For "Invalid JSON file" → use a toast/inline error state instead (a temporary red error banner at the top of the page or in the relevant component, auto-dismissed after 3 seconds)
- For "Enable browser notifications" → same inline banner treatment
- Any other `alert(` found → inline error state

Pattern to use:
```jsx
const [flashMsg, setFlashMsg] = useState(null) // { text, type: 'error'|'success' }
const flash = (text, type='error') => { setFlashMsg({text,type}); setTimeout(()=>setFlashMsg(null),3000) }

// Render:
{flashMsg && (
  <div style={{
    position:'fixed', bottom:20, left:'50%', transform:'translateX(-50%)',
    padding:'10px 20px',
    background: flashMsg.type==='error' ? 'var(--coral-dim)' : 'var(--green-dim)',
    border: `1px solid ${flashMsg.type==='error' ? 'var(--coral)' : 'var(--green)'}`,
    color: flashMsg.type==='error' ? 'var(--coral)' : 'var(--green)',
    borderRadius: 'var(--radius-md)',
    fontSize: 13, fontWeight: 600,
    zIndex: 9999,
    boxShadow: 'var(--shadow)',
  }}>
    {flashMsg.text}
  </div>
)}
```

---

## SECTION 9 — Remove Bing / Theme References

Search for any string containing "bing" (case-insensitive) anywhere in the codebase and remove or replace:
- If it's a Bing search URL → remove the link or replace with a generic search
- If it's a theme name like "Bing" → it shouldn't exist but remove if found
- Themes are only called "Light" and "Dark" everywhere in the UI

---

## SECTION 10 — Header: Quick Links Redesign (Desktop)

### Current behavior
The topbar shows link chips inline, with an edit button that expands an inline editing UI.

### New behavior

**Normal state (non-edit mode):**
- Link chips show left of the theme/settings button area, exactly as now but with squared corners
- Each chip is draggable to reorder (HTML5 drag-and-drop, or pointer events — simple swap on drop)
- A single "✏️ Edit links" icon button opens the modal

**Link Editor Modal:**
- Triggered by clicking the edit icon button (same position as now)
- Opens a centered modal overlay (`position:fixed`, `inset:0`, dark scrim behind)
- Modal is ~520px wide, max-height 80vh, scrollable if many links
- Header: "Quick Links" title + X close button
- Body: vertical list of link cards, each showing:
  - Drag handle (`GripVertical` icon, Lucide) on the left — draggable to reorder
  - Emoji + Label + URL displayed
  - Edit (pencil) icon → expands inline edit fields within that row
  - Delete (trash) icon
- Below the list: "+ Add link" button that appends a new blank editable row
- Footer: "Done" button (closes modal, saves automatically on every change)
- Reordering in the modal updates the live chip order in the topbar immediately
- Use the same drag logic: `draggable`, `onDragStart`, `onDragOver`, `onDrop` — swap array positions on drop

**Drag to reorder chips directly in the topbar (desktop only):**
- Each chip has `draggable={true}`
- `onDragStart` → store the dragged chip's id
- `onDragOver` → preventDefault
- `onDrop` → swap positions in the links array

---

## SECTION 11 — Header: Settings Button + Theme Toggle

### Settings navigation button
**Remove:** The `Palette` icon dropdown (theme panel) from `TopBar.jsx`.

**Add instead:** A `Settings` icon button (`Settings` from Lucide) that calls `useNavigate()('/settings')` on click. Position it in the same spot (rightmost in `top-bar-right`).

Also add to **MobileHeader**: replace or supplement the existing dropdown with a settings nav item that navigates to `/settings`.

The settings page already has theme toggle + Canvas config. Export/import buttons move there (see below).

### Export/Import move to Settings page
In `SettingsPage.jsx`, add a new "Data" card section:
```
[ Export backup JSON ]  [ Import backup JSON ]
```
Move the `exportJSON` and `importJSON` logic from `TopBar.jsx` to `SettingsPage.jsx`. Remove them from `TopBar.jsx`.

### Theme toggle pill — both platforms
Add a pill toggle button to `TopBar.jsx` (desktop) and `MobileHeader` (mobile):
- Position: in `top-bar-right`, **left of** the quick links area / **left of** the settings button
- Appearance: a pill-shaped toggle button, ~60px wide
  - Dark mode: shows 🌙 icon, background is dark
  - Light mode: shows ☀️ icon, background is light-ish
  - On click: calls `toggleTheme()`
  - Use a sliding indicator inside the pill (CSS transition) like a toggle switch but with icons
- Label: no text, icon only, with a Tooltip "Switch to light/dark mode"

```jsx
// Theme toggle pill component
function ThemeTogglePill({ theme, toggleTheme }) {
  return (
    <Tooltip text={theme==='dark' ? 'Switch to light mode' : 'Switch to dark mode'} position="bottom">
      <button onClick={toggleTheme} style={{
        display:'flex', alignItems:'center', gap:4,
        padding:'4px 8px',
        background: theme==='dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        border: '1px solid var(--glass-border)',
        borderRadius: 0,  /* squared */
        cursor:'pointer',
        fontSize:14,
        transition:'all .2s',
        color:'var(--text-1)',
      }}>
        {theme==='dark' ? '🌙' : '☀️'}
      </button>
    </Tooltip>
  )
}
```

Place it on the **right side** of the topbar, to the left of the Settings icon. On mobile, include it in MobileHeader as well (right side, to the left of the avatar dropdown).

---

## SECTION 12 — Remove Accent Color Scheme UI

Since we're removing multi-scheme support:
1. Remove `SCHEMES`, `SCHEME_COLORS`, `setScheme` from `useTheme.js` — keep only `theme` and `toggleTheme`
2. Remove all scheme-related props from `App.jsx`, `TopBar.jsx`, `MobileHeader`, `SettingsPage.jsx`
3. Remove the scheme dots UI from `SettingsPage.jsx`
4. In `index.css`, remove `[data-scheme="teal"]`, `[data-scheme="rose"]`, `[data-scheme="amber"]`
5. Keep `[data-scheme="indigo"]` as the permanent scheme, applied unconditionally in `main.jsx`:
   ```js
   document.documentElement.setAttribute('data-scheme', 'indigo')
   ```
6. Remove scheme from `localStorage` persistence — it's no longer needed

---

## BUILD & DEPLOY CHECKLIST
After all sections are complete:

```bash
# 1. Verify no alert() remains
grep -rn "alert(" src/

# 2. Verify useNotifications() still present
grep -n "useNotifications()" src/App.jsx

# 3. Verify no BrowserRouter
grep -rn "BrowserRouter" src/

# 4. Verify no "bing" references
grep -rni "bing" src/

# 5. Build
npm run build

# 6. Commit and push
git add -A
git commit -m "feat: theme redesign, liquid glass, squared cards, calendar overhaul, header refactor, settings nav"
git push origin main
```

---

## PRIORITIZATION ORDER
If the session runs long, prioritize in this order:
1. Section 1 (theme colors) — foundational, everything else looks better after this
2. Section 2 (square corners + glass) — visual impact
3. Section 11 (settings button + theme toggle) — removes clutter
4. Section 12 (remove accent schemes) — cleanup
5. Section 3 (weather fix) — user-visible bug
6. Section 4 (assignments → calendar sync) — correctness bug
7. Section 8 (remove alert) — polish
8. Section 5 (calendar color overhaul) — enhancement
9. Section 6 (complete checkbox) — feature
10. Section 7 (hyperlinks) — feature
11. Section 9 (remove bing) — cleanup
12. Section 10 (links modal) — most complex, last
