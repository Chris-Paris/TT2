export interface Coordinates {
  lat: number;
  lng: number;
}

export interface TravelSuggestion {
  title: string;
  description: string;
  location: string;
  coordinates: Coordinates;
  price?: string;
  rating?: number;
  imageUrl?: string;
}

export interface Location {
  title: string;
  description: string;
  location: string;
  coordinates: Coordinates;
}

export interface TravelSuggestions {
  destination: {
    name: string;
    coordinates: Coordinates;
  };
  mustSeeAttractions: Location[];
  hiddenGems: Location[];
  restaurants: Location[];
  itinerary: { day: number; activities: string[] }[];
  events: Location[];
  practicalAdvice: string;
  accommodation: Location[];
  language?: 'en' | 'fr';
}