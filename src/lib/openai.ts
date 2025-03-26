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
  activities: {
    activity: string;
    place: string;
    description: string;
    nearbyLandmarks: string[];
    bookingInfo: string | null;
    travelTime: string | null;
  }[];
}

interface TravelSuggestions {
  destination: {
    name: string;
    coordinates: Coordinates;
  };
  mustSeeAttractions: Location[];
  hiddenGems: Location[];
  itinerary: DayItinerary[];
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

  // Initialize events as empty array if not present
  if (!Array.isArray(data.events)) {
    data.events = [];
  }

  // Validate itinerary
  if (!Array.isArray(data.itinerary)) return false;
  const validItinerary = data.itinerary.every((day: DayItinerary) => 
    typeof day.day === 'number' &&
    Array.isArray(day.activities) &&
    day.activities.every((activity: any) => 
      typeof activity.activity === 'string' &&
      typeof activity.place === 'string' &&
      typeof activity.description === 'string' &&
      Array.isArray(activity.nearbyLandmarks) &&
      activity.nearbyLandmarks.every((landmark: string) => typeof landmark === 'string') &&
      (activity.bookingInfo === null || typeof activity.bookingInfo === 'string') &&
      (activity.travelTime === null || typeof activity.travelTime === 'string')
    )
  );
  if (!validItinerary) return false;

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

/**
 * Finds the best matching description for a place by comparing its title with attractions and hidden gems
 * @param title The title of the place
 * @param description The original description of the place
 * @param mustSeeAttractions Array of must-see attractions
 * @param hiddenGems Array of hidden gems
 * @returns The best matching description or the original description if no match is found
 */
export const findBestMatchingDescription = (
  title: string,
  description: string,
  mustSeeAttractions: Location[],
  hiddenGems: Location[]
): string => {
  // Function to calculate similarity between two strings (0-1 score)
  const calculateSimilarity = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    // Check for exact inclusion first
    if (s1.includes(s2) || s2.includes(s1)) {
      return 0.9; // High score but not perfect to allow for better exact matches
    }
    
    // Split into words and check for word overlap
    const words1 = s1.split(/\s+/).filter(w => w.length > 3); // Only consider words longer than 3 chars
    const words2 = s2.split(/\s+/).filter(w => w.length > 3);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    // Count matching words
    const matchingWords = words1.filter(w => words2.some(w2 => w2.includes(w) || w.includes(w2)));
    
    // Calculate score based on percentage of matching words
    return matchingWords.length / Math.max(words1.length, words2.length);
  };
  
  // Find best matching attraction
  let bestMatch: Location | null = null;
  let bestScore = 0.3; // Minimum threshold for a good match
  
  // Check mustSeeAttractions
  for (const attraction of mustSeeAttractions) {
    const score = calculateSimilarity(attraction.title, title);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = attraction;
    }
  }
  
  // Check hiddenGems if no good match found in attractions
  if (!bestMatch) {
    for (const gem of hiddenGems) {
      const score = calculateSimilarity(gem.title, title);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = gem;
      }
    }
  }
  
  // Use the description from the best matching place if found
  if (bestMatch) {
    return bestMatch.description;
  }
  
  // If no match found, use the provided description
  return description;
};

export const generateTravelPlan = async ({
  destination,
  duration,
  interests,
  language = 'en'
}: {
  destination: string;
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
    "itinerary": [
      {
        "day": number,
        "activities": [
          {
            "activity": "string",
            "place": "string",
            "description": "string",
            "nearbyLandmarks": [
              "string"
            ],
            "bookingInfo": "string | null",
            "travelTime": "string | null"
          }
        ]
      }
    ],
  }`;

  const prompt = `Create a travel plan for ${destination}.

Key Information:
- Duration: ${duration} days
- Interests: ${interests.join(', ')}
- Language: ${language === 'fr' ? 'French' : 'English'}

Requirements:
1. Include exactly ${duration} days in the itinerary
2. Each day must have a logical number of activites that are doable in a day
3. Group activities by geographic proximity and dispatch day by day
4. Do not recommend restaurants. Only must see and hidden gems attractions      
5. Include at least:
   - 4 must-see attractions
   - 4 hidden gems
6. All locations must have accurate coordinates for ${destination}
7. IMPORTANT: Never suggest the same place twice
8. All recommendations must relate to the specified interests ${interests.join(', ')}
9. ${language === 'fr' ? 'ALL text MUST be in French' : 'All text must be in English'}
10. IMPORTANT: All places in the itinerary MUST be included in either the must-see attractions or hidden gems sections
11. For each activity in the itinerary, provide:
    - A detailed description (2-3 sentences) explaining what makes this place special
    - At least 1 nearby landmark
    - Travel time and method from previous location`;

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