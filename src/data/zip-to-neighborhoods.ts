/**
 * Static mapping of San Diego zip codes to community plan area names.
 * Names match the comm_plan_name values in the requests_311 database table.
 * A zip may span multiple communities — the user picks when that happens.
 */
export const ZIP_TO_NEIGHBORHOODS: Record<string, string[]> = {
  '92037': ['La Jolla'],
  '92101': ['Balboa Park', 'Downtown'],
  '92103': ['Balboa Park', 'Uptown'],
  '92104': ['North Park'],
  '92105': ['Mid-City:City Heights'],
  '92106': ['Peninsula'],
  '92107': ['Ocean Beach', 'Peninsula'],
  '92108': ['Mission Valley'],
  '92109': ['Mission Bay Park', 'Pacific Beach'],
  '92110': ['Midway-Pacific Highway', 'Uptown', 'Old Town San Diego'],
  '92111': ['Clairemont Mesa', 'Kearny Mesa', 'Linda Vista'],
  '92113': ['Barrio Logan', 'Southeastern San Diego'],
  '92114': ['Encanto Neighborhoods', 'Skyline-Paradise Hills'],
  '92115': ['College Area'],
  '92116': ['Mid-City:Normal Heights', 'North Park'],
  '92117': ['Clairemont Mesa'],
  '92119': ['Navajo'],
  '92120': ['Navajo'],
  '92121': ['University'],
  '92122': ['University'],
  '92123': ['Kearny Mesa', 'Serra Mesa'],
  '92124': ['Tierrasanta'],
  '92126': ['Mira Mesa'],
  '92127': ['Rancho Bernardo', 'Rancho Penasquitos'],
  '92128': ['Carmel Mountain Ranch', 'Rancho Bernardo'],
  '92129': ['Rancho Penasquitos'],
  '92130': ['Carmel Valley'],
  '92131': ['Scripps Miramar Ranch'],
  '92139': ['Skyline-Paradise Hills', 'Otay Mesa-Nestor'],
  '92154': ['Otay Mesa'],
  '92173': ['Otay Mesa', 'San Ysidro'],
};

export function lookupZip(zip: string): string[] | null {
  const trimmed = zip.trim();
  if (!/^\d{5}$/.test(trimmed)) return null;
  return ZIP_TO_NEIGHBORHOODS[trimmed] ?? [];
}
