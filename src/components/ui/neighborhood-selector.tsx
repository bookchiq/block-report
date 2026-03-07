export const COMMUNITIES = [
  'Balboa Park',
  'Barrio Logan',
  'Black Mountain Ranch',
  'Carmel Mountain Ranch',
  'Carmel Valley',
  'Clairemont Mesa',
  'College Area',
  'Del Mar Mesa',
  'Downtown',
  'East Elliott',
  'Encanto Neighborhoods',
  'Greater Golden Hill',
  'Kearny Mesa',
  'La Jolla',
  'Linda Vista',
  'Mid-City:City Heights',
  'Mid-City:Eastern Area',
  'Mid-City:Kensington-Talmadge',
  'Mid-City:Normal Heights',
  'Midway-Pacific Highway',
  'Mira Mesa',
  'Miramar Ranch North',
  'Mission Bay Park',
  'Mission Beach',
  'Mission Valley',
  'Navajo',
  'North Park',
  'Ocean Beach',
  'Old Town San Diego',
  'Otay Mesa',
  'Otay Mesa-Nestor',
  'Pacific Beach',
  'Pacific Highlands Ranch',
  'Peninsula',
  'Rancho Bernardo',
  'Rancho Encantada',
  'Rancho Penasquitos',
  'San Ysidro',
  'Scripps Miramar Ranch',
  'Serra Mesa',
  'Skyline-Paradise Hills',
  'Southeastern San Diego',
  'Tierrasanta',
  'Torrey Highlands',
  'Torrey Hills',
  'Torrey Pines',
  'University',
  'Uptown',
] as const;

interface NeighborhoodSelectorProps {
  value: string;
  onChange: (community: string) => void;
}

export default function NeighborhoodSelector({ value, onChange }: NeighborhoodSelectorProps) {
  return (
    <div className="w-full">
      <label htmlFor="neighborhood-select" className="sr-only">
        Select a neighborhood
      </label>
      <select
        id="neighborhood-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Select a neighborhood...</option>
        {COMMUNITIES.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}
