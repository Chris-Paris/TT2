import { Coordinates } from '@/types';

interface PlacePhotosParams extends Coordinates {
  title: string;
}

interface NominatimResult {
  place_id: string;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  boundingbox: string[];
  type: string;
  importance: number;
  address?: {
    tourism?: string;
    attraction?: string;
    building?: string;
    city?: string;
  };
  name?: string;
}

async function fetchWikimediaImages(searchTerm: string): Promise<string[]> {
  try {
    const response = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=File:${encodeURIComponent(
        searchTerm
      )}&gsrlimit=10&prop=imageinfo&iiprop=url&format=json&origin=*&gsrnamespace=6`
    );
    
    const data = await response.json();
    const pages = data.query?.pages || {};
    
    const images = Object.values(pages)
      .map((page: any) => page.imageinfo?.[0]?.url)
      .filter((url: string | undefined): url is string => {
        if (!url) return false;
        const lowerUrl = url.toLowerCase();
        return !lowerUrl.endsWith('.svg') && 
               !lowerUrl.endsWith('.pdf') &&
               !lowerUrl.endsWith('.ogg') &&
               !lowerUrl.includes('flag_of_') &&
               !lowerUrl.includes('coat_of_arms_of_') &&
               !lowerUrl.includes('logo_');
      });

    return images.slice(0, 3);
  } catch (error) {
    console.error('Error fetching Wikimedia images:', error);
    return [];
  }
}

export async function getPlacePhotos({ lat, lng, title }: PlacePhotosParams): Promise<string[]> {
  try {
    // First, reverse geocode the coordinates to get place details
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?` + 
      `lat=${lat}&lon=${lng}&format=json&addressdetails=1`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch location details');
    }

    const data = await response.json();
    // Use the provided location title first, then fallback to other location details
    const searchTerm = title || 
                      (data as NominatimResult).name || 
                      (data as NominatimResult).address?.tourism || 
                      (data as NominatimResult).address?.attraction || 
                      (data as NominatimResult).address?.building ||
                      (data as NominatimResult).address?.city ||
                      data.display_name;
    
    // Get images from Wikimedia Commons
    return await fetchWikimediaImages(searchTerm);
  } catch (error) {
    console.error('Error fetching photos:', error);
    return [];
  }
}

export async function getLocationPhotos(location: string): Promise<string[]> {
  try {
    // First, get location details from Nominatim
    const response = await fetch(`https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(location)}&format=json&limit=1&addressdetails=1`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch location details');
    }

    const data: NominatimResult[] = await response.json();
    if (!data.length) {
      throw new Error('Location not found');
    }

    // Use the most specific name available
    const result = data[0];
    const searchTerm = 
                      result.name ||
                      result.address?.tourism ||
                      result.address?.attraction ||
                      result.address?.building ||
                      result.address?.city ||
                      result.display_name;
    return await fetchWikimediaImages(searchTerm);
  } catch (error) {
    console.error('Error fetching photos:', error);
    return [];
  }
}