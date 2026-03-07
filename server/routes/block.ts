import { Router } from 'express';
import { supabase } from '../services/supabase.js';
import { logger } from '../logger.js';

const router = Router();

// 1 degree of latitude ~ 69 miles; longitude varies by latitude
const MILES_PER_LAT_DEG = 69;
// At San Diego (~32.7°N): 1 deg longitude ~ 58.8 miles
const MILES_PER_LNG_DEG = 58.8;

function haversineDistanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

router.get('/', async (req, res) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  const radius = parseFloat(req.query.radius as string) || 0.25;

  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({ error: 'lat and lng query parameters are required' });
    return;
  }

  // Rough San Diego bounding box check
  if (lat < 32.5 || lat > 33.2 || lng < -117.6 || lng > -116.8) {
    res.status(400).json({ error: 'Coordinates are outside the San Diego area' });
    return;
  }

  if (radius < 0.1 || radius > 2) {
    res.status(400).json({ error: 'Radius must be between 0.1 and 2 miles' });
    return;
  }

  const latDelta = radius / MILES_PER_LAT_DEG;
  const lngDelta = radius / MILES_PER_LNG_DEG;

  const { data, error } = await supabase
    .from('requests_311')
    .select('service_name, status, date_requested, date_closed, lat, lng')
    .gte('lat', lat - latDelta)
    .lte('lat', lat + latDelta)
    .gte('lng', lng - lngDelta)
    .lte('lng', lng + lngDelta);

  if (error) {
    logger.error('Failed to fetch block data', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
    return;
  }

  // Refine with exact Haversine distance
  const nearby = (data ?? []).filter(
    (r) => r.lat != null && r.lng != null &&
      haversineDistanceMiles(lat, lng, Number(r.lat), Number(r.lng)) <= radius,
  );

  const open = nearby.filter((r) => r.status !== 'Closed' && !r.date_closed);
  const resolved = nearby.filter((r) => r.status === 'Closed' || r.date_closed);

  const issueCounts: Record<string, number> = {};
  for (const r of nearby) {
    const cat = r.service_name || 'Unknown';
    issueCounts[cat] = (issueCounts[cat] || 0) + 1;
  }
  const topCategory =
    Object.entries(issueCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;

  const recentlyResolved = resolved
    .filter((r) => r.date_closed)
    .sort((a, b) => new Date(b.date_closed).getTime() - new Date(a.date_closed).getTime())
    .slice(0, 3)
    .map((r) => ({ category: r.service_name || 'Unknown', date: r.date_closed as string }));

  res.json({
    totalRequests: nearby.length,
    openCount: open.length,
    resolvedCount: resolved.length,
    topCategory,
    recentlyResolved,
    radiusMiles: radius,
  });
});

export default router;
