import { useState } from 'react';
import { Loader2, X, Search } from 'lucide-react';
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

interface ActivityIdeasInterestsProps {
  destination: string;
  language: 'en' | 'fr';
  onAddActivity: (activity: string) => void;
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

export function ActivityIdeasInterests({ destination, language, onAddActivity }: ActivityIdeasInterestsProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMoreInfo, setLoadingMoreInfo] = useState<number | null>(null);
  const [interests, setInterests] = useState('');
  const [suggestedActivities, setSuggestedActivities] = useState<SuggestedActivity[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const renderTextWithLinks = (text: string) => {
    // Handle Markdown-style links [text](url)
    const markdownRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    
    // First replace Markdown links with clickable links
    let processedText = text.replace(markdownRegex, (_, __, url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">${url}</a>`;
    });
    
    // Then handle any remaining plain URLs
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

  const handleSuggestActivities = async () => {
    if (isLoading) return;

    analytics.trackSuggestActivities(destination);

    if (!interests.trim()) {
      toast({
        title: language === 'fr' ? 'Erreur' : 'Error',
        description: language === 'fr' 
          ? 'Veuillez entrer vos centres d\'intérêt'
          : 'Please enter your interests',
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const schema = `{
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "required": ["activities"],
        "properties": {
          "activities": {
            "type": "array",
            "minItems": 3,
            "maxItems": 3,
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

      const prompt = `You are a travel activity generator. Generate EXACTLY 3 unique and interesting activity suggestions for ${destination} based on these interests: ${interests}.

Your response MUST be a valid JSON object with an "activities" array containing EXACTLY 3 items.

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
      
      if (!response.activities || !Array.isArray(response.activities) || response.activities.length !== 3) {
        throw new Error('Invalid API response: Expected exactly 3 activities');
      }
      
      setSuggestedActivities(response.activities);
      setIsModalOpen(true);
      
      toast({
        title: language === 'fr' ? 'Suggestions générées !' : 'Suggestions generated!',
        description: language === 'fr' 
          ? 'De nouvelles activités ont été suggérées.'
          : 'New activities have been suggested.',
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      console.error('Error generating activities:', errorMessage);
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

  const getMoreInfo = async (activity: SuggestedActivity, index: number) => {
    setLoadingMoreInfo(index);
    try {
      const prompt = `You are a travel guide. Provide detailed information about "${activity.title}" in ${destination}.
Include:
1. Place name
2. Practical tips
3. Reviews and ratings
4. What makes it special
5. Nearby attractions or facilities

Keep the response concise but informative. ${language === 'fr' ? 'Respond in French.' : 'Respond in English.'}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const additionalInfo = response.text();
      
      setSuggestedActivities(prev => prev.map((act, i) => 
        i === index ? { ...act, additionalInfo } : act
      ));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      console.error('Error getting more information:', errorMessage);
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
          {language === 'fr' ? 'Envie de personaliser cet itinéraire ?' : 'Want to customize this itinerary?'}
        </p>
        <div className="relative max-w-md w-full mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder={language === 'fr' ? 'Musées, randonnées, plages...' : 'Museums, hikes, beaches...'}
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              className="pl-10 pr-12 w-full"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLoading) {
                  handleSuggestActivities();
                }
              }}
            />
            <div className="absolute right-0 top-0 h-full">
              {isLoading ? (
                <div className="flex items-center justify-center h-full px-3">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : (
                <button 
                  onClick={handleSuggestActivities}
                  disabled={isLoading}
                  className="h-full bg-primary hover:bg-primary/90 text-white px-3 rounded-r-md transition-colors flex items-center justify-center"
                  aria-label={language === 'fr' ? 'Rechercher' : 'Search'}
                >
                  <Search className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader className="relative">
            <DialogTitle>
              {language === 'fr' ? 'Activités suggérées' : 'Suggested Activities'}
            </DialogTitle>
            <DialogClose className="absolute right-0 top-0 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-6 w-6" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>
          <div className="grid gap-6 mt-4">
            {suggestedActivities.map((activity, index) => (
              <div key={index} className="border rounded-lg p-4 bg-white shadow-sm">
                <h3 className="font-medium mb-2">
                  {activity.title}
                </h3>
                <p className="text-black text-base mb-4">{activity.description}</p>
                {activity.additionalInfo && (
                  <div className="mt-4 p-4 bg-muted rounded-md">
                    {renderTextWithLinks(activity.additionalInfo)}
                  </div>
                )}
                {activity.coordinates && (
                  <div className="mt-4">
                    <LocationPhotos
                      location={activity.title}
                      coordinates={activity.coordinates}
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
                      const searchQuery = `${activity.title} ${activity.description} ${destination}`;
                      window.open(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    <span>{language === 'fr' ? 'Voir plus' : 'See more'}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs sm:text-sm min-w-[80px] sm:min-w-[100px]"
                    onClick={() => getMoreInfo(activity, index)}
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
                      onAddActivity(activity.title);
                      toast({
                        title: language === 'fr' ? 'Activité ajoutée !' : 'Activity added!',
                        description: language === 'fr' 
                          ? 'L\'activité a été ajoutée à votre itinéraire.'
                          : 'The activity has been added to your itinerary.',
                      });
                    }}
                  >
                    {language === 'fr' ? 'Garder' : 'Keep'}
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