import { Clock, ExternalLink, Landmark } from 'lucide-react';
import { getGoogleMapsUrl } from "@/lib/utils";
import { Location } from '@/types';
import { useState, useEffect } from 'react';

const FLICKR_API_KEY = '4306b70370312d7ccde3304184179b2b';
const PEXELS_API_KEY = import.meta.env.VITE_PEXELS_API_KEY || 'DKb0VyZUTezsiVcAQHYR8FcZ6MgD21ZhIvGY4XTGoo9evTxdWNcWrSTC';

// Function to fetch a thumbnail image from Flickr
async function fetchPlaceThumbnail(searchTerm: string): Promise<string | null> {
  try {
    if (!searchTerm) return null;
    
    const url = `https://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=${FLICKR_API_KEY}&text=${encodeURIComponent(
      searchTerm
    )}&sort=relevance&per_page=1&format=json&nojsoncallback=1&safe_search=1&content_type=1&media=photos`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.stat !== 'ok' || !data.photos?.photo || data.photos.photo.length === 0) {
      return null;
    }

    const photo = data.photos.photo[0];
    // Use the small square thumbnail size (s)
    return `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_q.jpg`;
  } catch (error) {
    console.error('Error fetching Flickr thumbnail:', error);
    return null;
  }
}

// Function to fetch a thumbnail image from Pexels as fallback
async function fetchPexelsThumbnail(searchTerm: string): Promise<string | null> {
  try {
    if (!searchTerm) return null;
    
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchTerm)}&per_page=1`;
    
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
    
    // Return the medium size photo
    return data.photos[0].src.medium;
  } catch (error) {
    console.error('Error fetching Pexels thumbnail:', error);
    return null;
  }
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
  compact?: boolean;
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
  hiddenGems = [],
  compact = false
}: PlaceCardProps) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);

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

  // Find the coordinates if available
  const placeData = [...(mustSeeAttractions || []), ...(hiddenGems || [])].find(place => 
    place.title?.toLowerCase().includes(title?.toLowerCase()) || 
    title?.toLowerCase().includes(place.title?.toLowerCase())
  );
  
  const coordinates = placeData?.coordinates;

  // Fetch thumbnail image when component mounts
  useEffect(() => {
    const loadThumbnail = async () => {
      if (!title || !location) return;
      
      try {
        // Use the title and location for better search results
        const searchTerm = `${title} ${location}`;
        
        // First try Flickr
        let thumbnailUrl = await fetchPlaceThumbnail(searchTerm);
        
        // If Flickr fails, try Pexels as fallback
        if (!thumbnailUrl) {
          console.log('Flickr image not found, trying Pexels...');
          thumbnailUrl = await fetchPexelsThumbnail(searchTerm);
        }
        
        setThumbnail(thumbnailUrl);
      } catch (error) {
        console.error('Error loading thumbnail:', error);
      }
    };

    loadThumbnail();
  }, [title, location]);

  return (
    <div className={`bg-white rounded-md ${compact ? 'p-2' : 'p-3'} border border-gray-200 shadow-sm`}>
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

      {thumbnail && (
        <div className="flex-shrink-0 mt-2 mb-2 flex justify-center">
          <img 
            src={thumbnail} 
            alt={title}
            className="w-full h-auto object-cover rounded-md"
            loading="lazy"
          />
        </div>
      )}
      
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