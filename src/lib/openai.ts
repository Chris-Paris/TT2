import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

interface Coordinates {
  lat: number;
  lng: number;
}

interface Location {
  title: string;
  description: string;
  location: string;
  coordinates: Coordinates;
}

interface DayItinerary {
  day: number;
  activities: string[];
}

interface TravelSuggestions {
  destination: {
    name: string;
    coordinates: Coordinates;
  };
  mustSeeAttractions: Location[];
  hiddenGems: Location[];
  restaurants: Location[];
  itinerary: DayItinerary[];
  practicalAdvice: string;
  accommodation: Location[];
  events: Location[];
}

const validateResponse = (data: any): data is TravelSuggestions => {
  if (!data || typeof data !== 'object') return false;
  
  // Validate destination
  if (!data.destination?.name || !data.destination?.coordinates?.lat || !data.destination?.coordinates?.lng) {
    return false;
  }

  // Validate arrays of locations
  const validateLocations = (locations: any[]): locations is Location[] => {
    return Array.isArray(locations) && locations.every(loc => 
      typeof loc.title === 'string' &&
      typeof loc.description === 'string' &&
      typeof loc.location === 'string' &&
      typeof loc.coordinates?.lat === 'number' &&
      typeof loc.coordinates?.lng === 'number'
    );
  };

  if (!validateLocations(data.mustSeeAttractions)) return false;
  if (!validateLocations(data.hiddenGems)) return false;
  if (!validateLocations(data.restaurants)) return false;
  if (!validateLocations(data.accommodation)) return false;

  // Initialize events as empty array if not present
  if (!Array.isArray(data.events)) {
    data.events = [];
  }

  // Validate itinerary
  if (!Array.isArray(data.itinerary)) return false;
  const validItinerary = data.itinerary.every((day: DayItinerary) => 
    typeof day.day === 'number' &&
    Array.isArray(day.activities) &&
    day.activities.every((activity: string) => typeof activity === 'string')
  );
  if (!validItinerary) return false;

  // Validate practical advice
  if (typeof data.practicalAdvice !== 'string') return false;

  return true;
};

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

    console.log('Sending prompt to Gemini:', fullPrompt);

    const result = await model.generateContent({
      contents: [{ 
        role: "user", 
        parts: [{ text: fullPrompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4000,
      }
    });

    const response = await result.response;
    const text = response.text().trim();
    
    console.log('Raw response from Gemini:', text);
    
    // Try multiple approaches to extract valid JSON
    let data;
    let parseError = '';
    
    try {
      // First try: direct parse
      data = JSON.parse(text);
      console.log('Successfully parsed JSON directly');
      return data;
    } catch (error: any) {
      parseError = `Direct parse error: ${error?.message || 'Unknown error'}\n`;
      console.log('Direct parse failed, trying markdown cleanup');
      
      // Second try: remove markdown code blocks
      const cleanedMarkdown = text
        .replace(/^```json\s*/, '')  // Remove opening ```json
        .replace(/```\s*$/, '')      // Remove closing ```
        .trim();
        
      try {
        data = JSON.parse(cleanedMarkdown);
        console.log('Successfully parsed JSON after markdown cleanup');
        return data;
      } catch (error: any) {
        parseError += `Markdown cleanup error: ${error?.message || 'Unknown error'}\n`;
        console.log('Markdown cleanup failed, trying regex extraction');
        
        // Third try: find JSON object/array using regex
        const jsonMatch = text.match(/[\[{][\s\S]*[\]}]/);
        if (!jsonMatch) {
          console.error('No JSON structure found in response');
          throw new Error('No JSON structure found in response');
        }
        
        try {
          data = JSON.parse(jsonMatch[0]);
          console.log('Successfully parsed JSON after regex extraction');
          return data;
        } catch (error: any) {
          parseError += `Regex extraction error: ${error?.message || 'Unknown error'}\n`;
          console.log('Regex extraction failed, trying aggressive cleaning');
          
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
            
          console.log('Cleaned text:', cleanedText);
            
          try {
            data = JSON.parse(cleanedText);
            console.log('Successfully parsed JSON after cleaning');
            return data;
          } catch (error: any) {
            parseError += `Cleaning parse error: ${error?.message || 'Unknown error'}`;
            console.error('Raw response:', text);
            console.error('Cleaned text:', cleanedText);
            console.error('All parse errors:', parseError);
            throw new Error(`Failed to parse JSON: ${parseError}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error generating JSON response:', error);
    throw error;
  }
};

export const generateTravelPlan = async ({
  destination,
  date,
  duration,
  interests,
  language = 'en'
}: {
  destination: string;
  date: Date;
  duration: number;
  interests: string[];
  language?: 'en' | 'fr';
}) => {
  const schema = `{
    "destination": {
      "name": "string",
      "coordinates": {
        "lat": number,
        "lng": number
      }
    },
    "mustSeeAttractions": [
      {
        "title": "string",
        "description": "string",
        "location": "string",
        "coordinates": {
          "lat": number,
          "lng": number
        }
      }
    ],
    "hiddenGems": [
      {
        "title": "string",
        "description": "string",
        "location": "string",
        "coordinates": {
          "lat": number,
          "lng": number
        }
      }
    ],
    "restaurants": [
      {
        "title": "string",
        "description": "string",
        "location": "string",
        "coordinates": {
          "lat": number,
          "lng": number
        }
      }
    ],
    "itinerary": [
      {
      "day": number,
        "activities": [
          "string (format: 'Morning: XX:XX AM - Activity')",
          "string (format: 'Afternoon: XX:XX PM - Activity')",
          "string (format: 'Evening: XX:XX PM - Activity')"
        ]
      }
    ],
    "practicalAdvice": "string",
    "accommodation": [
      {
        "title": "string",
        "description": "string",
        "location": "string",
        "coordinates": {
          "lat": number,
          "lng": number
        }
      }
    ],
    "events": [
      {
        "title": "string",
        "description": "string",
        "location": "string",
        "coordinates": {
          "lat": number,
          "lng": number
        }
      }
    ]
  }`;

  const prompt = `Create a travel plan for ${destination}.

Key Information:
- Duration: ${duration} days
- Start Date: ${date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')}
- Interests: ${interests.join(', ')}
- Language: ${language === 'fr' ? 'French' : 'English'}

Requirements:
1. Include exactly ${duration} days in the itinerary
2. Each day must have exactly 3 activities
3. Use this time format:
   ${language === 'fr' 
     ? '- "Matin: XXhXX - [Activité]"\n   - "Après-midi: XXhXX - [Activité]"\n   - "Soir: XXhXX - [Activité]"'
     : '- "Morning: XX:XX AM - [Activity]"\n   - "Afternoon: XX:XX PM - [Activity]"\n   - "Evening: XX:XX PM - [Activity]"'}
4. Include at least:
   - 5 must-see attractions
   - 5 hidden gems
   - 3 restaurants
   - 3 accommodation areas (districts or towns
   - for practical advice: talk about transportation (how is public transport or taxis or need to rent a car) and weather at that period.
5. All locations must have accurate coordinates for ${destination}
6. IMPORTANTNever suggest the same place twice
7. All recommendations must relate to the specified interests
8. ${language === 'fr' ? 'ALL text MUST be in French' : 'All text must be in English'}`;

  try {
    const data = await generateJsonResponse(prompt, schema);
    
    if (!validateResponse(data)) {
      console.error('Invalid response structure:', data);
      throw new Error('Invalid response structure from Gemini');
    }

    return data;
  } catch (error) {
    console.error('Error generating travel plan:', error);
    throw error;
  }
};

export const generateMoreActivities = async (destination: string, language: 'en' | 'fr' = 'en', existingActivities: Location[] = []) => {
  const existingTitles = existingActivities.map(a => a.title).join('\n');

  const schema = `[
  {
    "title": "string",
    "description": "string",
    "location": "string",
    "coordinates": {
      "lat": number,
      "lng": number
    }
  }
]`;

  const prompt = `Generate 5 unique activities to do in ${destination}.
Language: ${language === 'fr' ? 'French' : 'English'}

EXISTING ACTIVITIES (DO NOT REPEAT THESE):
${existingTitles}

Requirements:
1. Each activity must have a title, description, location, and coordinates
2. Include a mix of indoor and outdoor activities
3. NEVER suggest any activities listed above
4. IMPORTANT: Each activity must be completely unique and different from existing ones
5. Coordinates must be accurate for ${destination}
6. ${language === 'fr' ? 'ALL text MUST be in French' : 'All text must be in English'}`;

  const data = await generateJsonResponse(prompt, schema);
  return data;
};

export const generateMoreAttractions = async (destination: string, language: 'en' | 'fr' = 'en', existingAttractions: Location[] = []) => {
  const existingTitles = existingAttractions.map(a => a.title).join('\n');

  const schema = `[
  {
    "title": "string",
    "description": "string",
    "location": "string",
    "coordinates": {
      "lat": number,
      "lng": number
    }
  }
]`;

  const prompt = `Generate 5 unique must-see attractions in ${destination}.
Language: ${language === 'fr' ? 'French' : 'English'}

EXISTING ATTRACTIONS (DO NOT REPEAT THESE):
${existingTitles}

Requirements:
1. Each attraction must have a title, description, location, and coordinates
2. Include iconic landmarks and cultural sites
3. NEVER suggest any attractions listed above
4. IMPORTANT: Each attraction must be completely unique and different from existing ones
5. Coordinates must be accurate for ${destination}
6. ${language === 'fr' ? 'ALL text MUST be in French' : 'All text must be in English'}`;

  const data = await generateJsonResponse(prompt, schema);
  return data;
};

export const generateMoreHiddenGems = async (destination: string, language: 'en' | 'fr' = 'en', existingGems: Location[] = []) => {
  const existingTitles = existingGems.map(a => a.title).join('\n');

  const schema = `[
  {
    "title": "string",
    "description": "string",
    "location": "string",
    "coordinates": {
      "lat": number,
      "lng": number
    }
  }
]`;

  const prompt = `Generate 5 unique hidden gems in ${destination}.
Language: ${language === 'fr' ? 'French' : 'English'}

EXISTING HIDDEN GEMS (DO NOT REPEAT THESE):
${existingTitles}

Requirements:
1. Each hidden gem must have a title, description, location, and coordinates
2. Focus on lesser-known, local spots that tourists might miss
3. NEVER suggest any places listed above
4. Each place must be completely unique and different from existing ones
5. Coordinates must be accurate for ${destination}
6. ${language === 'fr' ? 'ALL text MUST be in French' : 'All text must be in English'}`;

  const data = await generateJsonResponse(prompt, schema);
  return data;
};