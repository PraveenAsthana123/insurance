# `config/` — Single-Source-of-Truth Folder

This folder is **portable**: copy it to any sibling project (ASD, BEV,
banking, telco, etc.) and edit the JSON files inside. The UI rebuilds
automatically — no code edits needed.

## Files

| File | Purpose |
|---|---|
| `brand.config.json` | **The one knob.** Brand name, icon, tagline, priority department, full department list. |
| `advanced_agentic_os_tools.json` | Agentic stack inventory (unchanged from BEV scaffold) |
| `agent_model_profiles.json` | Model routing profiles (unchanged) |

## How `brand.config.json` flows to the UI

```
config/brand.config.json
    ↓ (imported as JSON by Vite at build time)
frontend/src/data/departments.js   ← sorts by priority, re-exports
frontend/src/config/brand.js       ← exposes brand + labels
    ↓
Dashboard.jsx · Layout.jsx · DepartmentPage.jsx
```

## Copying to a new project (e.g. `/path/to/ASD_project/`)

```bash
# 1. Copy this folder verbatim
cp -r /mnt/deepa/insur_project/config /path/to/ASD_project/

# 2. Edit ONE file
$EDITOR /path/to/ASD_project/config/brand.config.json
#   - brand.name           → "ASD Research Platform"
#   - brand.icon           → "🧠"
#   - brand.tagline        → "..."
#   - industry.key         → "asd"
#   - industry.priorityDepartmentId → "<your-priority-dept>"
#   - departments[]        → replace with ASD's department list

# 3. Make the frontend use it (one-time wiring — see frontend/src/config/brand.js)

# 4. Rebuild
cd /path/to/ASD_project/frontend && npm run build
```

## Where the config is read

```
$ grep -rln "brand.config.json" --include='*.js' --include='*.jsx'
frontend/src/config/brand.js
frontend/src/data/departments.js
```

Only those two files import the JSON. Every other UI component reads
from `departments.js` (re-exports `departments`) or `config/brand.js`
(re-exports `brand`, `labels`, `industry`, `priorityDepartment`).

## What changes when you flip a field

| Change in JSON | Visible effect |
|---|---|
| `brand.name` | Header + browser tab + dashboard title |
| `brand.icon` | Emoji prefix on dashboard title |
| `brand.tagline` | Dashboard subtitle |
| `industry.priorityDepartmentId` | Bumps that dept to position 1 (after Dashboard) on every dept list |
| Add/remove an entry in `departments[]` | Sidebar nav + dashboard cards rebuild |
| `departments[i].priority` | Resorts the list |
| `departments[i].color` | Card accent + chip |
| `departments[i].icon` | Sidebar + card emoji |

## Hard rules

- **Do not** hand-edit `frontend/src/data/departments.js` or
  `frontend/src/config/brand.js` — they re-export from this JSON.
- **Do not** duplicate department data anywhere else in the repo.
  If you find a hardcoded "Sales / Manufacturing / etc." list, replace
  it with `import { departments } from '@/data/departments'`.
- **Do** keep `_version` bumped on schema-breaking edits.
