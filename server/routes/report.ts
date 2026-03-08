import { Router } from 'express';
import type { Request, Response } from 'express';
import { generateReport } from '../services/claude.js';
import { logger } from '../logger.js';
import type { NeighborhoodProfile } from '../../src/types/index.js';
import { getCachedReport, saveCachedReport } from '../services/report-cache.js';

const router = Router();

// GET /api/report?community={name}&language={lang}
// Returns pre-generated report if available, 404 otherwise
router.get('/', async (req: Request, res: Response) => {
  try {
    const community = req.query.community as string;
    const language = req.query.language as string || 'English';

    if (!community) {
      res.status(400).json({ error: 'Missing required query parameter: community' });
      return;
    }

    const cached = await getCachedReport(community, language);
    if (cached) {
      res.json(cached);
    } else {
      res.status(404).json({ error: 'No pre-generated report available' });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Report lookup error', { error: message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

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

    const report = await generateReport(profile, language);

    // Cache the generated report for future instant access
    saveCachedReport(profile.communityName, language, report).catch((err) => {
      logger.error('Failed to cache report', { error: err instanceof Error ? err.message : String(err) });
    });

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
