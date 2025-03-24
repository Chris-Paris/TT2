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
    .filter(item => item.coordinates)
    .sort((a, b) => {
      // Sort by displayIndex to ensure correct order
      return (a.displayIndex || 0) - (b.displayIndex || 0);
    })
    .map((item) => ({
      coordinates: item.coordinates!,
      title: item.title,
      description: item.description,
      type: 'itinerary',
      number: item.displayIndex || 1, // Use displayIndex directly
      day: item.day,
      index: item.index
    })) as Point[];

  // Debug logging
  console.log('Itinerary locations for map:', itineraryLocations);

  // Use itinerary locations if in fullscreen mode and they exist, otherwise use base locations
  const locations = fullscreen && itineraryLocations.length > 0 ? itineraryLocations : baseLocations;

  // Calculate bounds
  const bounds = locations.length > 0 
    ? L.latLngBounds(locations.map(loc => L.latLng(loc.coordinates!.lat, loc.coordinates!.lng)))
    : L.latLngBounds([[suggestions.destination.coordinates.lat, suggestions.destination.coordinates.lng]]);

  // Function to calculate distance between two points
  const calculateDistance = (point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number => {
    return Math.sqrt(
      Math.pow(point1.lat - point2.lat, 2) + 
      Math.pow(point1.lng - point2.lng, 2)
    );
  };

  // Get ordered points for trajectory
  let trajectoryPositions: [number, number][] = [];
  
  if (fullscreen && itineraryLocations.length > 0) {
    // For fullscreen map with itinerary items, use the numerical order
    // Sort by index to ensure correct order
    const orderedItineraryPoints = [...itineraryLocations].sort((a, b) => 
      (a.number as number) - (b.number as number)
    );
    
    trajectoryPositions = orderedItineraryPoints.map(point => 
      [point.coordinates!.lat, point.coordinates!.lng] as [number, number]
    );
  } else {
    // For regular map view, use the existing approach
    // Organize points in a logical order using a nearest neighbor approach
    const organizePointsInLogicalOrder = () => {
      // Start with the first location instead of the main destination
      if (locations.length === 0) return [];
      
      const orderedPoints: Point[] = [locations[0]];
      const remainingPoints = locations.slice(1);
      
      // While there are remaining points, find the nearest one to the last added point
      while (remainingPoints.length > 0) {
        const lastPoint = orderedPoints[orderedPoints.length - 1];
        let nearestPointIndex = 0;
        let shortestDistance = Infinity;
        
        // Find the nearest point
        remainingPoints.forEach((point, index) => {
          const distance = calculateDistance(lastPoint.coordinates!, point.coordinates!);
          if (distance < shortestDistance) {
            shortestDistance = distance;
            nearestPointIndex = index;
          }
        });
        
        // Add the nearest point to our ordered list and remove it from remaining points
        orderedPoints.push(remainingPoints[nearestPointIndex]);
        remainingPoints.splice(nearestPointIndex, 1);
      }
      
      return orderedPoints;
    };

    // Get ordered points for trajectory
    const orderedPoints = organizePointsInLogicalOrder();
    
    // Create polyline positions
    trajectoryPositions = orderedPoints.map(point => 
      [point.coordinates!.lat, point.coordinates!.lng] as [number, number]
    );
  }

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