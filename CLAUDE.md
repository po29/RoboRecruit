# RoboRecruit

Robotics industry landscape SPA — company profiles, tech heatmap, and live job board for the humanoid/autonomous robotics sector. Deployed to GitHub Pages.

## Tech Stack

| Layer | Tool |
|---|---|
| UI framework | React 18 + TypeScript (strict) |
| Build | Vite 5, `tsc -b && vite build` |
| Styling | Tailwind CSS 3 (cyberpunk dark theme) |
| State | Zustand (`src/store/filterStore.ts`) |
| Routing | React Router v6 — **HashRouter** (required for GitHub Pages) |
| Charts | Recharts (heatmap), D3 v7 (skill graph — not yet implemented) |
| Data sync | Python 3.11 script → GitHub Actions daily cron |

## Project Structure

```
src/
  views/          # Page-level components (one per route)
  components/
    charts/       # TechHeatmap, SkillGraph
    company/      # CompanyCard, CompanyGrid, CompanyModal
    filters/      # FilterPanel, MultiSelect, FilterChips
    jobs/         # JobTable, JobRow
    layout/       # AppShell, TopBar, Sidebar
    ui/           # Badge, Modal, Spinner (reusable primitives)
  hooks/          # useFilteredCompanies, useFilteredJobs, useCompanyById
  store/          # Zustand filter state
  types/          # index.ts — all enums and interfaces
  data/           # companies.ts (static), jobs.ts (auto-generated)
scripts/
  fetch_jobs.py   # Greenhouse/Lever ATS scraper → src/data/jobs.ts
  seed_jobs.json  # Fallback data when ATS fetch fails
.github/workflows/
  deploy.yml      # Push to main → build → gh-pages branch
  update-jobs.yml # Daily 06:00 UTC → run fetch_jobs.py → auto-commit
```

## Routes

| Path | View | Description |
|---|---|---|
| `/` | `LandscapeView` | Company grid + sidebar filters |
| `/heatmap` | `HeatmapView` | Tech × Company SVG matrix |
| `/skills` | `SkillGraphView` | D3 force graph (placeholder) |
| `/jobs` | `JobsView` | Sortable/paginated job board |

## Essential Commands

```bash
npm run dev          # Vite dev server (hot reload)
npm run build        # tsc -b && vite build → dist/
npm run preview      # Serve dist/ locally
npm run deploy       # build + push to gh-pages branch

python scripts/fetch_jobs.py   # Re-generate src/data/jobs.ts from ATS
```

## ⚠️ IMPORTANT: Branching Workflow

**Before you work on any new feature or bug fix, create a git branch first:**

```bash
git checkout -b feature/my-feature-name
# or
git checkout -b fix/bug-description
```

Work on all changes in that branch. Only merge back to `main` when complete and tested. This prevents conflicts and keeps `main` deployable at all times.

Example:
```bash
git checkout -b feature/add-skill-graph
# ... make changes ...
git add . && git commit -m "WIP: Add D3 skill graph"
git push origin feature/add-skill-graph
# When done, open a PR or merge manually to main
```

## Adding Features

### New Page/Route
1. Create a new view component in `src/views/MyNewView.tsx`
2. Add the route to `src/App.tsx` inside `HashRouter`
3. Update navigation in `src/components/layout/Sidebar.tsx`
4. Import any new data types from `src/types/index.ts`

### New Chart or Component
1. Create in `src/components/` (organize by category: `charts/`, `filters/`, etc.)
2. Accept data via TypeScript interfaces from `src/types/index.ts`
3. Use Tailwind classes; follow `cyber-cyan`, `cyber-green` color palette
4. Export from component folder's `index.ts` for clean imports

### Adding New Company Data
1. Edit `src/data/companies.ts`
2. Add to the `companies` array, matching `Company` interface in `src/types/index.ts`
3. Required fields: `id`, `name`, `logo`, `problems`, `techStack`, `website`
4. Test locally: `npm run dev`, verify it appears on the landscape

### Adding New Job Fields
**Do not hand-edit `src/data/jobs.ts`**. Instead:
1. Update the `Job` interface in `src/types/index.ts`
2. Update `scripts/fetch_jobs.py` to parse the new field
3. Run: `python scripts/fetch_jobs.py`
4. This regenerates `src/data/jobs.ts`

## Fixing Bugs

1. **Identify the bug** — which view/component breaks?
2. **Reproduce locally** — `npm run dev`, test the bug
3. **Fix the code** — update component or logic
4. **Test** — refresh dev server, verify fix works
5. **Build & deploy** — `npm run build && npm run deploy`

## Before Deploying

Run these checks before pushing:
```bash
npm run build      # Catch TypeScript/build errors early
npm run preview    # Test the production build locally
```

## Testing Checklist

- [ ] All routes load without errors
- [ ] Filters work (tech, problem domain, job search)
- [ ] Heatmap renders correctly
- [ ] Job table displays and sorts properly
- [ ] Mobile responsive (test in DevTools)
- [ ] No console errors/warnings

## Deployment

```bash
git add . && git commit -m "Brief description"
git push origin main
# GitHub Actions auto-builds and deploys to gh-pages
# Live site updates in ~2 min at https://YOUR_USERNAME.github.io/RoboRecruit
```

## Data Model

All data is client-side — no backend. The two sources:

- **`src/data/companies.ts`** — 14 hardcoded robotics companies. Types at `src/types/index.ts:1`.
- **`src/data/jobs.ts`** — Auto-generated; **do not hand-edit**. Regenerate by running `fetch_jobs.py`.

Key types: `Company`, `Job`, `FilterState`, `TechItem`, `Product` — all in `src/types/index.ts`.

## Key Config

- `vite.config.ts` — `base: '/RoboRecruit/'` required for GitHub Pages asset paths
- `tailwind.config.js` — custom palette: `cyber-cyan`, `cyber-green`, `bg-base` (`#0a0e1a`)
- `tsconfig.app.json` — strict mode on; `noUnusedLocals` and `noUnusedParameters` enforced

## Additional Documentation

- [`.claude/docs/architectural_patterns.md`](.claude/docs/architectural_patterns.md) — Patterns and conventions used across the codebase (filtering, data flow, component composition, state)
