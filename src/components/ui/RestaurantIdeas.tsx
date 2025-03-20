import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Button } from './button';
import { Input } from './input';
import { useToast } from './use-toast';
import { LocationPhotos } from '../LocationPhotos';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "./dialog";
import { analytics } from '@/lib/analytics';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

interface RestaurantIdeasProps {
  destination: string;
  language: 'en' | 'fr';
  onAddRestaurant: (restaurant: string) => void;
}

interface SuggestedRestaurant {
  title: string;
  description: string;
  cuisine: string;
  priceRange: string;
  location?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  additionalInfo?: string;
}

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

export function RestaurantIdeas({ destination, language, onAddRestaurant }: RestaurantIdeasProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMoreInfo, setLoadingMoreInfo] = useState<number | null>(null);
  const [preferences, setPreferences] = useState('');
  const [suggestedRestaurants, setSuggestedRestaurants] = useState<SuggestedRestaurant[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const handleGenerateRecommendations = async () => {
    if (!preferences.trim()) {
      toast({
        title: language === 'fr' ? 'Erreur' : 'Error',
        description: language === 'fr' 
          ? 'Veuillez entrer vos préférences culinaires'
          : 'Please enter your dining preferences',
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    analytics.trackSuggestActivities(destination);

    try {
      const schema = `{
        "restaurants": [
          {
            "title": "string",
            "description": "string",
            "cuisine": "string",
            "priceRange": "string",
            "location": "string",
            "coordinates": {
              "lat": "number",
              "lng": "number"
            }
          }
        ]
      }`;

      const prompt = `You are a local food expert. Generate EXACTLY 3 restaurant, café, or bar recommendations in ${destination} based on these preferences: ${preferences}.

Your response MUST be a valid JSON object with a "restaurants" array containing EXACTLY 3 items.

Requirements for each recommendation:
1. Each place should be specific and real
2. Include detailed descriptions of the ambiance, specialties, and why it matches the preferences
3. Specify the cuisine type and price range
4. Include location details and coordinates if possible
5. ${language === 'fr' ? 'ALL text MUST be in French' : 'All text must be in English'}
6. Make recommendations diverse and complementary to each other
7. Focus on places that locals love and tourists might miss`;

      const response = await generateJsonResponse(prompt, schema);
      
      if (!response.restaurants || !Array.isArray(response.restaurants) || response.restaurants.length !== 3) {
        throw new Error('Invalid API response: Expected exactly 3 restaurants');
      }
      
      setSuggestedRestaurants(response.restaurants);
      setIsModalOpen(true);
      
      toast({
        title: language === 'fr' ? 'Recommandations générées !' : 'Recommendations generated!',
        description: language === 'fr' 
          ? 'De nouveaux établissements ont été suggérés.'
          : 'New places have been suggested.',
      });
    } catch (err: unknown) {
      console.error('Error generating recommendations:', err);
      toast({
        title: language === 'fr' ? 'Erreur' : 'Error',
        description: language === 'fr'
          ? `Erreur: ${err instanceof Error ? err.message : 'Une erreur inattendue s\'est produite'}`
          : `Error: ${err instanceof Error ? err.message : 'An unexpected error occurred'}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getMoreInfo = async (restaurant: SuggestedRestaurant, index: number) => {
    setLoadingMoreInfo(index);
    try {
      const prompt = `You are a local food critic. Provide detailed information about "${restaurant.title}" in ${destination}.
Include:
1. Signature dishes
2. Best times to visit
3. Reservation tips
4. Special features (e.g., rooftop seating, live music)
5. Local favorites and insider tips

Keep the response concise but informative. ${language === 'fr' ? 'Respond in French.' : 'Respond in English.'}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const additionalInfo = response.text();
      
      setSuggestedRestaurants(prev => prev.map((rest, i) => 
        i === index ? { ...rest, additionalInfo } : rest
      ));
    } catch (err) {
      console.error('Error getting more information:', err);
      toast({
        title: language === 'fr' ? 'Erreur' : 'Error',
        description: language === 'fr'
          ? 'Impossible d\'obtenir plus d\'informations'
          : 'Unable to get more information',
        variant: "destructive",
      });
    } finally {
      setLoadingMoreInfo(null);
    }
  };

  return (
    <>
      <div className="flex flex-col items-center gap-2 my-6">
        <p className="text-center text-muted-foreground mb-2">
          {language === 'fr' ? 'Vos préférences culinaires ?' : 'Your dining preferences?'}
        </p>
        <div className="flex gap-3 justify-center">
          <Input
            type="text"
            placeholder={language === 'fr' ? 'Végétarien, pizza, sushis ...' : 'Veg, pizza, sushis...'}
            value={preferences}
            onChange={(e) => setPreferences(e.target.value)}
            className="max-w-md"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isLoading) {
                handleGenerateRecommendations();
              }
            }}
          />
          <Button
            onClick={handleGenerateRecommendations}
            disabled={isLoading}
            className="whitespace-nowrap"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span>{language === 'fr' ? 'Génération...' : 'Generating...'}</span>
              </>
            ) : (
              <span>{language === 'fr' ? 'Suggérer' : 'Suggest'}</span>
            )}
          </Button>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader className="relative">
            <DialogTitle>
              {language === 'fr' ? 'Restaurants suggérés' : 'Suggested Restaurants'}
            </DialogTitle>
            <DialogClose className="absolute right-0 top-0 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-6 w-6" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>

          <div className="grid gap-6 mt-4">
            {suggestedRestaurants.map((restaurant, index) => (
              <div key={index} className="border rounded-lg p-4 bg-white shadow-sm">
                <h3 className="font-medium mb-2">
                  {restaurant.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {restaurant.cuisine} • {restaurant.priceRange}
                </p>
                <p className="text-black text-base mb-4">{restaurant.description}</p>
                {restaurant.additionalInfo && (
                  <div className="mt-4 p-4 bg-muted rounded-md">
                    {renderTextWithLinks(restaurant.additionalInfo)}
                  </div>
                )}
                {restaurant.coordinates && (
                  <div className="mt-4">
                    <LocationPhotos
                      location={restaurant.title}
                      coordinates={restaurant.coordinates}
                      language={language}
                    />
                  </div>
                )}
                <div className="flex flex-wrap justify-end gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs sm:text-sm min-w-[80px] sm:min-w-[100px]"
                    onClick={() => {
                      const searchQuery = `${restaurant.title} ${restaurant.location} ${destination}`;
                      window.open(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    <span>{language === 'fr' ? 'Rechercher' : 'Search'}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs sm:text-sm min-w-[80px] sm:min-w-[100px]"
                    onClick={() => getMoreInfo(restaurant, index)}
                    disabled={loadingMoreInfo === index}
                  >
                    {loadingMoreInfo === index ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        <span>{language === 'fr' ? 'Chargement...' : 'Loading...'}</span>
                      </>
                    ) : (
                      <span>{language === 'fr' ? 'Plus d\'infos' : 'More info'}</span>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs sm:text-sm min-w-[80px] sm:min-w-[100px]"
                    onClick={() => {
                      onAddRestaurant(restaurant.title);
                      toast({
                        title: language === 'fr' ? 'Restaurant ajouté !' : 'Restaurant added!',
                        description: language === 'fr' 
                          ? 'Le restaurant a été ajouté à vos suggestions.'
                          : 'The restaurant has been added to your suggestions.',
                      });
                    }}
                  >
                    {language === 'fr' ? 'Ajouter' : 'Add'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}