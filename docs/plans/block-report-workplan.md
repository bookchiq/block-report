# Block Report — Hackathon Workplan
**Team: Ctrl+P**

## The Pitch (60 seconds)

Every San Diego neighborhood has a library or rec center. But not every neighborhood knows what city services are available, how to participate, or what's already being done. Block Report turns each community anchor into a civic intelligence hub — staff or volunteers can generate a printed brief, in the right language, showing what's happening in their neighborhood, what services are available, and how to get involved.

We built it because the neighborhoods that most need this information are the ones least likely to find it on a data portal.

---

## Team Roles

Three people, all comfortable with Claude Code. Divide by **workstream**, not by skill.

| Person | Workstream | Focus |
|--------|-----------|-------|
| **Person A** | Data Pipeline | SODA API integration, data fetching, aggregation, Census language data |
| **Person B** | Map & Frontend | React app, Leaflet map, neighborhood selector, UI shell |
| **Person C** | Brief Generator | Claude API integration, printable output, language support, MCP server (stretch) |

Everyone should be in the same repo from the start. Agree on interfaces early (what shape does the data come in, what does the brief generator expect) and then work in parallel.

---

## Timeline (11:00 AM – 5:00 PM, ~6 hours)

### 11:00–11:30 — Setup & Alignment (all together, 30 min)

- [x] Create repo, set up Vite + React + TypeScript + Tailwind + Leaflet
- [x] Agree on project structure and file layout
- [x] Agree on data interfaces (see "Key Interfaces" below)
- [x] Person A: Census API key registered and added to .env.example
- [x] Confirm Anthropic API credits are working
- [x] Each person pulls the repo and confirms they can run `npm run dev`

### 11:30–1:30 — Parallel Build, Phase 1 (2 hours)

**Person A — Backend & Data Pipeline:**
- [x] Set up Express server (`server/index.ts`) with CORS and JSON middleware
- [x] ~~Implement file-based cache utility (`server/cache.ts`)~~ — Replaced by local Supabase DB + seed script (`scripts/seed.ts`)
- [x] ~~Build SODA API service (`server/services/soda.ts`)~~ — Replaced by Supabase queries (`server/services/supabase.ts`)
- [x] Implement `/api/locations/libraries` and `/api/locations/rec-centers` endpoints
- [x] Implement `/api/311?community={name}` — fetch and aggregate 311 data per community: request count, resolution rate, avg days to close, top problem types
- [x] Implement `/api/locations/transit-stops` endpoint
- [x] Configure Vite proxy: `'/api' → 'http://localhost:3001'`
- [x] Add `dev:all` script using `concurrently` to run frontend + backend

**Person B — Map & Frontend:**
- [x] Build frontend API client (`src/api/client.ts`) — thin fetch wrapper for `/api/*` routes
- [x] Set up Leaflet map centered on San Diego (32.7157, -117.1611)
- [x] Add library locations as markers (blue default markers)
- [x] Add rec center locations as markers (green-tinted markers)
- [x] Add transit stop layer (small gray circles)
- [x] Build sidebar/panel UI shell: location name, neighborhood metrics, brief display
- [x] Neighborhood selector dropdown → call `/api/311?community={name}` → populate panel (uses dropdown instead of marker click)
- [ ] Community boundary overlay if available (nice to have, not blocking)

**Person C — Brief Generator:**
- [x] Build Claude service (`server/services/claude.ts`) using Anthropic SDK
- [x] Implement `/api/brief/generate` POST endpoint (`server/routes/brief.ts`)
- [x] Design the brief prompt template (see "Brief Template" below)
- [x] Build the printable brief component with CSS `@media print` styling
- [x] Design the print layout: header, neighborhood name, key stats, good news section, "how to participate" section (QR code not yet added)

### 1:30–2:00 — Lunch + Integration Check

- [x] Merge branches, resolve conflicts
- [x] Person A's data → Person B's map: do markers load? Does clicking populate data?
- [x] Person A's data → Person C's brief: does the generator receive the right shape?
- [x] Identify what's broken and prioritize fixes

### 2:00–4:00 — Phase 2: Polish & Features (2 hours)

**Person A:**
- [x] ~~Implement Census API service (`server/services/census.ts`)~~ — Census data seeded into Supabase `census_language` table
- [x] Implement `/api/demographics?tract={id}` endpoint — ACS language data by tract
  - Table C16001: Language spoken at home (B16001 is discontinued)
  - Join to neighborhoods via tract-to-community mapping
- [ ] Compute "access gap" signals: low 311 rate + low transit density + high non-English speaking population
- [ ] Expose gap scores through an endpoint or as part of the 311 response

**Person B:**
- [ ] Add choropleth or heatmap layer showing access gap score by neighborhood
- [ ] Add language selector dropdown (populated from Census data for selected area)
- [x] Polish the UI: loading states, error handling, mobile-responsive basics
- [x] Add "Generate Brief" button that triggers Person C's module

**Person C:**
- [x] Add multilingual brief generation (backend accepts language param; frontend hardcodes `'English'` — needs UI language selector from Person B)
- [x] Add "good news" section to brief: recently resolved 311 issues included in prompt and display
- [x] Add "how to get involved" section with concrete next steps (council district contact, 311 info)
- [ ] If time: start MCP server wrapping SODA API (see stretch goals)

### Known Gaps — Data not wired end-to-end

These are things where the backend capability exists but the data doesn't flow through to the brief or UI:

- [ ] **Transit proximity not computed**: `App.tsx` sends `transit: { nearbyStopCount: 0, nearestStopDistance: 0 }` to the brief. Transit stops are loaded on the map but never aggregated per community. Need to compute nearby stop count from transit stop lat/lng vs community anchor lat/lng.
- [ ] **Demographics not wired into brief**: `App.tsx` sends `demographics: { topLanguages: [] }` to the brief. The `/api/demographics?tract={id}` endpoint works but requires a Census tract ID — there is no tract-to-neighborhood mapping, so the frontend never calls it.
- [ ] **Library community field missing**: Libraries from the API have no `community`/`neighborhd` field. Clicking a library marker calls `handleAnchorClick` which reads `anchor.community`, but this is empty. Need either a hardcoded mapping or nearest-neighbor lookup against rec centers.
- [ ] **Language selector in UI**: Backend accepts any language, but frontend hardcodes `'English'` (`App.tsx:98`). Need a dropdown in the sidebar (even a simple static list: English, Spanish, Chinese, Vietnamese, Tagalog).
- [ ] **Council district not populated**: The brief's `contactInfo.councilDistrict` is generated by Claude from profile data, but 311 records have `council_district` — this could be extracted and passed through in the metrics response.

### 4:00–4:30 — Demo Prep (30 min)

- [ ] Freeze features — no new code after 4:00
- [ ] Fix any remaining bugs in the demo flow
- [ ] Record 60-second demo video (or confirm live demo works)
- [ ] Write/finalize README (see template below)
- [ ] Submit via MCP submission server
- [ ] Push final code to public GitHub repo

### 4:30–5:00 — Buffer / Presentations

- [ ] Present or submit
- [ ] Celebrate

---

## Key Data Sources

SD open data is **static files on seshat.datasd.org** — NOT a live Socrata/SODA API. No query params, download full files and filter in code.

| Dataset | Download URL | Format | Key Fields |
|---------|-------------|--------|------------|
| Get It Done (311) open | `seshat.datasd.org/get_it_done_reports/get_it_done_requests_open_datasd.csv` | CSV | date_requested, service_name, status, lat, lng, comm_plan_name |
| Get It Done (311) closed | `seshat.datasd.org/get_it_done_reports/get_it_done_requests_closed_{year}_datasd.csv` | CSV | same + date_closed |
| Library Locations | `seshat.datasd.org/gis_library_locations/libraries_datasd.csv` | CSV, GeoJSON | name, address, lat, lng, phone, website (NO community field) |
| Recreation Centers | `seshat.datasd.org/gis_recreation_center/rec_centers_datasd.csv` | CSV, GeoJSON | rec_bldg, address, neighborhd (ALL CAPS), lat, lng, facility flags |
| Transit Stops | `seshat.datasd.org/gis_transit_stops/transit_stops_datasd.csv` | CSV, GeoJSON | stop_name, stop_lat, stop_lon, stop_agncy, lat, lng |
| Census ACS Language | `api.census.gov/data/2021/acs/acs5` | JSON API | **C16001** table (B16001 is dead). C16001_001E=total, _002E=English, _003E=Spanish, etc. |
| Permits (stretch) | data.sandiego.gov/datasets/ (search for permits) | CSV | type, date, location, status |

**Important notes:**
- 311 `comm_plan_name` has mixed case ("Mira Mesa" and "MIRA MESA") — normalize!
- Libraries have no neighborhood field — infer from lat/lng proximity to rec centers or hardcode
- Primary test community: **Mira Mesa**

---

## Key Interfaces

Agree on these shapes early so you can work in parallel.

```typescript
// Person A produces this, Person B consumes it for the map
interface CommunityAnchor {
  id: string;
  name: string;
  type: 'library' | 'rec_center';
  lat: number;
  lng: number;
  address: string;
  phone?: string;
  website?: string;
  community: string; // neighborhood name
}

// Person A produces this, Person B displays it, Person C uses it for briefs
interface NeighborhoodProfile {
  communityName: string;
  anchor: CommunityAnchor;
  metrics: {
    totalRequests311: number;
    resolvedCount: number;
    resolutionRate: number;  // 0-1
    avgDaysToResolve: number;
    topIssues: { category: string; count: number }[];
    recentlyResolved: { category: string; date: string }[]; // good news
  };
  transit: {
    nearbyStopCount: number;  // within 0.5 mile radius
    nearestStopDistance: number; // miles
  };
  demographics: {
    topLanguages: { language: string; percentage: number }[];
  };
  accessGapScore?: number; // computed composite, 0-100
}

// Person C produces this from NeighborhoodProfile
interface CommunityBrief {
  neighborhoodName: string;
  language: string;
  generatedAt: string;
  summary: string;        // plain-language overview
  goodNews: string[];     // positive developments
  topIssues: string[];    // what the community is reporting
  howToParticipate: string[]; // concrete next steps
  contactInfo: {
    councilDistrict: string;
    phone311: string;
    anchorLocation: string; // the library/rec center
  };
}
```

---

## Brief Prompt Template (Person C)

```
You are generating a community brief for residents near {anchorName} in the
{communityName} neighborhood of San Diego. The brief will be printed and posted
at {anchorName} for community members to read.

Write in {language}. Use clear, warm, accessible language at a 6th-grade reading
level. Avoid jargon.

Here is the data for this neighborhood:
{neighborhoodProfile as JSON}

Generate a brief with these sections:
1. **Welcome** — A 2-sentence greeting that names the neighborhood and the
   anchor location.
2. **Good News** — 2-3 positive things happening based on the data (resolved
   issues, investments, improvements).
3. **What Your Neighbors Are Reporting** — Top 3 issues being reported via 311,
   framed constructively (not as complaints, but as things the community is
   working on).
4. **How to Get Involved** — 3-4 concrete actions: how to file a 311 report,
   how to attend council meetings, how to contact their council representative,
   where to find more info.
5. **Transit Info** — How to get to {anchorName} by public transit if applicable.

Keep the total brief under 400 words. It should fit on one printed page.
```

---

## README Template (for submission)

```markdown
# Block Report

## Team: Ctrl+P
- [Name] — [Role/focus]
- [Name] — [Role/focus]
- [Name] — [Role/focus]

## Problem Statement
San Diego's open data is powerful but inaccessible to the communities that
need it most. Neighborhoods with low digital access, language barriers, or
limited transit to civic meetings are underrepresented in 311 reports, public
comment, and service utilization. The data shows the gap — but nobody is
turning that data into action at the neighborhood level.

## What It Does
Block Report is a civic intelligence tool centered on San Diego's libraries
and recreation centers — the physical anchors of community life. It aggregates
311 data, transit access, and demographic information to generate a
neighborhood profile, then produces a printable, multilingual community brief
designed to be posted at these locations. The brief tells residents what's
happening, what services are available, and how to participate — in the
language they speak.

## Data Sources
- Get It Done (311) reports — data.sandiego.gov
- Library locations — data.sandiego.gov
- Recreation center locations — data.sandiego.gov
- Transit routes/stops — data.sandiego.gov / SANDAG
- Census ACS language data — api.census.gov
- [Any additional sources]

## Architecture
[Describe or paste a simple diagram]
- React + TypeScript + Vite frontend
- Express + Node.js backend (API key management, caching, aggregation)
- Leaflet map with GeoJSON overlays
- SODA API for city open data (via backend with 24h file cache)
- Census API for language demographics (via backend with 24h file cache)
- Census API for language demographics
- Anthropic Claude API for brief generation
- Print-optimized CSS for community briefs

## Links
- Live app: [URL if deployed]
- Demo video: [URL]

## How to Run Locally
\`\`\`bash
git clone [repo-url]
cd block-report
npm install
cp .env.example .env  # add your API keys
npm run dev
\`\`\`
```

---

## Stretch Goals (in priority order)

1. **MCP Server for SD Open Data** — Wrap the SODA API as an MCP server so any Claude user can query city data. This is the biggest bonus-point opportunity and the most lasting artifact.
2. **PDF generation** — Generate actual downloadable PDFs instead of relying on browser print.
3. **Transit travel time to City Hall** — Calculate approximate transit time from each anchor to City Hall (202 C St) using GTFS schedule data.
4. **Permit activity overlay** — Show recent permit approvals as a "good news" investment signal.
5. **Historical trends** — Show 311 resolution rates improving or declining over time per neighborhood.
6. **Deploy** — Get it on Vercel/Netlify with a public URL (eliminates need for demo video).

---

## Presentation Tips

**For the judging rubric:**
- **Civic Impact (5pts):** Lead with the problem and the specific audience. "This is for library staff in Barrio Logan who want to help their neighbors navigate city services." Name a real neighborhood.
- **Use of City Data (5pts):** Explicitly name every dataset you joined. The rubric rewards creative combinations. "We joined 311 data with transit stop density and Census language data to identify access gaps."
- **Technical Execution (5pts):** Demo a complete flow: pick a library → see the profile → generate a brief → show the print layout. One clean path through the app beats showing five half-working features.
- **Presentation & Story (5pts):** End with the printable brief. Hold it up (or show it on screen). That physical artifact makes the impact tangible in a way a dashboard doesn't.

**The emotional hook:**
The city just launched its first-ever Community Recreation Needs Assessment to study exactly these equity gaps. Block Report doesn't just study the problem — it puts actionable information directly into the hands of the communities being studied.
