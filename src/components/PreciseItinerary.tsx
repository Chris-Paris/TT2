import { useState } from 'react';
import { Loader2, Car } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { TravelSuggestions } from '@/types';
import { useToast } from "@/components/ui/use-toast";
import { analytics } from '@/lib/analytics';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

interface DayActivity {
  time: string;
  activity: string;
  place: string;
  nearbyLandmarks: string[];
  bookingInfo: string | null;
  travelTime: string;
}

interface ItineraryDay {
  day: number;
  title: string;
  activities: DayActivity[];
}

interface GeneratedResponse {
  itinerary: ItineraryDay[];
}

interface PreciseItineraryProps {
  suggestions: TravelSuggestions;
  language: 'en' | 'fr';
  onNewItinerary: (itinerary: { day: number; activities: string[] }[]) => void;
  currentItinerary: Record<number, string[]>;
}

const generateJsonResponse = async (prompt: string, schema: string): Promise<GeneratedResponse> => {
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
        temperature: 0.7,
        maxOutputTokens: 8000,
      }
    });

    const response = await result.response;
    const text = response.text();
    
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Raw response:', text);
      throw new Error('No JSON object found in response');
    }

    let jsonStr = jsonMatch[0];
    // Remove any leading/trailing commas and extra quotes
    jsonStr = jsonStr.replace(/^[,"]+/, '{').replace(/[,"]+$/, '}');

    try {
      return JSON.parse(jsonStr);
    } catch (parseError) {
      // If parsing fails, try to fix the most common issues
      try {
        jsonStr = jsonStr.replace(/,(?=[}\]])/g, '');
        return JSON.parse(jsonStr);
      } catch (error) {
        console.error('Failed to parse JSON:', error);
        throw error;
      }
    }
  } catch (error) {
    console.error('Error generating JSON response:', error);
    throw error;
  }
};

export function PreciseItinerary({ suggestions, language, onNewItinerary, currentItinerary }: PreciseItineraryProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePreciseItinerary = async () => {
    setIsGenerating(true);
    
    // Track the PreciseItinerary button click in Mixpanel
    analytics.trackPreciseItinerary(suggestions.destination.name);
    
    try {
      const schema = `{
        "itinerary": [
          {
            "day": number,
            "title": "string",
            "activities": [
              {
                "time": "string (format: 'Morning: XX:XX AM' or 'Matin: XXhXX')",
                "activity": "string",
                "place": "string",
                "nearbyLandmarks": ["string"],
                "bookingInfo": "string (or null if no booking required)",
                "travelTime": "string (e.g., '15 minutes by foot' or '15 minutes à pied')"
              }
            ]
          }
        ]
      }`;

      // Convert currentItinerary to array format
      const currentItineraryArray = Object.entries(currentItinerary).map(([day, activities]) => ({
        day: parseInt(day),
        activities
      }));

      // Ensure we don't exceed a reasonable number of days
      const numDays = Math.min(suggestions.itinerary.length, 7);

      const prompt = `Optimize this travel itinerary for ${suggestions.destination.name}:

Current base itinerary:
${JSON.stringify(suggestions.itinerary, null, 2)}

Current modified itinerary with user additions:
${JSON.stringify(currentItineraryArray, null, 2)}

Requirements:
1. Generate EXACTLY ${numDays} days
2. Each day MUST have AT LEAST 4 activities, and MUST INCLUDE ALL activities from the current modified itinerary
3. Group activities by geographic proximity and dispatch day by day
4. For each activity, provide:
   - The place name and description
   - At least 1 nearby landmark
   - Travel time and method from previous location
5. Each day should have a title summarizing the main theme or area
6. Use this time format:
   ${language === 'fr' 
     ? '- "Matin: XXhXX"\n   - "Après-midi: XXhXX"\n   - "Soir: XXhXX"'
     : '- "Morning: XX:XX AM"\n   - "Afternoon: XX:XX PM"\n   - "Evening: XX:XX PM"'}
7. ${language === 'fr' ? 'ALL text MUST be in French' : 'All text must be in English'}
8. IMPORTANT: Preserve all activities from the current modified itinerary`;

      const response = await generateJsonResponse(prompt, schema);

      if (!response?.itinerary || !Array.isArray(response.itinerary)) {
        throw new Error('Invalid response structure: missing or invalid itinerary array');
      }

      // Format the activities for display
      const formattedItinerary = response.itinerary.map((day: ItineraryDay) => ({
        day: day.day,
        activities: day.activities.map((activity: DayActivity) => {
          const bookingInfo = activity.bookingInfo ? 
            (language === 'fr' ? `📅 Réservation: ${activity.bookingInfo}` : `📅 Booking: ${activity.bookingInfo}`) : '';
          const landmarks = activity.nearbyLandmarks.length > 0 ? 
            `\n   ${language === 'fr' ? '🏛️ À proximité' : '🏛️ Nearby'}: ${activity.nearbyLandmarks.join(', ')}` : '';
          const travelTime = activity.travelTime ? 
            `\n   ${language === 'fr' ? '🚶 Trajet' : '🚶 Travel'}: ${activity.travelTime}` : '';
          
          return `${activity.time} - ${activity.activity} (<span style="font-weight: 600">${activity.place}</span>)${landmarks}${travelTime}${bookingInfo ? '\n   ' + bookingInfo : ''}`;
        })
      }));

      onNewItinerary(formattedItinerary);
      toast({
        title: language === 'fr' ? "Itinéraire optimisé !" : "Itinerary optimized!",
        description: language === 'fr' 
          ? "Votre itinéraire a été réorganisé pour plus d'efficacité."
          : "Your itinerary has been reorganized for better efficiency.",
      });
    } catch (error) {
      console.error('Error generating precise itinerary:', error);
      toast({
        title: language === 'fr' ? "Erreur" : "Error",
        description: language === 'fr'
          ? "Une erreur s'est produite lors de l'optimisation de l'itinéraire."
          : "An error occurred while optimizing the itinerary.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={generatePreciseItinerary}
      disabled={isGenerating}
      className="inline-flex items-center justify-center px-4 md:px-6 py-1 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 text-[14px] sm:text-base mx-auto"
    >
      {isGenerating ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          <span>{language === 'fr' ? 'Optimisation...' : 'Optimizing...'}</span>
        </>
      ) : (
        <>
          <Car className="w-4 h-4 mr-2" />
          <span>{language === 'fr' ? 'Afficher les temps de transferts entre destinations' : 'Show travel times between destinations'}</span>
        </>
      )}
    </button>
  );
}