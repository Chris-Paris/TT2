import { Clock, ExternalLink, Landmark, Map } from 'lucide-react';
import { getGoogleMapsUrl } from "@/lib/utils";
import { Location as LocationType } from '@/types';
import { useState, useEffect } from 'react';

const FLICKR_API_KEY = '4306b70370312d7ccde3304184179b2b';

// Function to fetch a thumbnail image from Flickr
async function fetchPlaceThumbnail(searchTerm: string, coordinates?: { lat: number; lng: number }): Promise<string | null> {
  try {
    if (!searchTerm) return null;
    
    let url = new URL('https://api.flickr.com/services/rest/');
    url.searchParams.set('method', 'flickr.photos.search');
    url.searchParams.set('api_key', FLICKR_API_KEY);
    url.searchParams.set('sort', 'relevance');
    url.searchParams.set('per_page', '5');
    url.searchParams.set('format', 'json');
    url.searchParams.set('nojsoncallback', '1');
    url.searchParams.set('safe_search', '1');
    url.searchParams.set('content_type', '1');
    url.searchParams.set('media', 'photos');

    // First try with coordinates if available
    if (coordinates) {
      url.searchParams.set('lat', String(coordinates.lat));
      url.searchParams.set('lon', String(coordinates.lng));
      url.searchParams.set('radius', '5');
      url.searchParams.set('has_geo', '1');
    } else {
      url.searchParams.set('text', searchTerm);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.stat !== 'ok' || !data.photos?.photo || data.photos.photo.length === 0) {
      return null;
    }

    // Try to find a landscape photo first
    const landscapePhoto = data.photos.photo.find((photo: any) => {
      return photo.width_o >= photo.height_o; // Original width > height indicates landscape
    });

    if (landscapePhoto) {
      return `https://live.staticflickr.com/${landscapePhoto.server}/${landscapePhoto.id}_${landscapePhoto.secret}_b.jpg`;
    }

    // If no landscape photo found, use the first one
    const firstPhoto = data.photos.photo[0];
    return `https://live.staticflickr.com/${firstPhoto.server}/${firstPhoto.id}_${firstPhoto.secret}_b.jpg`;
  } catch (error) {
    console.error('Error fetching Flickr thumbnail:', error);
    return null;
  }
}

interface PlaceCardProps {
  title: string;
  description: string;
  location: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  imageUrl?: string;
  language: 'en' | 'fr';
  nearbyLandmarks?: string[];
  travelTime?: string | null;
  bookingUrl?: string | null;
  bookingInfo?: string | null;
  mustSeeAttractions?: LocationType[];
  hiddenGems?: LocationType[];
}

export function PlaceCard({
  title,
  description,
  location,
  imageUrl,
  language,
  nearbyLandmarks = [],
  travelTime = null,
  bookingUrl = null,
  bookingInfo = null,
  mustSeeAttractions = [],
  hiddenGems = []
}: PlaceCardProps) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedPhotos, setHasLoadedPhotos] = useState(false);

  // Find if this place matches a must-see attraction or hidden gem
  const placeData = mustSeeAttractions?.find(place => 
    title?.toLowerCase().includes(place.title?.toLowerCase()) || 
    title?.toLowerCase().includes(place.title?.toLowerCase())
  );
  
  const coords = placeData?.coordinates;

  // Fetch thumbnail when component mounts or when title changes
  useEffect(() => {
    const fetchThumbnail = async () => {
      if (hasLoadedPhotos) return;

      try {
        // Check if we can find this place in the must-see attractions or hidden gems
        const matchingAttraction = mustSeeAttractions?.find(attraction => 
          attraction.title?.toLowerCase().includes(title?.toLowerCase()) || 
          title?.toLowerCase().includes(attraction.title?.toLowerCase())
        );

        const matchingGem = hiddenGems?.find(gem => 
          gem.title?.toLowerCase().includes(title?.toLowerCase()) || 
          title?.toLowerCase().includes(gem.title?.toLowerCase())
        );

        // If found in must-see or hidden gems, use their thumbnail if available
        // Note: LocationType might not have thumbnail property, so we use type assertion
        const attractionThumbnail = (matchingAttraction as any)?.thumbnail;
        const gemThumbnail = (matchingGem as any)?.thumbnail;
        
        if (attractionThumbnail || gemThumbnail) {
          setThumbnail(attractionThumbnail || gemThumbnail || null);
          setHasLoadedPhotos(true);
          return;
        }

        // Try to fetch photo using coordinates first
        let photoUrl = null;
        if (coords) {
          photoUrl = await fetchPlaceThumbnail('', coords);
        }

        // If no photo found with coordinates, try with activity name
        if (!photoUrl) {
          photoUrl = await fetchPlaceThumbnail(`${title} ${location}`);
        }

        // Set the final photo URL
        if (photoUrl) {
          setThumbnail(photoUrl);
          setHasLoadedPhotos(true);
        } else {
          setThumbnail(null);
        }
      } catch (error) {
        console.error('Error loading thumbnail:', error);
        setThumbnail(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchThumbnail();
  }, [title, location, mustSeeAttractions, hiddenGems, coords]);

  // Find if this place is a must-see attraction or hidden gem
  const isMustSee = mustSeeAttractions?.some(attraction => 
    attraction.title?.toLowerCase().includes(title?.toLowerCase()) || 
    title?.toLowerCase().includes(attraction.title?.toLowerCase())
  );
  
  const isHiddenGem = hiddenGems?.some(gem => 
    gem.title?.toLowerCase().includes(title?.toLowerCase()) || 
    title?.toLowerCase().includes(gem.title?.toLowerCase())
  );

  // Add badges for must-see and hidden gems
  const renderBadges = () => {
    return (
      <div className="flex flex-wrap gap-1 mb-2">
        {isMustSee && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#003049] text-white">
            {language === 'fr' ? 'Top activité Google' : 'Must See on Google'}
          </span>
        )}
        {isHiddenGem && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#669BBC] text-white">
            {language === 'fr' ? 'Joyau Caché' : 'Hidden Gem'}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className={`relative w-full ${isLoading ? 'opacity-75' : ''}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-sm text-gray-500">
            <span className="mr-1">
              {language === 'fr' ? 'Chargement...' : 'Loading...'}
            </span>
            <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      )}

      {(thumbnail || imageUrl) && (
        <div className="relative w-full mb-4">
          <img
            src={thumbnail || imageUrl}
            alt={title}
            className="w-full h-[140px] lg:h-[250px] object-cover rounded-lg"
            style={{
              aspectRatio: '16/9',
              height: 'auto'
            }}
            loading="lazy"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent h-1/4" />
        </div>
      )}
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          {renderBadges()}
          <div className="flex items-center text-gray-600 text-sm">
            <a 
              href={coords 
                ? getGoogleMapsUrl({ title: location, coordinates: coords }) 
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center hover:underline gap-1"
            >
              {location}
              <Map className="w-4 h-4 text-gray-500" />
            </a>
          </div>
        </div>
      </div>

      <div className="lg:flex lg:space-x-4">
        <div className="lg:flex-1">
          {description && (
            <p className="text-gray-700 text-sm mb-3" data-component-name="PlaceCard">
              {description}
            </p>
          )}
          
          <div className="space-y-2 mb-3">
            {nearbyLandmarks && nearbyLandmarks.length > 0 && (
              <div className="flex items-start text-gray-600 text-sm">
                <Landmark className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium">{language === 'fr' ? 'Points d\'intérêt à proximité:' : 'Nearby landmarks:'}</div>
                  <ul className="list-disc list-inside ml-1 mt-1">
                    {nearbyLandmarks.map((landmark, index) => (
                      <li key={index} className="text-xs">{landmark}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            {travelTime && (
              <div className="flex items-center text-gray-600 text-sm">
                <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
                <div>{travelTime}</div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 mt-3">
        {bookingUrl && (
          <button
            onClick={() => window.open(bookingUrl, '_blank', 'noopener,noreferrer')}
            className="inline-flex items-center justify-center px-3 py-1 bg-[#003049] text-white rounded-md transition-colors text-xs"
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            <div>{language === 'fr' ? 'Réserver' : 'Book'}</div>
          </button>
        )}
        {bookingInfo && !bookingUrl && (
          <div className="inline-flex items-center justify-center px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-xs">
            <div>{bookingInfo}</div>
          </div>
        )}
      </div>
    </div>
  );
}