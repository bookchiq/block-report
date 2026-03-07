import { Router } from 'express';
import { supabase } from '../services/supabase.js';
import { logger } from '../logger.js';

const router = Router();

router.get('/libraries', async (_req, res) => {
  const { data, error } = await supabase.from('libraries').select('*');
  if (error) {
    logger.error('Failed to fetch libraries', { error: error.message });
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});

router.get('/rec-centers', async (_req, res) => {
  const { data, error } = await supabase.from('rec_centers').select('*');
  if (error) {
    logger.error('Failed to fetch rec centers', { error: error.message });
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});

router.get('/transit-stops', async (_req, res) => {
  const { data, error } = await supabase.from('transit_stops').select('*');
  if (error) {
    logger.error('Failed to fetch transit stops', { error: error.message });
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});

export default router;
