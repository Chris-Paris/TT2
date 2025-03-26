import { Clock, ExternalLink, Landmark } from 'lucide-react';
import { getGoogleMapsUrl } from "@/lib/utils";
import { Location } from '@/types';
import { useState, useEffect } from 'react';

const FLICKR_API_KEY = '4306b70370312d7ccde3304184179b2b';
const PEXELS_API_KEY = import.meta.env.VITE_PEXELS_API_KEY || 'DKb0VyZUTezsiVcAQHYR8FcZ6MgD21ZhIvGY4XTGoo9evTxdWNcWrSTC';

// Function to fetch a thumbnail image from Flickr
async function fetchPlaceThumbnail(searchTerm: string, coordinates?: { lat: number; lng: number }): Promise<string | null> {
  try {
    if (!searchTerm) return null;
    
    let url = new URL('https://api.flickr.com/services/rest/');
    url.searchParams.set('method', 'flickr.photos.search');
    url.searchParams.set('api_key', FLICKR_API_KEY);
    url.searchParams.set('text', searchTerm);
    url.searchParams.set('sort', 'relevance');
    url.searchParams.set('per_page', '5');
    url.searchParams.set('format', 'json');
    url.searchParams.set('nojsoncallback', '1');
    url.searchParams.set('safe_search', '1');
    url.searchParams.set('content_type', '1');
    url.searchParams.set('media', 'photos');

    // If coordinates are provided, add location-based search
    if (coordinates) {
      url.searchParams.set('lat', String(coordinates.lat));
      url.searchParams.set('lon', String(coordinates.lng));
      url.searchParams.set('radius', '5');
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

// Function to fetch a thumbnail image from Pexels as fallback
async function fetchPexelsThumbnail(searchTerm: string): Promise<string | null> {
  try {
    if (!searchTerm) return null;
    
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchTerm)}&per_page=1&orientation=landscape`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': PEXELS_API_KEY
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.photos || data.photos.length === 0) {
      return null;
    }
    
    return data.photos[0].src.large;
  } catch (error) {
    console.error('Error fetching Pexels thumbnail:', error);
    return null;
  }
}

interface Location {
  title: string;
  description: string;
  location: string;
  coordinates?: { lat: number; lng: number };
  thumbnail?: string;
}

interface PlaceCardProps {
  title: string;
  description: string;
  location: string;
  language: 'en' | 'fr';
  nearbyLandmarks?: string[];
  travelTime?: string | null;
  bookingUrl?: string | null;
  bookingInfo?: string | null;
  mustSeeAttractions?: Location[];
  hiddenGems?: Location[];
}

export function PlaceCard({
  title,
  description,
  location,
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

  // Find the coordinates if available
  const placeData = [...(mustSeeAttractions || []), ...(hiddenGems || [])].find(place => 
    place.title?.toLowerCase().includes(title?.toLowerCase()) || 
    title?.toLowerCase().includes(place.title?.toLowerCase())
  );
  
  const coordinates = placeData?.coordinates;

  // Fetch thumbnail when component mounts or when title changes
  useEffect(() => {
    const fetchThumbnail = async () => {
      if (hasLoadedPhotos) {
        return;
      }

      setIsLoading(true);
      try {
        // First try to find matching must-see attraction or hidden gem
        const matchingAttraction = mustSeeAttractions?.find(attraction => 
          attraction.title?.toLowerCase().includes(title?.toLowerCase()) || 
          title?.toLowerCase().includes(attraction.title?.toLowerCase())
        );

        const matchingGem = hiddenGems?.find(gem => 
          gem.title?.toLowerCase().includes(title?.toLowerCase()) || 
          title?.toLowerCase().includes(gem.title?.toLowerCase())
        );

        // If found in must-see or hidden gems, use their thumbnail
        if (matchingAttraction?.thumbnail || matchingGem?.thumbnail) {
          setThumbnail(matchingAttraction?.thumbnail || matchingGem?.thumbnail);
          setHasLoadedPhotos(true);
          return;
        }

        // Otherwise fetch new thumbnail
        const flickrThumbnail = await fetchPlaceThumbnail(`${title} ${location}`, coordinates);
        if (flickrThumbnail) {
          setThumbnail(flickrThumbnail);
          setHasLoadedPhotos(true);
          return;
        }

        // Fallback to Pexels if Flickr fails
        const pexelsThumbnail = await fetchPexelsThumbnail(`${title} ${location}`);
        if (pexelsThumbnail) {
          setThumbnail(pexelsThumbnail);
          setHasLoadedPhotos(true);
        }
      } catch (error) {
        console.error('Error loading thumbnail:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchThumbnail();
  }, [title, location, mustSeeAttractions, hiddenGems, coordinates]);

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
            {language === 'fr' ? 'Incontournable' : 'Must See'}
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

      {thumbnail && (
        <div className="relative w-full mb-4">
          <img
            src={thumbnail}
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
              href={coordinates 
                ? getGoogleMapsUrl({ title: location, coordinates }) 
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {location}
            </a>
          </div>
        </div>
      </div>

      <div className="lg:flex lg:space-x-4">
        <div className="lg:flex-1">
          {description && (
            <p className="text-gray-700 text-sm mb-3">{description}</p>
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