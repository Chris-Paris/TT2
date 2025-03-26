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
  itinerary: { 
    day: number; 
    activities: {
      activity: string;
      place: string;
      description: string;
      nearbyLandmarks: string[];
      bookingInfo: string | null;
      travelTime: string | null;
      time?: string;
    }[] 
  }[];
  events: Location[];
  language?: 'en' | 'fr';
  restaurants?: any[];
  accommodation?: any[];
  practicalAdvice?: string;
}