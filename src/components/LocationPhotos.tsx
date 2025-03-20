import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const FLICKR_API_KEY = '4306b70370312d7ccde3304184179b2b';

interface LocationPhotosProps {
  location: string;
  coordinates?: { lat: number; lng: number };
  language: string;
  autoLoad?: boolean;
}

async function fetchFlickrPhotos(searchTerm: string, coordinates?: { lat: number; lng: number }): Promise<string[]> {
  try {
    let url = `https://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=${FLICKR_API_KEY}&text=${encodeURIComponent(
      searchTerm
    )}&sort=relevance&per_page=5&format=json&nojsoncallback=1&safe_search=1&content_type=1&media=photos`;

    // If coordinates are provided, add location-based search
    if (coordinates) {
      url += `&lat=${coordinates.lat}&lon=${coordinates.lng}&radius=5`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.stat !== 'ok') {
      throw new Error(data.message || 'Failed to fetch photos');
    }

    if (!data.photos?.photo) {
      return [];
    }

    return data.photos.photo.map((photo: any) =>
      `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_b.jpg`
    );
  } catch (error) {
    console.error('Error fetching Flickr photos:', error);
    return [];
  }
}

export function LocationPhotos({ location, coordinates, language, autoLoad = false }: LocationPhotosProps) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedPhotos, setHasLoadedPhotos] = useState(false);

  const loadPhotos = async () => {
    if (hasLoadedPhotos) {
      setIsExpanded(!isExpanded);
      return;
    }

    setIsLoading(true);
    try {
      const photos = await fetchFlickrPhotos(location, coordinates);
      setPhotos(photos);
      setHasLoadedPhotos(true);
      setIsExpanded(true);
    } catch (err) {
      console.error('Failed to load photos:', err);
      setPhotos([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (autoLoad && !hasLoadedPhotos && !isLoading) {
      loadPhotos();
    }
  }, [autoLoad, hasLoadedPhotos, isLoading]);

  return (
    <div className="flex-1">
      <button
        onClick={loadPhotos}
        disabled={isLoading}
        className="flex items-center text-sm font-bold text-[#d99a08] hover:text-[#d99a08]/80 transition-colors"
      >
        <span className="mr-1">
          {isExpanded ? (language === 'fr' ? 'Masquer les photos' : 'Hide Photos') : (language === 'fr' ? 'Voir les photos' : 'See Photos')}
        </span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-[#d99a08]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#d99a08]" />
        )}
      </button>

      {isLoading && (
        <div className="flex items-center text-sm text-gray-500">
          <span className="mr-1">
            {language === 'fr' ? 'Chargement des photos...' : 'Loading photos...'}
          </span>
          <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {isExpanded && photos.length > 0 && (
        <div className="mt-2 flex flex-row gap-2 overflow-x-auto pb-2">
          {photos.slice(0, 5).map((photo, index) => (
            <img
              key={index}
              src={photo}
              alt={`${location} photo ${index + 1}`}
              className="w-48 h-48 object-cover rounded flex-shrink-0"
            />
          ))}
        </div>
      )}
    </div>
  );
}