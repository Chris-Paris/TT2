import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { TravelSuggestions } from '@/types';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface DynamicMapProps {
  suggestions: TravelSuggestions;
  fullscreen?: boolean;
  onClose?: () => void;
  itineraryItems?: {
    day: number;
    index: number;
    title: string;
    description: string;
    location: string;
    coordinates?: { lat: number; lng: number };
    displayIndex?: number;
  }[];
}

interface Point {
  coordinates: { lat: number; lng: number };
  title: string;
  type: string;
  number: string | number;
  description?: string;
  day?: number;
  index?: number;
}

export function DynamicMap({ suggestions, fullscreen = false, onClose, itineraryItems = [] }: DynamicMapProps) {
  const mapRef = useRef<L.Map>(null);

  // Create a custom icon with a number
  const createNumberedIcon = (number: string | number, color: string) => {
    return new L.DivIcon({
      className: 'custom-marker-icon',
      html: `
        <div style="
          background-color: ${color};
          width: 20px;
          height: 32px;
          position: relative;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ">
          <span style="
            color: white;
            transform: rotate(45deg);
            font-weight: bold;
            font-size: 10px;
          ">${number}</span>
        </div>
        <div style="
          position: absolute;
          width: 32px;
          height: 32px;
          pointer-events: none;
          margin-top: -32px;
          margin-left: -6px;
          background: radial-gradient(circle at 50% 0, rgba(0,0,0,0.2) 10%, transparent 50%);
        "></div>
      `,
      iconSize: [20, 32],
      iconAnchor: [10, 32],
      popupAnchor: [1, -34],
    });
  };

  // Collect all locations with coordinates
  const baseLocations = [
    ...suggestions.mustSeeAttractions.map((item, index) => ({ ...item, type: 'attraction', number: index + 1 })),
    ...suggestions.hiddenGems.map((item, index) => ({ ...item, type: 'gem', number: index + 1 })),
    ...suggestions.events.map((item, index) => ({ ...item, type: 'event', number: index + 1 })),
  ].filter(item => item.coordinates) as Point[];

  // Add itinerary items if provided
  const itineraryLocations = itineraryItems
    .sort((a, b) => {
      // Sort by day first, then by index within the day
      const dayCompare = a.day - b.day;
      if (dayCompare !== 0) return dayCompare;
      return a.index - b.index;
    })
    .map((item, overallIndex) => ({
      coordinates: item.coordinates || suggestions.destination.coordinates, // Use destination coordinates as fallback
      title: item.title,
      description: item.description,
      type: 'itinerary',
      number: overallIndex + 1, // Use overall index + 1 to maintain sequential numbering
      day: item.day,
      index: item.index
    })) as Point[];

  // Debug logging
  console.log('Itinerary locations for map:', itineraryLocations);

  // Always use itinerary locations if they exist, otherwise use base locations
  const locations = itineraryLocations.length > 0 ? itineraryLocations : baseLocations;

  // Calculate bounds
  const bounds = locations.length > 0 
    ? L.latLngBounds(locations.map(loc => L.latLng(loc.coordinates!.lat, loc.coordinates!.lng)))
    : L.latLngBounds([[suggestions.destination.coordinates.lat, suggestions.destination.coordinates.lng]]);

  // Get ordered points for trajectory
  const trajectoryPositions = locations
    .filter(location => location.coordinates) // Only include points with coordinates for the trajectory
    .sort((a, b) => {
      // Sort by number to ensure trajectory follows numbered order
      const numberA = typeof a.number === 'number' ? a.number : parseInt(a.number as string);
      const numberB = typeof b.number === 'number' ? b.number : parseInt(b.number as string);
      return numberA - numberB;
    })
    .map(point => 
      [point.coordinates!.lat, point.coordinates!.lng] as [number, number]
    );

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.fitBounds(bounds);
      // Add padding to ensure all markers are visible
      mapRef.current.fitBounds(bounds, {
        padding: [100, 100]
      });
    }
  }, [suggestions, itineraryItems]);

  return (
    <div 
      className={`rounded-lg overflow-hidden shadow-lg mb-4 md:mb-8 ${fullscreen ? 'fixed inset-0 z-50' : 'w-full h-full'}`} 
      style={{ position: fullscreen ? 'fixed' : 'relative', zIndex: fullscreen ? 50 : 10 }}
    >
      {fullscreen && (
        <div className="absolute top-4 right-4 z-50">
          <button 
            onClick={onClose}
            className="bg-white p-2 rounded-full shadow-md hover:bg-gray-100 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      )}
      <MapContainer
        ref={mapRef}
        center={locations.length > 0 
          ? [locations[0].coordinates!.lat, locations[0].coordinates!.lng]
          : [suggestions.destination.coordinates.lat, suggestions.destination.coordinates.lng]
        }
        zoom={locations.length > 1 ? 10 : 12}
        style={{ height: fullscreen ? '100vh' : '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Draw trajectory between points */}
        <Polyline 
          positions={trajectoryPositions}
          pathOptions={{ 
            color: '#003049', 
            weight: 3, 
            opacity: 0.7,
            dashArray: '5, 5',
            lineCap: 'round'
          }} 
        />

        {/* Location Markers */}
        {locations.map((location) => (
          <Marker
            key={`${location.title}-${location.type}-${location.number}`}
            position={[location.coordinates!.lat, location.coordinates!.lng]}
            icon={createNumberedIcon(
              location.type === 'event' ? 'E' : 
              location.type === 'itinerary' ? location.number :
              location.number,
              location.type === 'event' ? '#E53E3E' : // Red
              location.type === 'itinerary' ? '#205283' : // Blue for itinerary items
              '#780000' // Primary color for attractions and hidden gems
            )}
          >
            <Popup>
              <div className="font-semibold">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#FDF0D5] text-sm mr-2">
                  {location.type === 'event' ? 'E' : location.number}
                </span>
                {location.title}
              </div>
              {location.day !== undefined && (
                <div className="text-sm font-medium text-blue-600">Day {location.day}</div>
              )}
              <div className="text-sm text-gray-600">{location.description}</div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}