import type { TravelSuggestions, Coordinates } from '@/types';

interface StaticMapProps {
  suggestions: TravelSuggestions;
  apiKey: string;
}

function getBounds(coordinates: Coordinates[]) {
  const lats = coordinates.map(coord => coord.lat);
  const lngs = coordinates.map(coord => coord.lng);
  
  return {
    north: Math.max(...lats),
    south: Math.min(...lats),
    east: Math.max(...lngs),
    west: Math.min(...lngs)
  };
}

function calculateZoomLevel(bounds: ReturnType<typeof getBounds>, mapWidth: number) {
  const WORLD_DIM = { height: 256, width: 256 };
  const ZOOM_MAX = 15;

  function latRad(lat: number) {
    const sin = Math.sin(lat * Math.PI / 180);
    const radX2 = Math.log((1 + sin) / (1 - sin)) / 2;
    return Math.max(Math.min(radX2, Math.PI), -Math.PI) / 2;
  }

  function zoom(mapPx: number, worldPx: number, fraction: number) {
    return Math.floor(Math.log(mapPx / worldPx / fraction) / Math.LN2);
  }

  const latFraction = (latRad(bounds.north) - latRad(bounds.south)) / Math.PI;
  const lngDiff = bounds.east - bounds.west;
  const lngFraction = ((lngDiff < 0) ? (lngDiff + 360) : lngDiff) / 360;

  const latZoom = zoom(mapWidth, WORLD_DIM.height, latFraction);
  const lngZoom = zoom(mapWidth, WORLD_DIM.width, lngFraction);

  return Math.min(Math.min(latZoom, lngZoom, ZOOM_MAX), ZOOM_MAX);
}

export function StaticMap({ suggestions, apiKey }: StaticMapProps) {
  const mapSize = '800x400';
  const mapWidth = 800;

  // Collect all locations with coordinates
  const locations = [
    ...suggestions.mustSeeAttractions,
    ...suggestions.hiddenGems,
    ...suggestions.restaurants,
    ...suggestions.events,
    ...suggestions.accommodation,
  ].filter(item => item.coordinates);

  // Get all coordinates including the destination
  const allCoordinates = [
    suggestions.destination.coordinates,
    ...locations.map(loc => loc.coordinates!),
  ];

  // Calculate bounds and optimal zoom level
  const bounds = getBounds(allCoordinates);
  const zoom = calculateZoomLevel(bounds, mapWidth);

  // Calculate center point
  const center = {
    lat: (bounds.north + bounds.south) / 2,
    lng: (bounds.east + bounds.west) / 2,
  };

  // Create marker parameters for each location
  const markers = locations.map((location, index) => {
    if (!location.coordinates) return '';
    const label = String.fromCharCode(65 + (index % 26)); // A, B, C, ...
    return `markers=color:red%7Clabel:${label}%7C${location.coordinates.lat},${location.coordinates.lng}`;
  });

  // Add a special marker for the destination
  const destinationMarker = `markers=color:blue%7Csize:mid%7Clabel:D%7C${suggestions.destination.coordinates.lat},${suggestions.destination.coordinates.lng}`;

  // Create the Google Maps Static API URL
  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?` +
    `center=${center.lat},${center.lng}` +
    `&zoom=${zoom}` +
    `&size=${mapSize}` +
    `&scale=2` + // Retina support
    `&${markers.join('&')}` +
    `&${destinationMarker}` +
    `&key=${apiKey}`;

  return (
    <div className="w-full overflow-hidden rounded-lg shadow-lg mb-8">
      <img
        src={mapUrl}
        alt={`Map of ${suggestions.destination.name}`}
        className="w-full h-auto"
      />
      <div className="bg-white p-4">
        <h3 className="text-lg font-semibold mb-2">Location Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-blue-600">D:</span>
            <span className="text-sm truncate">{suggestions.destination.name} (Center)</span>
          </div>
          {locations.map((location, index) => (
            <div key={index} className="flex items-center space-x-2">
              <span className="font-bold text-red-600">{String.fromCharCode(65 + (index % 26))}:</span>
              <span className="text-sm truncate">{location.title}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}