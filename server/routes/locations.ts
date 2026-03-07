import { Router } from 'express';
import { supabase } from '../services/supabase.js';

const router = Router();

// In-memory cache for the community plan GeoJSON (~4 MB, fetched once)
const NEIGHBORHOODS_URL =
  'https://seshat.datasd.org/gis_community_planning_districts/cmty_plan_datasd.geojson';
const NEIGHBORHOODS_TTL = 24 * 60 * 60 * 1000;
let neighborhoodsCache: unknown = null;
let neighborhoodsCachedAt = 0;

router.get('/libraries', async (_req, res) => {
  const { data, error } = await supabase.from('libraries').select('*');
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});

router.get('/rec-centers', async (_req, res) => {
  const { data, error } = await supabase.from('rec_centers').select('*');
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});

router.get('/transit-stops', async (_req, res) => {
  const { data, error } = await supabase.from('transit_stops').select('*');
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});

router.get('/neighborhoods', async (_req, res) => {
  const now = Date.now();
  if (neighborhoodsCache && now - neighborhoodsCachedAt < NEIGHBORHOODS_TTL) {
    res.json(neighborhoodsCache);
    return;
  }
  try {
    const response = await fetch(NEIGHBORHOODS_URL);
    if (!response.ok) throw new Error(`Upstream error: ${response.status}`);
    const data = await response.json();
    neighborhoodsCache = data;
    neighborhoodsCachedAt = now;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
