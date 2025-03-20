import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface DestinationPhotosProps {
  destination: string;
  language: 'en' | 'fr';
}

export function DestinationPhotos({ destination, language }: DestinationPhotosProps) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchFlickrPhotos = async (searchTerm: string): Promise<string[]> => {
    const API_KEY = '4306b70370312d7ccde3304184179b2b';
    const url = `https://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=${API_KEY}&text=${encodeURIComponent(
      searchTerm
    )}&sort=relevance&per_page=5&format=json&nojsoncallback=1&safe_search=1&content_type=1&media=photos`;

    try {
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
  };

  useEffect(() => {
    const loadFlickrPhotos = async () => {
      setIsLoading(true);
      try {
        const photos = await fetchFlickrPhotos(destination);
        setPhotos(photos);
      } catch (error) {
        console.error('Error fetching Flickr photos:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (destination) {
      loadFlickrPhotos();
    }
  }, [destination]);

  if (photos.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="relative group">
      <div className="overflow-x-auto pb-4 no-scrollbar">
        <div className="flex gap-4 min-w-max px-4">
          {photos.map((photo, index) => (
            <img
              key={index}
              src={photo}
              alt={`${destination} photo ${index + 1}`}
              className="w-64 h-48 object-cover rounded-lg shadow-md"
              loading="lazy"
            />
          ))}
        </div>
      </div>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50">
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">
              {language === 'en' ? 'Loading photos...' : 'Chargement des photos...'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}