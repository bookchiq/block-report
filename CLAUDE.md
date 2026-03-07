# CLAUDE.md

## Project

Block Report — hyperlocal civic intelligence for San Diego neighborhoods.
Monorepo with a React frontend and Express backend. Anthropic Claude API for brief generation.

## Architecture

```
Client (React + Vite)  →  Backend (Express + Node)  →  External APIs
                                    │
                                    ├── Anthropic Claude API (brief generation)
                                    ├── SODA API (city open data)
                                    └── Census API (language demographics)
```

- The **frontend** is a React SPA. It never talks to external APIs directly — all data flows through the backend.
- The **backend** is an Express server that handles API keys, caching, and aggregation. API keys live here only — never exposed to the browser.
- The backend caches all SODA and Census responses to disk for 24 hours to avoid rate limits and speed up development. Claude API responses are not cached (they vary by input).

### API Routes

| Method | Route | Description | Caches? |
|--------|-------|-------------|---------|
| GET | `/api/locations/libraries` | Library locations from SODA | Yes (24h) |
| GET | `/api/locations/rec-centers` | Rec center locations from SODA | Yes (24h) |
| GET | `/api/locations/transit-stops` | Transit stop data | Yes (24h) |
| GET | `/api/311?community={name}` | 311 data aggregated by community | Yes (24h) |
| GET | `/api/demographics?tract={id}` | Census language data by tract | Yes (24h) |
| POST | `/api/brief/generate` | Generate community brief via Claude | No |

### Caching

The backend uses a simple file-based cache in `server/cache/`. Each cached response is a JSON file keyed by the request URL hash. On startup, stale entries older than 24 hours are ignored.

```typescript
// server/cache.ts — simple pattern
const CACHE_DIR = './server/cache';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

async function getCached(key: string): Promise<any | null> { ... }
async function setCache(key: string, data: any): Promise<void> { ... }
```

This avoids hitting SODA/Census rate limits during rapid development and means the app works offline once data is cached. During the demo, everything loads instantly.

## Team Conventions

### Branching

- Never commit directly to `main`.
- Use feature branches named `{workstream}/{description}`, e.g. `data/311-endpoint`, `map/leaflet-setup`, `brief/print-layout`.
- Keep branches short-lived. Merge to main via PR (or fast-forward merge if no conflicts) frequently — at least once per hour.
- Pull from main before starting new work. Rebase onto main if your branch has drifted.

### Workstreams

Three parallel workstreams. Stay in your lane to avoid merge conflicts.

| Workstream | Owns these directories | Primary responsibility |
|------------|----------------------|----------------------|
| `data` | `server/routes/`, `server/services/`, `server/cache.ts`, `src/types/` | Backend API routes, SODA/Census clients, caching, aggregation |
| `map` | `src/components/map/`, `src/components/ui/`, `src/App.tsx` | Leaflet map, sidebar, layout, UI shell, frontend API client |
| `brief` | `src/components/brief/`, `server/routes/brief.ts`, `server/services/claude.ts` | Claude integration, brief generation endpoint, print layout |

Shared files (`src/types/index.ts`, `server/index.ts`, config files) require coordination. Call out before editing them.

### Code Style

- TypeScript strict mode. No `any` types unless truly unavoidable and marked with `// TODO: type this`.
- Functional components with hooks. No class components.
- Use the shared interfaces in `src/types/index.ts` as the contract between workstreams. If you need to change an interface, tell the team first.
- Tailwind for styling. No separate CSS files except `src/print.css` for print-specific styles.
- Name files in kebab-case: `neighborhood-profile.tsx`, `soda-client.ts`.

### Commits

- Write short, descriptive commit messages: `add 311 endpoint with caching`, `wire up marker click to sidebar panel`.
- Don't squash — keep the history readable for judges reviewing the repo.

### Environment

- API keys go in `.env` at the project root (gitignored). They are only read by the server.
- `.env.example` lists required vars without values.
- The frontend uses Vite's proxy to route `/api/*` requests to the backend in development.

```
# .env.example
ANTHROPIC_API_KEY=
CENSUS_API_KEY=
PORT=3001
```

No `VITE_` prefixed API keys. Nothing secret goes to the browser.

### Dependencies

- Check if an existing dependency covers your need before adding a new one.
- If you add a dependency, mention it in your PR/commit so others know to `npm install`.

### What NOT to Do

- Don't put API keys in frontend code or use `VITE_` prefix for secrets.
- Don't refactor or reorganize files another workstream owns.
- Don't install a CSS framework or component library beyond Tailwind — we don't have time to debate it.
- Don't optimize prematurely. Working > fast > pretty. We can polish after 2:00 PM.
- Don't spend more than 15 minutes stuck on something. Ask the team or work around it.
- Don't bypass the cache during development — it's there to save us from rate limits.

## Project Structure

```
block-report/
├── server/                # Express backend (data workstream primarily)
│   ├── index.ts           # Express app setup, middleware, route mounting
│   ├── cache.ts           # File-based 24h cache utility (data workstream)
│   ├── routes/
│   │   ├── locations.ts   # /api/locations/* endpoints (data workstream)
│   │   ├── metrics.ts     # /api/311 endpoint (data workstream)
│   │   ├── demographics.ts # /api/demographics endpoint (data workstream)
│   │   └── brief.ts       # /api/brief/generate endpoint (brief workstream)
│   ├── services/
│   │   ├── soda.ts        # SODA API client (data workstream)
│   │   ├── census.ts      # Census API client (data workstream)
│   │   └── claude.ts      # Anthropic client (brief workstream)
│   └── cache/             # Cached JSON files (gitignored)
├── src/                   # React frontend
│   ├── api/
│   │   └── client.ts      # Frontend fetch wrapper for /api/* (map workstream)
│   ├── components/
│   │   ├── map/           # Leaflet map, markers, overlays (map workstream)
│   │   ├── brief/         # Brief display, print layout (brief workstream)
│   │   └── ui/            # Sidebar, panels, selectors (map workstream)
│   ├── types/
│   │   └── index.ts       # Shared interfaces (all — coordinate changes)
│   ├── App.tsx            # Main app shell (map workstream)
│   ├── main.tsx
│   └── print.css          # Print-only styles (brief workstream)
├── .env.example
├── .gitignore             # Must include: .env, server/cache/
├── CLAUDE.md
├── README.md
├── package.json
├── tsconfig.json
├── tsconfig.server.json   # Separate TS config for server
└── vite.config.ts         # Includes proxy: { '/api': 'http://localhost:3001' }
```

## Running Locally

```bash
# Terminal 1 — backend
npx tsx server/index.ts

# Terminal 2 — frontend
npm run dev
```

Or use `concurrently` in package.json scripts to run both with `npm run dev:all`.

## Key Data Endpoints

```bash
# Get It Done (311) — SODA API
# Docs: https://data.sandiego.gov/datasets/get-it-done-311/
curl "https://data.sandiego.gov/resource/h3qk-cz8g.json?\$limit=5"

# Library locations
curl "https://data.sandiego.gov/resource/govk-26ga.json"

# Recreation center locations
curl "https://data.sandiego.gov/resource/qjzh-bwut.json"

# Transit routes (GeoJSON)
# https://data.sandiego.gov/datasets/transit-routes/

# Census ACS — language spoken at home by tract
# https://api.census.gov/data/2022/acs/acs5?get=B16001_001E,B16001_003E&for=tract:*&in=state:06&in=county:073
```

## Timeline Awareness

- 10:30 AM: First commit allowed. Start building.
- 1:00 PM: Integration checkpoint. All workstreams merge to main and verify things connect.
- 2:30 PM: Feature freeze. No new code. Bug fixes, README, demo prep only.
- 3:00 PM: Submit via MCP server. Demo.
