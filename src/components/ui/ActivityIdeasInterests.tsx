import { useState, useEffect } from 'react';
import { Loader2, ExternalLink, Map } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Button } from './button';
import { Input } from './input';
import { useToast } from './use-toast';
import { AddToItinerary } from './AddToItinerary';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const FLICKR_API_KEY = '4306b70370312d7ccde3304184179b2b';
// TODO: Move this to environment variables
const PEXELS_API_KEY = 'pexels-api-key-here'; // Replace with your actual Pexels API key

interface ActivityIdeasInterestsProps {
  destination: string;
  language: 'en' | 'fr';
  interests?: string;
  suggestedActivities?: SuggestedActivity[];
  onAddToItinerary?: (dayIndex: number, title: string, description: string, photoUrl?: string) => void;
  itineraryDays?: number[];
  onAddActivity?: (activity: string) => void;
  savedInterests?: string;
  savedResults?: SuggestedActivity[];
  isLoading?: boolean;
  onSaveInterests?: (interests: string) => void;
  onSaveResults?: (results: SuggestedActivity[]) => void;
  onLoadingChange?: (loading: boolean) => void;
}

interface SuggestedActivity {
  title: string;
  description: string;
  location?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  additionalInfo?: string;
  photoUrl?: string;
  searchTerm?: string;
}

// Function to fetch a photo from Flickr
const fetchActivityPhoto = async (activity: SuggestedActivity, destination: string): Promise<string | null> => {
  try {
    // First try with the activity location or title
    const searchTerm = activity.location || activity.title;
    let url = `https://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=${FLICKR_API_KEY}&text=${encodeURIComponent(
      searchTerm
    )}&sort=relevance&per_page=1&format=json&nojsoncallback=1&safe_search=1&content_type=1&media=photos`;

    // If coordinates are provided, add location-based search
    if (activity.coordinates) {
      url += `&lat=${activity.coordinates.lat}&lon=${activity.coordinates.lng}&radius=5`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // If no photos found with activity location/title, try with destination name
    if (data.stat !== 'ok' || !data.photos?.photo || data.photos.photo.length === 0) {
      // Try with destination name + activity type
      const fallbackSearchTerm = `${destination} ${activity.title.split(' ')[0]}`;
      const fallbackUrl = `https://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=${FLICKR_API_KEY}&text=${encodeURIComponent(
        fallbackSearchTerm
      )}&sort=relevance&per_page=1&format=json&nojsoncallback=1&safe_search=1&content_type=1&media=photos`;
      
      const fallbackResponse = await fetch(fallbackUrl);
      if (!fallbackResponse.ok) {
        throw new Error(`HTTP error! status: ${fallbackResponse.status}`);
      }
      
      const fallbackData = await fallbackResponse.json();
      
      // If still no photos, try with just the destination name
      if (fallbackData.stat !== 'ok' || !fallbackData.photos?.photo || fallbackData.photos.photo.length === 0) {
        const destinationUrl = `https://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=${FLICKR_API_KEY}&text=${encodeURIComponent(
          destination
        )}&sort=relevance&per_page=1&format=json&nojsoncallback=1&safe_search=1&content_type=1&media=photos`;
        
        const destinationResponse = await fetch(destinationUrl);
        if (!destinationResponse.ok) {
          // Fourth attempt: Try Pexels API as a last resort
          return await fetchPexelsPhoto(searchTerm, destination);
        }
        
        const destinationData = await destinationResponse.json();
        
        if (destinationData.stat !== 'ok' || !destinationData.photos?.photo || destinationData.photos.photo.length === 0) {
          // Fourth attempt: Try Pexels API as a last resort
          return await fetchPexelsPhoto(searchTerm, destination);
        }
        
        const photo = destinationData.photos.photo[0];
        return `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_z.jpg`;
      }
      
      const fallbackPhoto = fallbackData.photos.photo[0];
      return `https://live.staticflickr.com/${fallbackPhoto.server}/${fallbackPhoto.id}_${fallbackPhoto.secret}_z.jpg`;
    }

    const photo = data.photos.photo[0];
    return `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_z.jpg`;
  } catch (error) {
    console.error('Error fetching Flickr photo:', error);
    // Try Pexels API as a fallback if any error occurs with Flickr
    return await fetchPexelsPhoto(activity.location || activity.title, destination);
  }
};

// Function to fetch a photo from Pexels API
const fetchPexelsPhoto = async (searchTerm: string, destination: string): Promise<string | null> => {
  try {
    // First try with the specific search term
    const pexelsUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchTerm)}&per_page=1`;
    
    const response = await fetch(pexelsUrl, {
      headers: {
        'Authorization': PEXELS_API_KEY
      }
    });
    
    if (!response.ok) {
      throw new Error(`Pexels API HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // If no photos found with specific term, try with destination
    if (!data.photos || data.photos.length === 0) {
      const fallbackUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(destination)}&per_page=1`;
      
      const fallbackResponse = await fetch(fallbackUrl, {
        headers: {
          'Authorization': PEXELS_API_KEY
        }
      });
      
      if (!fallbackResponse.ok) {
        return null;
      }
      
      const fallbackData = await fallbackResponse.json();
      
      if (!fallbackData.photos || fallbackData.photos.length === 0) {
        // If still no photos, try with a generic travel term
        const genericUrl = `https://api.pexels.com/v1/search?query=travel&per_page=1`;
        
        const genericResponse = await fetch(genericUrl, {
          headers: {
            'Authorization': PEXELS_API_KEY
          }
        });
        
        if (!genericResponse.ok) {
          return null;
        }
        
        const genericData = await genericResponse.json();
        
        if (!genericData.photos || genericData.photos.length === 0) {
          return null;
        }
        
        return genericData.photos[0].src.medium;
      }
      
      return fallbackData.photos[0].src.medium;
    }
    
    return data.photos[0].src.medium;
  } catch (error) {
    console.error('Error fetching Pexels photo:', error);
    return null;
  }
};

const generateJsonResponse = async (prompt: string, schema: string) => {
  try {
    const fullPrompt = `You are a travel assistant that generates JSON responses.

CRITICAL INSTRUCTIONS:
1. You MUST return ONLY valid JSON
2. Do not include any explanatory text before or after the JSON
3. Follow this exact JSON schema:
${schema}

${prompt}`;

    const result = await model.generateContent({
      contents: [{ 
        role: "user", 
        parts: [{ text: fullPrompt }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 3000,
      }
    });

    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Raw response:', text);
      throw new Error('No JSON object found in response');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error generating JSON response:', error);
    throw error;
  }
};

export function ActivityIdeasInterests({
  destination, 
  language, 
  interests: initialInterests = '',
  suggestedActivities: initialSuggestedActivities = [],
  onAddToItinerary,
  itineraryDays = [],
  onAddActivity,
  savedInterests,
  savedResults,
  isLoading: externalLoading,
  onSaveInterests,
  onSaveResults,
  onLoadingChange
}: ActivityIdeasInterestsProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(externalLoading || false);
  const [interests, setInterests] = useState(savedInterests || initialInterests);
  const [suggestedActivities, setSuggestedActivities] = useState<SuggestedActivity[]>(savedResults || initialSuggestedActivities);
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    if (onSaveInterests) {
      onSaveInterests(interests);
    }
  }, [interests, onSaveInterests]);

  useEffect(() => {
    if (onSaveResults) {
      onSaveResults(suggestedActivities);
    }
  }, [suggestedActivities, onSaveResults]);

  useEffect(() => {
    if (onLoadingChange) {
      onLoadingChange(isLoading);
    }
  }, [isLoading, onLoadingChange]);

  const fetchPhotosForActivities = async (activities: SuggestedActivity[]) => {
    const updatedActivities = [...activities];
    
    for (let i = 0; i < activities.length; i++) {
      const photoUrl = await fetchActivityPhoto(activities[i], destination);
      if (photoUrl) {
        updatedActivities[i] = { ...updatedActivities[i], photoUrl };
      }
    }
    
    setSuggestedActivities(prev => [...updatedActivities, ...prev]);
  };

  const renderTextWithLinks = (text: string) => {
    const markdownRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    
    let processedText = text.replace(markdownRegex, (_, __, url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">${url}</a>`;
    });
    
    processedText = processedText.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">${url}</a>`;
    });

    return (
      <div 
        className="text-sm whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: processedText }}
      />
    );
  };

  const handleSearch = async () => {
    if (!searchInput.trim()) return;
    
    setIsLoading(true);
    
    try {
      const schema = `{
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "required": ["activities"],
        "properties": {
          "activities": {
            "type": "array",
            "minItems": 5,
            "maxItems": 5,
            "items": {
              "type": "object",
              "required": ["title", "description"],
              "properties": {
                "title": { "type": "string" },
                "description": { "type": "string" },
                "location": { "type": "string" },
                "coordinates": {
                  "type": "object",
                  "properties": {
                    "lat": { "type": "number" },
                    "lng": { "type": "number" }
                  },
                  "required": ["lat", "lng"]
                }
              }
            }
          }
        }
      }`;

      const prompt = `You are a travel activity generator. Generate EXACTLY 5 unique and interesting activity suggestions for ${destination} based on these interests: ${searchInput}.

Your response MUST be a valid JSON object with an "activities" array containing AT LEAST 5 items.

Example format:
{
  "activities": [
    {
      "title": "First Activity",
      "description": "Description here",
      "location": "Location here",
      "coordinates": { "lat": 0, "lng": 0 }
    },
    {
      "title": "Second Activity",
      "description": "Description here",
      "location": "Location here",
      "coordinates": { "lat": 0, "lng": 0 }
    },
    {
      "title": "Third Activity",
      "description": "Description here",
      "location": "Location here",
      "coordinates": { "lat": 0, "lng": 0 }
    },
    {
      "title": "Fourth Activity",
      "description": "Description here",
      "location": "Location here",
      "coordinates": { "lat": 0, "lng": 0 }
    },
    {
      "title": "Fifth Activity",
      "description": "Description here",
      "location": "Location here",
      "coordinates": { "lat": 0, "lng": 0 }
    }
  ]
}

Requirements for each activity:
1. Each activity should be specific and detailed
2. Include practical information like location and coordinates if applicable
3. Each description should be engaging and informative
4. ${language === 'fr' ? 'ALL text MUST be in French' : 'All text must be in English'}
5. Make sure activities are culturally appropriate and feasible
6. Make activities diverse and complementary to each other`;

      const response = await generateJsonResponse(prompt, schema);
      console.log('API Response:', response);
      
      if (!response.activities || !Array.isArray(response.activities) || response.activities.length !== 5) {
        throw new Error('Invalid API response: Expected exactly 5 activities');
      }
      
      // Add a searchTerm property to each activity to group them
      const newActivities = response.activities.map((activity: SuggestedActivity) => ({
        ...activity,
        searchTerm: searchInput
      }));
      
      // Add new activities at the beginning instead of the end
      setSuggestedActivities(prev => [...newActivities, ...prev]);
      
      // Fetch photos for new activities only
      fetchPhotosForActivities(newActivities);
      
      toast({
        title: language === 'fr' ? 'Activités chargées' : 'Activities loaded',
        description: language === 'fr' ? '5 activités suggérées sont maintenant disponibles' : '5 suggested activities are now available',
      });
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast({
        title: language === 'fr' ? 'Erreur' : 'Error',
        description: language === 'fr' ? 'Impossible de charger les activités. Veuillez réessayer.' : 'Failed to load activities. Please try again.',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestActivities = (suggestion: string) => {
    setSearchInput(suggestion);
    handleSearch();
  };

  const handleClearResults = () => {
    setSuggestedActivities([]);
    setInterests('');
    toast({
      title: language === 'fr' ? 'Résultats effacés' : 'Results cleared',
      description: language === 'fr' ? 'Toutes les activités suggérées ont été effacées' : 'All suggested activities have been cleared',
    });
  };

  const renderSuggestedActivity = (activity: SuggestedActivity, index: number) => {
    return (
      <div key={`${activity.title}-${index}`} className="border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          {activity.photoUrl && (
            <div className="md:w-1/4 relative rounded-md overflow-hidden">
              <img 
                src={activity.photoUrl} 
                alt={activity.title} 
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{activity.title}</h3>
            {activity.location && (
              <p className="text-sm text-gray-600 mt-1">{activity.location}</p>
            )}
            <p className="mt-2">
              {renderTextWithLinks(activity.description)}
            </p>

            <div className="flex gap-2 mt-4">
              {activity.coordinates && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${activity.coordinates.lat},${activity.coordinates.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center h-10 px-4 bg-background border border-primary/20 hover:border-primary/50 text-primary rounded-md transition-colors text-[14px] sm:text-base"
                >
                  <Map className="w-4 h-4" />
                  <span className="hidden sm:inline">{language === 'fr' ? 'Voir sur la carte' : 'View on map'}</span>
                </a>
              )}
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(activity.title)}+${encodeURIComponent(destination)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center h-10 px-4 bg-background border border-primary/20 hover:border-primary/50 text-primary rounded-md transition-colors text-[14px] sm:text-base"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">{language === 'fr' ? 'Plus d\'infos' : 'More info'}</span>
              </a>
              
              {onAddToItinerary && itineraryDays.length > 0 ? (
                <AddToItinerary
                  title={activity.title}
                  description={activity.description}
                  photoUrl={activity.photoUrl}
                  destination={destination}
                  itineraryDays={itineraryDays}
                  onAddToItinerary={onAddToItinerary}
                  language={language}
                />
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (onAddToItinerary) {
                      // Default to adding to the last day if no dropdown selection is available
                      const lastDay = Math.max(...itineraryDays, 1);
                      onAddToItinerary(lastDay, activity.title, activity.description, activity.photoUrl);
                    } else if (onAddActivity) {
                      onAddActivity(activity.title);
                      toast({
                        title: language === 'fr' ? 'Activité ajoutée' : 'Activity added',
                        description: language === 'fr' ? 'L\'activité a été ajoutée à votre itinéraire' : 'The activity has been added to your itinerary',
                      });
                    }
                  }}
                  className="h-10"
                  disabled={!onAddToItinerary && !onAddActivity}
                >
                  {language === 'fr' ? 'Ajouter à l\'itinéraire' : 'Add to itinerary'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="w-full space-y-4">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder={language === 'fr' ? 'Entrez vos centres d\'intérêt (ex: randonnée, histoire, cuisine...)' : 'Enter your interests (e.g. hiking, history, cooking...)' }
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={handleSearch}
              disabled={searchInput.trim() === ''}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {language === 'fr' ? 'Chargement...' : 'Loading...'}
                </>
              ) : (
                language === 'fr' ? 'Rechercher' : 'Search'
              )}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSuggestActivities(language === 'fr' ? 'meilleurs restaurants' : 'best restaurants')}
              className="flex-1 sm:flex-none"
            >
              {language === 'fr' ? 'Meilleurs restaurants' : 'Best restaurants'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSuggestActivities(language === 'fr' ? 'aller danser' : 'go party')}
              className="flex-1 sm:flex-none"
            >
              {language === 'fr' ? 'Aller danser' : 'Go party'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSuggestActivities(language === 'fr' ? 'activités avec enfants' : 'activities with children')}
              className="flex-1 sm:flex-none"
            >
              {language === 'fr' ? 'Activités avec enfants' : 'Activities with children'}
            </Button>
            
            {suggestedActivities.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearResults}
                className="flex-1 sm:flex-none"
              >
                {language === 'fr' ? 'Effacer tout' : 'Clear all'}
              </Button>
            )}
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            <span>{language === 'fr' ? 'Chargement des activités...' : 'Loading activities...'}</span>
          </div>
        )}

        {suggestedActivities.length > 0 && (
          <div className="w-full space-y-4 mt-4">
            {Array.from(new Set(suggestedActivities.map(a => a.searchTerm || ''))).map((term, termIndex) => (
              <div key={`term-${termIndex}`} className="mb-6">
                {term && (
                  <div className="mb-2 pb-2 border-b">
                    <h3 className="text-md font-medium">
                      {language === 'fr' ? `Résultats pour: "${term}"` : `Results for: "${term}"`}
                    </h3>
                  </div>
                )}
                
                {suggestedActivities
                  .filter(activity => (activity.searchTerm || '') === term)
                  .map((activity, index) => (
                    renderSuggestedActivity(activity, index)
                  ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}