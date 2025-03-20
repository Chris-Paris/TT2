import { useState, useEffect, useRef } from 'react';
import { Button } from './button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MapPin, Search, Loader2, ImageIcon } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const FLICKR_API_KEY = '4306b70370312d7ccde3304184179b2b';

interface WhereToGoProps {
  onDestinationSelect: (destination: string) => void;
  language: 'en' | 'fr';
  className?: string;
  id?: string;
}

type Category = 'climate' | 'type' | 'activities' | 'cultural' | 'budget' | 'continent';

interface CategoryOption {
  value: string;
  label: {
    en: string;
    fr: string;
  };
}

interface DestinationSuggestion {
  name: string;
  description: string;
  photoUrl?: string;
  isLoadingPhoto?: boolean;
}

const categories: Record<Category, { title: { en: string; fr: string }, options: CategoryOption[] }> = {
  continent: {
    title: {
      en: 'Continent',
      fr: 'Continent'
    },
    options: [
      { value: 'europe', label: { en: 'Europe', fr: 'Europe' } },
      { value: 'north-america', label: { en: 'North America', fr: 'Amérique du Nord' } },
      { value: 'south-america', label: { en: 'South America', fr: 'Amérique du Sud' } },
      { value: 'asia', label: { en: 'Asia', fr: 'Asie' } },
      { value: 'africa', label: { en: 'Africa', fr: 'Afrique' } },
      { value: 'oceania', label: { en: 'Oceania', fr: 'Océanie' } },
      { value: 'antarctica', label: { en: 'Antarctica', fr: 'Antarctique' } }
    ]
  },
  climate: {
    title: {
      en: 'Climate & Season',
      fr: 'Climat & Saison'
    },
    options: [
      { value: 'tropical', label: { en: 'Tropical', fr: 'Tropical' } },
      { value: 'temperate', label: { en: 'Temperate', fr: 'Tempéré' } },
      { value: 'arctic', label: { en: 'Arctic', fr: 'Arctique' } },
      { value: 'rainy', label: { en: 'Rainy', fr: 'Pluvieux' } },
      { value: 'dry', label: { en: 'Dry', fr: 'Sec' } },
      { value: 'ski', label: { en: 'Ski Season', fr: 'Saison de ski' } }
    ]
  },
  type: {
    title: {
      en: 'Destination Type',
      fr: 'Type de Destination'
    },
    options: [
      { value: 'city', label: { en: 'City', fr: 'Ville' } },
      { value: 'beach', label: { en: 'Beach', fr: 'Plage' } },
      { value: 'mountain', label: { en: 'Mountain', fr: 'Montagne' } },
      { value: 'island', label: { en: 'Island', fr: 'Île' } },
      { value: 'desert', label: { en: 'Desert', fr: 'Désert' } },
      { value: 'historical', label: { en: 'Historical Site', fr: 'Site historique' } },
      { value: 'national-park', label: { en: 'National Park', fr: 'Parc national' } },
      { value: 'countryside', label: { en: 'Countryside', fr: 'Campagne' } },
      { value: 'cruise', label: { en: 'Cruise', fr: 'Croisière' } },
      { value: 'urban', label: { en: 'Urban', fr: 'Urbain' } },
      { value: 'rural', label: { en: 'Rural', fr: 'Rural' } }
    ]
  },
  activities: {
    title: {
      en: 'Activities & Interests',
      fr: 'Activités & Intérêts'
    },
    options: [
      { value: 'hiking', label: { en: 'Hiking', fr: 'Randonnée' } },
      { value: 'skiing', label: { en: 'Skiing', fr: 'Ski' } },
      { value: 'scuba-diving', label: { en: 'Scuba Diving', fr: 'Plongée sous-marine' } },
      { value: 'sightseeing', label: { en: 'Sightseeing', fr: 'Visites touristiques' } },
      { value: 'festivals', label: { en: 'Festivals', fr: 'Festivals' } },
      { value: 'nightlife', label: { en: 'Nightlife', fr: 'Vie nocturne' } },
      { value: 'food-tours', label: { en: 'Food Tours', fr: 'Tours gastronomiques' } },
      { value: 'shopping', label: { en: 'Shopping', fr: 'Shopping' } },
      { value: 'wildlife-safaris', label: { en: 'Wildlife Safaris', fr: 'Safaris animaliers' } },
      { value: 'photography', label: { en: 'Photography', fr: 'Photographie' } },
      { value: 'volunteering', label: { en: 'Volunteering', fr: 'Bénévolat' } },
      { value: 'yoga-wellness', label: { en: 'Yoga/Wellness', fr: 'Yoga/Bien-être' } },
      { value: 'art-museums', label: { en: 'Art/Museums', fr: 'Art/Musées' } },
      { value: 'religious', label: { en: 'Religious Pilgrimages', fr: 'Pèlerinages religieux' } },
      { value: 'sports', label: { en: 'Sports', fr: 'Sports' } }
    ]
  },
  cultural: {
    title: {
      en: 'Cultural & Historical',
      fr: 'Culturel & Historique'
    },
    options: [
      { value: 'unesco', label: { en: 'UNESCO Sites', fr: 'Sites UNESCO' } },
      { value: 'local-festivals', label: { en: 'Local Festivals', fr: 'Festivals locaux' } },
      { value: 'indigenous', label: { en: 'Indigenous Experiences', fr: 'Expériences autochtones' } },
      { value: 'heritage', label: { en: 'Heritage Sites', fr: 'Sites patrimoniaux' } },
      { value: 'language', label: { en: 'Language Immersion', fr: 'Immersion linguistique' } },
      { value: 'architecture', label: { en: 'Architecture', fr: 'Architecture' } },
      { value: 'cultural-festivals', label: { en: 'Cultural Festivals', fr: 'Festivals culturels' } },
      { value: 'local-customs', label: { en: 'Local Customs', fr: 'Coutumes locales' } }
    ]
  },
  budget: {
    title: {
      en: 'Budget & Cost',
      fr: 'Budget & Coût'
    },
    options: [
      { value: 'budget-friendly', label: { en: 'Budget-friendly', fr: 'Économique' } },
      { value: 'luxury', label: { en: 'Luxury', fr: 'Luxe' } },
      { value: 'mid-range', label: { en: 'Mid-range', fr: 'Gamme moyenne' } },
      { value: 'affordable', label: { en: 'Affordable', fr: 'Abordable' } },
      { value: 'backpacker', label: { en: 'Backpacker', fr: 'Routard' } },
      { value: 'splurge', label: { en: 'Splurge', fr: 'Dépenser sans compter' } },
      { value: 'hidden-gems', label: { en: 'Hidden Gems', fr: 'Trésors cachés' } }
    ]
  }
};

export function WhereToGo({ onDestinationSelect, language, className, id }: WhereToGoProps) {
  const [selectedOptions, setSelectedOptions] = useState<Record<Category, string[]>>({
    continent: [],
    climate: [],
    type: [],
    activities: [],
    cultural: [],
    budget: []
  });
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<DestinationSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const handleOptionClick = (category: Category, value: string) => {
    setSelectedOptions(prev => {
      const currentOptions = [...prev[category]];
      const index = currentOptions.indexOf(value);
      
      if (index === -1) {
        // Add option if not already selected
        return {
          ...prev,
          [category]: [...currentOptions, value]
        };
      } else {
        // Remove option if already selected
        currentOptions.splice(index, 1);
        return {
          ...prev,
          [category]: currentOptions
        };
      }
    });
  };

  const generateDestinationSuggestions = async () => {
    setIsLoading(true);
    setError(null);
    setSuggestions([]);
    
    try {
      // Create a prompt based on the selected options
      const selectedPreferences = Object.entries(selectedOptions)
        .filter(([_, values]) => values.length > 0)
        .map(([category, values]) => {
          const categoryName = categories[category as Category].title[language];
          const optionNames = values.map(value => {
            const option = categories[category as Category].options.find(opt => opt.value === value);
            return option ? option.label[language] : value;
          });
          return `${categoryName}: ${optionNames.join(', ')}`;
        })
        .join('; ');
      
      if (!selectedPreferences) {
        setError(language === 'en' ? 'Please select at least one preference' : 'Veuillez sélectionner au moins une préférence');
        setIsLoading(false);
        return;
      }
      
      const schema = `
      {
        "destinations": [
          {
            "name": "string", // Name of the destination
            "description": "string" // Brief description of why this destination matches the preferences
          },
          // Five more destinations with the same structure
        ]
      }`;
      
      const prompt = language === 'en' 
        ? `Based on the following travel preferences: "${selectedPreferences}", suggest exactly 6 specific destinations that would be a good match. Each destination should be a specific city, region, or location (not a country). Include a brief description explaining why each destination matches the preferences.`
        : `Sur la base des préférences de voyage suivantes: "${selectedPreferences}", suggérez exactement 6 destinations spécifiques qui conviendraient. Chaque destination doit être une ville, une région ou un lieu spécifique (pas un pays). Incluez une brève description expliquant pourquoi chaque destination correspond aux préférences.`;
      
      const result = await generateJsonResponse(prompt, schema);
      
      if (result && result.destinations && Array.isArray(result.destinations) && result.destinations.length > 0) {
        // Initialize suggestions without photos
        setSuggestions(result.destinations.map((dest: { name: string; description: string }) => ({
          ...dest,
          photoUrl: undefined,
          isLoadingPhoto: false
        })));
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error generating destination suggestions:', error);
      setError(language === 'en' 
        ? 'Failed to generate destination suggestions. Please try again.' 
        : 'Échec de la génération des suggestions de destination. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDestination = (destination: string) => {
    onDestinationSelect(destination);
    setOpen(false);
    
    // Reset selections for next time
    setSelectedOptions({
      continent: [],
      climate: [],
      type: [],
      activities: [],
      cultural: [],
      budget: []
    });
    setSuggestions([]);
  };

  const handleReset = () => {
    setSelectedOptions({
      continent: [],
      climate: [],
      type: [],
      activities: [],
      cultural: [],
      budget: []
    });
    setSuggestions([]);
    setError(null);
  };

  // Function to generate JSON response using Gemini API
  const generateJsonResponse = async (prompt: string, schema: string) => {
    try {
      const fullPrompt = `You are a travel assistant that generates JSON responses.

CRITICAL: YOU MUST FOLLOW THESE RULES EXACTLY
1. Return ONLY a valid JSON object
2. Do not include ANY text before or after the JSON
3. Do not include ANY markdown code blocks or backticks
4. Do not include ANY explanations or comments
5. The response must follow this exact schema:
${schema}

${prompt}`;

      const result = await model.generateContent({
        contents: [{ 
          role: "user", 
          parts: [{ text: fullPrompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
        }
      });

      const response = await result.response;
      const text = response.text().trim();
      
      // Try multiple approaches to extract valid JSON
      try {
        // First try: direct parse
        return JSON.parse(text);
      } catch (error) {
        // Second try: remove markdown code blocks
        const cleanedMarkdown = text
          .replace(/^```json\s*/, '')  // Remove opening ```json
          .replace(/```\s*$/, '')      // Remove closing ```
          .trim();
          
        try {
          return JSON.parse(cleanedMarkdown);
        } catch (error) {
          // Third try: find JSON object/array using regex
          const jsonMatch = text.match(/[\[{][\s\S]*[\]}]/);
          if (!jsonMatch) {
            throw new Error('No JSON structure found in response');
          }
          
          try {
            return JSON.parse(jsonMatch[0]);
          } catch (error) {
            // Fourth try: clean the text more aggressively
            const cleanedText = jsonMatch[0]
              .replace(/[\u201C\u201D]/g, '"')     // Replace smart quotes
              .replace(/[\u2018\u2019]/g, "'")     // Replace smart single quotes
              .replace(/\n\s*\/\/[^\n]*/g, '')     // Remove comments
              .replace(/,\s*([}\]])/g, '$1')       // Remove trailing commas
              .replace(/\\n/g, ' ')                // Replace newlines with spaces
              .replace(/\s+/g, ' ')                // Normalize whitespace
              .replace(/([{,])\s*"(\w+)":/g, '$1"$2":')  // Fix spacing around keys
              .replace(/:\s*"([^"]*)"(?=\s*[,}])/g, ':"$1"')  // Fix spacing around values
              .trim();
                
            return JSON.parse(cleanedText);
          }
        }
      }
    } catch (error) {
      console.error('Error generating JSON response:', error);
      throw error;
    }
  };

  // Function to fetch Flickr photos for a destination
  const fetchFlickrPhoto = async (destination: string): Promise<string | null> => {
    try {
      const url = `https://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=${FLICKR_API_KEY}&text=${encodeURIComponent(
        destination
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
      return `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_b.jpg`;
    } catch (error) {
      console.error('Error fetching Flickr photo:', error);
      return null;
    }
  };

  // Function to load photos for all suggestions
  const loadPhotosForSuggestions = async (suggestions: DestinationSuggestion[]) => {
    const updatedSuggestions = [...suggestions].map(suggestion => ({
      ...suggestion,
      isLoadingPhoto: true
    }));
    setSuggestions(updatedSuggestions);

    for (let i = 0; i < suggestions.length; i++) {
      const photoUrl = await fetchFlickrPhoto(suggestions[i].name);
      
      setSuggestions(prev => {
        const updated = [...prev];
        updated[i] = {
          ...updated[i],
          photoUrl: photoUrl || undefined,
          isLoadingPhoto: false
        };
        return updated;
      });
    }
  };

  // Update to load photos when suggestions are received
  useEffect(() => {
    if (suggestions.length > 0 && !suggestions[0].photoUrl && !suggestions[0].isLoadingPhoto) {
      loadPhotosForSuggestions(suggestions);
    }
  }, [suggestions]);

  // Scroll to suggestions when they are loaded
  useEffect(() => {
    if (suggestions.length > 0 && !isLoading && suggestionsRef.current) {
      setTimeout(() => {
        suggestionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [suggestions, isLoading]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className={className || "flex items-center gap-2 bg-white hover:bg-gray-100"}
          id={id}
        >
          <Search className="h-4 w-4 hidden md:inline" />
          {language === 'en' ? 'Destination ideas' : 'Idées de destinations'}
        </Button>
      </DialogTrigger>
      <DialogContent 
        className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto"
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          setOpen(false);
        }}
        onInteractOutside={(e) => {
          e.preventDefault();
          setOpen(false);
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {language === 'en' ? 'Find Your Perfect Destination' : 'Trouvez Votre Destination Parfaite'}
          </DialogTitle>
          <DialogDescription>
            {language === 'en' 
              ? 'Select options from each category to help us suggest the perfect destination for you.'
              : 'Sélectionnez des options dans chaque catégorie pour nous aider à vous suggérer la destination parfaite.'}
          </DialogDescription>
          <Button 
            variant="ghost" 
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            onClick={() => setOpen(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            <span className="sr-only">Close</span>
          </Button>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {(Object.keys(categories) as Category[]).map((category) => (
            <div key={category} className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {categories[category].title[language]}
              </h3>
              <div className="flex flex-wrap gap-2">
                {categories[category].options.map((option) => (
                  <Button
                    key={option.value}
                    variant={selectedOptions[category].includes(option.value) ? "default" : "outline"}
                    className={`text-sm ${selectedOptions[category].includes(option.value) ? 'bg-[#003049] text-white' : 'bg-white'}`}
                    onClick={() => handleOptionClick(category, option.value)}
                  >
                    {option.label[language]}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-between">
          <Button
            onClick={handleReset}
            variant="outline"
            className="flex items-center gap-2 text-gray-600"
            disabled={Object.values(selectedOptions).flat().length === 0 && suggestions.length === 0}
          >
            {language === 'en' ? 'Reset' : 'Réinitialiser'}
          </Button>
          
          <Button 
            onClick={generateDestinationSuggestions} 
            className="bg-[#780000] hover:bg-[#5e0000] text-white flex items-center gap-2"
            disabled={Object.values(selectedOptions).flat().length === 0 || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MapPin className="h-4 w-4" />
            )}
            {language === 'en' ? 'Destination ideas' : 'Idées de destinations'}
          </Button>
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600">
            {error}
          </div>
        )}
        
        {suggestions.length > 0 && (
          <div className="mt-6 space-y-4" ref={suggestionsRef}>
            <h3 className="text-lg font-semibold text-gray-900">
              {language === 'en' ? 'Recommended Destinations' : 'Destinations Recommandées'}
            </h3>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-3">
              {suggestions.map((suggestion, index) => (
                <div 
                  key={index} 
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer bg-white flex flex-col"
                  onClick={() => handleSelectDestination(suggestion.name)}
                >
                  <div className="h-40 mb-3 bg-gray-100 rounded relative overflow-hidden">
                    {suggestion.isLoadingPhoto ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                      </div>
                    ) : suggestion.photoUrl ? (
                      <img 
                        src={suggestion.photoUrl} 
                        alt={suggestion.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <h4 className="font-semibold text-[#003049]">{suggestion.name}</h4>
                  <p className="text-sm text-gray-600 mt-1 flex-grow">{suggestion.description}</p>
                  <Button 
                    variant="link" 
                    className="mt-2 p-0 h-auto text-[#780000]"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectDestination(suggestion.name);
                    }}
                  >
                    {language === 'en' ? 'Select destination' : 'Sélectionner la destination'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}