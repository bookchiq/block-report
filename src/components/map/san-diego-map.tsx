import { useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import type { Feature, FeatureCollection } from 'geojson';
import type { CommunityAnchor } from '../../types';

// Fix Leaflet default icon paths for bundlers
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

function makePinIcon(color: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 24 36">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24S24 21 24 12C24 5.373 18.627 0 12 0z"
        fill="${color}" stroke="white" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="5" fill="white" opacity="0.85"/>
    </svg>`.trim();
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36],
  });
}

const blueIcon = makePinIcon('#3b82f6');
const greenIcon = makePinIcon('#22c55e');

interface TransitStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface SanDiegoMapProps {
  libraries: CommunityAnchor[];
  recCenters: CommunityAnchor[];
  transitStops: TransitStop[];
  neighborhoodBoundaries: FeatureCollection | null;
  selectedCommunity: string | null;
  onAnchorClick: (anchor: CommunityAnchor) => void;
}

// Normalize strings for fuzzy matching (e.g. "City Heights" matches "Mid-City:City Heights")
function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

function findCommunityFeature(features: Feature[], community: string): Feature | null {
  const target = norm(community);
  return (
    features.find((f) => norm(f.properties?.cpname ?? '') === target) ??
    features.find((f) => norm(f.properties?.cpname ?? '').includes(target)) ??
    features.find((f) => target.includes(norm(f.properties?.cpname ?? ''))) ??
    null
  );
}

// Child component — uses useMap() to zoom to selected community bounds
function MapController({ feature }: { feature: Feature | null }) {
  const map = useMap();
  useEffect(() => {
    if (!feature) return;
    const layer = L.geoJSON(feature);
    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [feature, map]);
  return null;
}

export default function SanDiegoMap({
  libraries,
  recCenters,
  transitStops,
  neighborhoodBoundaries,
  selectedCommunity,
  onAnchorClick,
}: SanDiegoMapProps) {
  const handleMarkerClick = useCallback(
    (anchor: CommunityAnchor) => () => {
      onAnchorClick(anchor);
    },
    [onAnchorClick],
  );

  const selectedFeature = selectedCommunity && neighborhoodBoundaries
    ? findCommunityFeature(neighborhoodBoundaries.features, selectedCommunity)
    : null;

  return (
    <div role="region" aria-label="San Diego neighborhood map" className="relative w-full h-full">
    {/* Legend */}
    <nav aria-label="Map legend" className="absolute bottom-8 left-2 z-[1000] bg-white/90 backdrop-blur-sm rounded-lg shadow-md px-3 py-2 text-xs print:hidden">
      <ul className="space-y-1.5" role="list">
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="inline-block w-3 h-3 rounded-full bg-blue-500 shrink-0" />
          <span className="text-gray-700">Library</span>
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="inline-block w-3 h-3 rounded-full bg-green-500 shrink-0" />
          <span className="text-gray-700">Rec Center</span>
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="inline-block w-3 h-3 rounded-full bg-gray-400 shrink-0" />
          <span className="text-gray-700">Transit Stop</span>
        </li>
      </ul>
    </nav>
    <MapContainer
      center={[32.7157, -117.1611]}
      zoom={11}
      style={{ width: '100%', height: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Zoom to selected community + highlight its boundary */}
      <MapController feature={selectedFeature} />
      {selectedFeature && (
        <GeoJSON
          key={selectedCommunity}
          data={selectedFeature}
          style={{
            color: '#2563eb',
            weight: 2.5,
            opacity: 0.9,
            fillColor: '#3b82f6',
            fillOpacity: 0.12,
          }}
        />
      )}

      {/* Transit stops — small gray circles */}
      {transitStops.map((stop) => (
        <CircleMarker
          key={stop.id}
          center={[stop.lat, stop.lng]}
          radius={4}
          pathOptions={{ color: '#9ca3af', fillColor: '#9ca3af', fillOpacity: 0.6, weight: 1 }}
        >
          <Popup>{stop.name}</Popup>
        </CircleMarker>
      ))}

      {/* Library markers — blue */}
      {libraries.map((lib) => (
        <Marker
          key={lib.id}
          position={[lib.lat, lib.lng]}
          icon={blueIcon}
          eventHandlers={{ click: handleMarkerClick(lib) }}
        >
          <Popup>
            <strong>{lib.name}</strong>
            <br />
            {lib.address}
          </Popup>
        </Marker>
      ))}

      {/* Rec center markers — green */}
      {recCenters.map((rc) => (
        <Marker
          key={rc.id}
          position={[rc.lat, rc.lng]}
          icon={greenIcon}
          eventHandlers={{ click: handleMarkerClick(rc) }}
        >
          <Popup>
            <strong>{rc.name}</strong>
            <br />
            {rc.address}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
    </div>
  );
}
