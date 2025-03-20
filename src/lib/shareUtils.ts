import { TravelSuggestions } from "@/types";

export const formatTravelPlanForSharing = (suggestions: TravelSuggestions, language: 'en' | 'fr'): string => {
  const title = language === 'fr' ? 'Plan de Voyage pour' : 'Travel Plan for';
  let text = `${title} ${suggestions.destination.name}\n\n`;

  // Must-see attractions
  text += `${language === 'fr' ? '🏛️ Attractions Incontournables' : '🏛️ Must-See Attractions'}\n`;
  suggestions.mustSeeAttractions.forEach(attraction => {
    text += `• ${attraction.title} - ${attraction.description}\n`;
  });

  // Hidden gems
  text += `\n${language === 'fr' ? '💎 Trésors Cachés' : '💎 Hidden Gems'}\n`;
  suggestions.hiddenGems.forEach(gem => {
    text += `• ${gem.title} - ${gem.description}\n`;
  });

  // Restaurants
  text += `\n${language === 'fr' ? '🍽️ Restaurants' : '🍽️ Restaurants'}\n`;
  suggestions.restaurants.forEach(restaurant => {
    text += `• ${restaurant.title} - ${restaurant.description}\n`;
  });

  // Itinerary
  text += `\n${language === 'fr' ? '📅 Itinéraire' : '📅 Itinerary'}\n`;
  suggestions.itinerary.forEach(day => {
    text += `${language === 'fr' ? 'Jour' : 'Day'} ${day.day}:\n`;
    day.activities.forEach(activity => {
      text += `• ${activity}\n`;
    });
    text += '\n';
  });

  // Practical advice
  text += `${language === 'fr' ? '💡 Conseils Pratiques' : '💡 Practical Advice'}\n`;
  text += `${suggestions.practicalAdvice}\n\n`;

  // Accommodation
  text += `${language === 'fr' ? '🏨 Hébergement Recommandé' : '🏨 Recommended Accommodation'}\n`;
  suggestions.accommodation.forEach(acc => {
    text += `• ${acc.title} - ${acc.description}\n`;
  });

  // Add source URL
  text += `\n${language === 'fr' ? 'Trouvé sur' : 'Found on'} https://www.travellingtrip.com/`;

  return text;
};

export const shareContent = async (text: string) => {
  // Check if running on mobile
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  if (isMobile && navigator.share) {
    // Use Web Share API for mobile
    try {
      await navigator.share({
        text: text
      });
      return true;
    } catch (error) {
      console.error('Error sharing:', error);
      return false;
    }
  } else {
    // Use clipboard for desktop
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      return false;
    }
  }
};
