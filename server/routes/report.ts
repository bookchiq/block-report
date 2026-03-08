import { Router } from 'express';
import type { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateReport } from '../services/claude.js';
import { logger } from '../logger.js';
import type { NeighborhoodProfile } from '../../src/types/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = path.join(__dirname, '..', 'cache', 'reports');

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
};

function sanitizeFilename(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

interface StoredReport {
  communityName: string;
  language: string;
  languageCode: string;
  generatedAt: string;
  dataAsOf: string;
  report: {
    neighborhoodName: string;
    language: string;
    generatedAt: string;
    summary: string;
    goodNews: string[];
    topIssues: string[];
    howToParticipate: string[];
    contactInfo: {
      councilDistrict: string;
      phone311: string;
      anchorLocation: string;
    };
  };
}

async function getPreGeneratedReport(
  communityName: string,
  language: string,
): Promise<StoredReport | null> {
  const langCode = LANGUAGE_CODES[language] || language.toLowerCase().slice(0, 2);
  const filename = `${sanitizeFilename(communityName)}_${langCode}.json`;
  const filePath = path.join(REPORTS_DIR, filename);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as StoredReport;
  } catch {
    return null;
  }
}

const router = Router();

router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { profile, language } = req.body as {
      profile: NeighborhoodProfile;
      language: string;
    };

    if (!profile || !language) {
      res.status(400).json({ error: 'Missing required fields: profile, language' });
      return;
    }

    // Check for a pre-generated report first
    const preGenerated = await getPreGeneratedReport(profile.communityName, language);
    if (preGenerated) {
      logger.info('Serving pre-generated report', {
        community: profile.communityName,
        language,
        generatedAt: preGenerated.generatedAt,
      });
      res.json({
        ...preGenerated.report,
        preGenerated: true,
        dataAsOf: preGenerated.dataAsOf,
      });
      return;
    }

    // Fall back to on-demand generation
    logger.info('No pre-generated report found, generating on-demand', {
      community: profile.communityName,
      language,
    });
    const report = await generateReport(profile, language);
    res.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error generating report';
    logger.error('Report generation error', {
      error: message,
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
