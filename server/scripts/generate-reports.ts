/**
 * Nightly batch generation of reports for all neighborhoods × top languages.
 *
 * Requires the Express server to be running on localhost:3001 (or PORT env var).
 * Usage: npx tsx server/scripts/generate-reports.ts
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { NeighborhoodProfile, CommunityBrief } from '../../src/types/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = path.join(__dirname, '..', 'cache', 'reports');
const MANIFEST_PATH = path.join(REPORTS_DIR, 'manifest.json');

const BASE_URL = `http://localhost:${process.env.PORT || 3001}`;
const DELAY_MS = 1000; // 1 second between Claude API calls
const LANGUAGE_THRESHOLD = 5; // minimum % to include a language

// Map language labels to ISO-ish codes for filenames
const LANGUAGE_CODES: Record<string, string> = {
  English: 'en',
  Spanish: 'es',
  Chinese: 'zh',
  Vietnamese: 'vi',
  Tagalog: 'tl',
  Korean: 'ko',
  Arabic: 'ar',
  'French/Haitian/Cajun': 'fr',
  'German/West Germanic': 'de',
  'Russian/Polish/Slavic': 'ru',
  Other: 'other',
};

interface StoredReport {
  communityName: string;
  language: string;
  languageCode: string;
  generatedAt: string;
  dataAsOf: string;
  report: CommunityBrief;
}

interface ManifestEntry {
  communityName: string;
  language: string;
  languageCode: string;
  generatedAt: string;
  dataAsOf: string;
  filename: string;
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} from ${url}`);
  }
  return res.json() as Promise<T>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeFilename(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

async function getAllCommunities(): Promise<string[]> {
  const geojson = await fetchJSON<{
    features: { properties: { cpname?: string; name?: string } }[];
  }>(`${BASE_URL}/api/locations/neighborhoods`);

  const names = geojson.features
    .map((f) => f.properties?.cpname || f.properties?.name || '')
    .filter((n) => n.length > 0);

  return [...new Set(names)].sort();
}

async function assembleProfile(community: string): Promise<NeighborhoodProfile | null> {
  const encoded = encodeURIComponent(community);

  try {
    const [metrics, transit, demographics, libraries, recCenters] = await Promise.all([
      fetchJSON<NeighborhoodProfile['metrics']>(`${BASE_URL}/api/311?community=${encoded}`),
      fetchJSON<NeighborhoodProfile['transit']>(`${BASE_URL}/api/transit?community=${encoded}`),
      fetchJSON<NeighborhoodProfile['demographics']>(`${BASE_URL}/api/demographics?community=${encoded}`),
      fetchJSON<{ name: string; address: string; lat: number; lng: number; community: string }[]>(
        `${BASE_URL}/api/locations/libraries`,
      ),
      fetchJSON<{ rec_bldg: string; park_name: string; address: string; lat: number; lng: number; neighborhd: string }[]>(
        `${BASE_URL}/api/locations/rec-centers`,
      ),
    ]);

    // Find nearest anchor (library or rec center in this community)
    const communityUpper = community.toUpperCase();
    const nearbyLib = libraries.find(
      (l) => l.community?.toUpperCase() === communityUpper,
    );
    const nearbyRec = recCenters.find(
      (r) => r.neighborhd?.toUpperCase() === communityUpper,
    );

    const anchor = nearbyLib
      ? {
          id: `lib-${nearbyLib.name}`,
          name: nearbyLib.name,
          type: 'library' as const,
          lat: nearbyLib.lat,
          lng: nearbyLib.lng,
          address: nearbyLib.address,
          community,
        }
      : nearbyRec
        ? {
            id: `rec-${nearbyRec.rec_bldg || nearbyRec.park_name}`,
            name: nearbyRec.rec_bldg || nearbyRec.park_name,
            type: 'rec_center' as const,
            lat: nearbyRec.lat,
            lng: nearbyRec.lng,
            address: nearbyRec.address,
            community,
          }
        : {
            id: `community-${community}`,
            name: community,
            type: 'library' as const,
            lat: 0,
            lng: 0,
            address: '',
            community,
          };

    return {
      communityName: community,
      anchor,
      metrics,
      transit: {
        ...transit,
        nearbyStopCount: transit.stopCount,
        nearestStopDistance: 0,
      },
      demographics,
    };
  } catch (err) {
    console.error(`  Failed to assemble profile for ${community}: ${(err as Error).message}`);
    return null;
  }
}

function getTargetLanguages(profile: NeighborhoodProfile): string[] {
  const languages: string[] = ['English']; // Always generate English

  if (profile.demographics?.topLanguages) {
    for (const lang of profile.demographics.topLanguages) {
      if (
        lang.language !== 'English' &&
        lang.percentage >= LANGUAGE_THRESHOLD &&
        LANGUAGE_CODES[lang.language]
      ) {
        languages.push(lang.language);
      }
    }
  }

  return languages;
}

async function generateReport(
  profile: NeighborhoodProfile,
  language: string,
): Promise<CommunityBrief> {
  return fetchJSON<CommunityBrief>(`${BASE_URL}/api/brief/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile, language }),
  });
}

async function main() {
  console.log('=== Block Report Batch Generation ===\n');

  // Ensure output directory exists
  await fs.mkdir(REPORTS_DIR, { recursive: true });

  // 1. Get all communities
  console.log('Fetching community list...');
  const communities = await getAllCommunities();
  console.log(`Found ${communities.length} communities.\n`);

  const dataAsOf = new Date().toISOString();
  const manifest: ManifestEntry[] = [];
  let totalGenerated = 0;
  let totalFailed = 0;
  let reportIndex = 0;

  // 2. Build generation matrix
  console.log('Assembling neighborhood profiles...');
  const generationQueue: { community: string; profile: NeighborhoodProfile; languages: string[] }[] = [];

  for (const community of communities) {
    const profile = await assembleProfile(community);
    if (!profile) {
      console.log(`  Skipping ${community} (profile assembly failed)`);
      continue;
    }
    const languages = getTargetLanguages(profile);
    generationQueue.push({ community, profile, languages });
  }

  const totalReports = generationQueue.reduce((sum, q) => sum + q.languages.length, 0);
  console.log(`\nGeneration matrix: ${generationQueue.length} communities x languages = ${totalReports} reports\n`);

  // 3. Generate reports
  for (const { community, profile, languages } of generationQueue) {
    for (const language of languages) {
      reportIndex++;
      const langCode = LANGUAGE_CODES[language] || 'en';
      const filename = `${sanitizeFilename(community)}_${langCode}.json`;

      console.log(`Generating report ${reportIndex}/${totalReports}: ${community} (${language})...`);

      try {
        const report = await generateReport(profile, language);

        const stored: StoredReport = {
          communityName: community,
          language,
          languageCode: langCode,
          generatedAt: new Date().toISOString(),
          dataAsOf,
          report,
        };

        await fs.writeFile(
          path.join(REPORTS_DIR, filename),
          JSON.stringify(stored, null, 2),
        );

        manifest.push({
          communityName: community,
          language,
          languageCode: langCode,
          generatedAt: stored.generatedAt,
          dataAsOf,
          filename,
        });

        totalGenerated++;
        console.log(`  Done.`);
      } catch (err) {
        console.error(`  FAILED: ${(err as Error).message}`);
        totalFailed++;
      }

      // Rate limiting delay between Claude API calls
      if (reportIndex < totalReports) {
        await sleep(DELAY_MS);
      }
    }
  }

  // 4. Write manifest
  const manifestData = {
    generatedAt: new Date().toISOString(),
    dataAsOf,
    totalReports: totalGenerated,
    totalFailed,
    entries: manifest,
  };

  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifestData, null, 2));

  console.log(`\n=== Batch Generation Complete ===`);
  console.log(`Generated: ${totalGenerated}`);
  console.log(`Failed: ${totalFailed}`);
  console.log(`Manifest: ${MANIFEST_PATH}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
