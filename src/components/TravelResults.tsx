import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Map, MapPin, Loader2, Plus, Info, ExternalLink } from 'lucide-react';
import { TravelSuggestions } from '@/types';
import { LocationPhotos } from './LocationPhotos';
import { DynamicMap } from './DynamicMap';
import { ArrangeItems } from './ui/ArrangeItems';
import { Button } from './ui/button';
import { AddDate } from './ui/AddDate';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from './ui/use-toast';
import { getGoogleMapsUrl } from "@/lib/utils";
import { generateMoreAttractions, generateMoreHiddenGems, generateMoreActivities } from "@/lib/openai";
import { analytics } from '@/lib/analytics';
import { formatTravelPlanForSharing, shareContent } from "@/lib/shareUtils";
import { NavigationBar } from "./NavigationBar";
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { saveTrip } from '@/lib/tripService';
import { PlaceCard } from './ui/PlaceCard';
import { BottomNavBar } from './ui/BottomNavBar';

interface TravelResultsProps {
  suggestions: TravelSuggestions;
  language: 'en' | 'fr';
  duration: number;
  destination: string;
  interests?: string[];
  onReset?: () => void;
}

interface SectionState {
  attractions: boolean;
  restaurants: boolean;
  gems: boolean;
  activities: boolean;
  itinerary: boolean;
  events: boolean;
  accommodation: boolean;
}

const interestTranslations: Record<string, string> = {
  'Food & Dining': 'Gastronomie',
  'History & Culture': 'Histoire & Culture',
  'Nature & Outdoors': 'Nature & Plein Air',
  'Shopping': 'Shopping',
  'Art & Museums': 'Art & Musées',
  'Nightlife': 'Vie Nocturne',
  'Sports': 'Sports',
  'Relaxation': 'Détente',
  'Adventure': 'Aventure',
  'Local Experience': 'Expérience Locale',
  'Photography': 'Photographie',
  'Architecture': 'Architecture',
  'Couple Trip': 'Voyage en Couple'
};

const findRelevantInterests = (description: string = '', interests: string[] = []) => {
  return interests.filter(interest => {
    const englishTerm = interest.toLowerCase();
    const frenchTerm = interestTranslations[interest]?.toLowerCase() || '';
    return description.toLowerCase().includes(englishTerm) || 
           description.toLowerCase().includes(frenchTerm);
  });
};

function TravelResults({ 
  suggestions, 
  language, 
  duration, 
  destination,
  interests,
  onReset
}: TravelResultsProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isSubscribed } = useSubscription();
  const [expandedSections, setExpandedSections] = useState<SectionState>({
    attractions: true,
    restaurants: true,
    gems: true,
    activities: true,
    itinerary: true,
    events: true,
    accommodation: true
  });
  
  // Add view mode state
  const [viewMode, setViewMode] = useState<'itinerary' | 'places'>('itinerary');
  const [additionalAttractions, setAdditionalAttractions] = useState<any[]>([]);
  const [additionalGems, setAdditionalGems] = useState<any[]>([]);
  const [additionalActivities, setAdditionalActivities] = useState<any[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState<Record<string, boolean>>({
    attractions: false,
    gems: false,
    activities: false,
  });
  const [itineraryActivities, setItineraryActivities] = useState<{ [key: number]: string[] }>({});
  const resultsTitleRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isMapExpanded, setIsMapExpanded] = useState(() => {
    // Check if we're on desktop using window width
    return window.innerWidth >= 1024; // 1024px is the 'lg' breakpoint in Tailwind
  });
  const [isFullscreenMap, setIsFullscreenMap] = useState(false);
  const [itineraryMapItems, setItineraryMapItems] = useState<any[]>([]);
  const [suggestionsState, setSuggestionsState] = useState<TravelSuggestions>(suggestions);
  const [startDate, setStartDate] = useState<Date | null>(new Date());

  // Ensure we have valid suggestions before accessing properties
  if (!suggestionsState || !suggestionsState.itinerary) {
    return null;
  }

  useEffect(() => {
    analytics.trackViewTravelResults(destination);
    // Initialize itinerary activities from suggestions
    const initialActivities = (suggestionsState.itinerary || []).reduce((acc, day) => {
      // Convert the new activity structure to formatted strings for backward compatibility
      const formattedActivities = day.activities.map(activity => {
        return `${activity.activity} at ${activity.place}` +
               (activity.nearbyLandmarks && activity.nearbyLandmarks.length > 0 ? 
                 ` (Near: ${activity.nearbyLandmarks.join(', ')})` : '') +
               (activity.travelTime ? ` - ${activity.travelTime} from previous location` : '');
      });
      acc[day.day] = formattedActivities;
      return acc;
    }, {} as { [key: number]: string[] });
    setItineraryActivities(initialActivities);
  }, [destination, suggestionsState]);

  useEffect(() => {
    if (suggestions) {
      setSuggestionsState(suggestions);
    }
  }, [suggestions]);

  const handleShareClick = async () => {
    if (!user || !isSubscribed) {
      toast({
        title: language === 'en' ? 'Login Required' : 'Connexion Requise',
        description: language === 'en'
          ? 'Please login to share your trip'
          : 'Veuillez vous connecter pour partager votre voyage',
        variant: "destructive",
      });
      return;
    }

    try {
      const formattedText = formatTravelPlanForSharing(suggestionsState, language);
      const success = await shareContent(formattedText);
      const method = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) && 'share' in navigator ? 'native-share' : 'clipboard';
      analytics.trackShare(destination, method);
      
      if (success) {
        toast({
          title: "Copied!",
          description: "Link copied to clipboard"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to copy link",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast({
        title: "Error",
        description: "Failed to share",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (resultsTitleRef.current) {
      resultsTitleRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [suggestionsState]);

  const toggleSection = (section: keyof SectionState) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleLoadMoreAttractions = async () => {
    analytics.trackLoadMore('attractions', destination);
    setIsLoadingMore(prev => ({ ...prev, attractions: true }));
    try {
      const newAttractions = await generateMoreAttractions(destination, language, suggestionsState.mustSeeAttractions);
      setAdditionalAttractions(prev => [...prev, ...newAttractions]);
      toast({
        title: language === 'en' ? 'Success!' : 'Succès !',
        description: language === 'en' 
          ? 'New attractions have been added to the list.' 
          : 'De nouvelles attractions ont été ajoutées à la liste.',
      });
    } catch (error) {
      console.error('Error loading more attractions:', error);
      toast({
        title: language === 'en' ? 'Error' : 'Erreur',
        description: language === 'en'
          ? 'Failed to load more attractions. Please try again.'
          : 'Impossible de charger plus d\'attractions. Veuillez réessayer.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingMore(prev => ({ ...prev, attractions: false }));
    }
  };

  const handleLoadMoreGems = async () => {
    analytics.trackLoadMore('hiddenGems', destination);
    setIsLoadingMore(prev => ({ ...prev, gems: true }));
    try {
      const newGems = await generateMoreHiddenGems(destination, language, suggestionsState.hiddenGems);
      setAdditionalGems(prev => [...prev, ...newGems]);
      toast({
        title: language === 'en' ? 'Success!' : 'Succès !',
        description: language === 'en' 
          ? 'New hidden gems have been added to the list.' 
          : 'De nouveaux trésors cachés ont été ajoutés à la liste.',
      });
    } catch (error) {
      console.error('Error loading more hidden gems:', error);
      toast({
        title: language === 'en' ? 'Error' : 'Erreur',
        description: language === 'en'
          ? 'Failed to load more hidden gems. Please try again.'
          : 'Impossible de charger plus de trésors cachés. Veuillez réessayer.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingMore(prev => ({ ...prev, gems: false }));
    }
  };

  const handleLoadMoreActivities = async () => {
    analytics.trackLoadMore('activities', destination);
    setIsLoadingMore(prev => ({ ...prev, activities: true }));
    try {
      const newActivities = await generateMoreActivities(destination, language, additionalActivities);
      setAdditionalActivities(prev => [...prev, ...newActivities]);
      toast({
        title: language === 'en' ? 'Success!' : 'Succès !',
        description: language === 'en' 
          ? 'New activity ideas have been added to the list.' 
          : 'De nouvelles idées d\'activités ont été ajoutées à la liste.',
      });
    } catch (error) {
      console.error('Error loading more activities:', error);
      toast({
        title: language === 'en' ? 'Error' : 'Erreur',
        description: language === 'en'
          ? 'Failed to load more activities. Please try again.'
          : 'Impossible de charger plus d\'activités. Veuillez réessayer.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingMore(prev => ({ ...prev, activities: false }));
    }
  };

  const handleAddToItinerary = (title: string, description: string) => {
    // Track the "Add to Itinerary" button click in Mixpanel
    analytics.trackAddToItinerary(destination, title);
    
    setItineraryActivities(prev => {
      const newActivities = { ...prev };
      const lastDay = Math.max(...Object.keys(prev).map(Number));
      const currentDayActivities = prev[lastDay] || [];
      
      // Format the new activity with the title and description
      const newActivity = `${title} - ${description}`;
      
      newActivities[lastDay] = [...currentDayActivities, newActivity];
      return newActivities;
    });
    
    toast({
      title: language === 'fr' ? "Ajouté à l'itinéraire" : "Added to Itinerary",
      description: language === 'fr' ? "Élément ajouté au dernier jour de votre itinéraire" : "Item added to the last day of your itinerary",
    });
  };

  const handleCrossDayMove = (sourceDayIndex: number, targetDayIndex: number, sourceIndex: number, targetIndex: number) => {
    setItineraryActivities(prev => {
      const newActivities = { ...prev };
      const sourceDayActivities = [...prev[sourceDayIndex]];
      const targetDayActivities = [...(prev[targetDayIndex] || [])];
      
      // Get the activity to move
      const [movedActivity] = sourceDayActivities.splice(sourceIndex, 1);
      
      // Insert the activity at the target position
      targetDayActivities.splice(targetIndex, 0, movedActivity);
      
      // Update both days
      newActivities[sourceDayIndex] = sourceDayActivities;
      newActivities[targetDayIndex] = targetDayActivities;
      
      return newActivities;
    });
  };

  const handleDeleteActivity = (dayIndex: number, activityIndex: number) => {
    setItineraryActivities(prev => {
      const newActivities = { ...prev };
      const dayActivities = [...prev[dayIndex]];
      
      // Remove the activity at the specified index
      dayActivities.splice(activityIndex, 1);
      
      // If there are no more activities for this day, remove the day
      if (dayActivities.length === 0) {
        delete newActivities[dayIndex];
      } else {
        newActivities[dayIndex] = dayActivities;
      }
      
      return newActivities;
    });

  };

  const isInItinerary = (title: string) => {
    return Object.values(itineraryActivities).some(activities => 
      activities.some(activity => activity.includes(title))
    );
  };

  // Function to extract activity information from a formatted activity string or activity object
  const extractActivityInfo = (activity: string | any) => {
    // If activity is already an object with the required properties, use it directly
    if (typeof activity !== 'string' && activity.activity && activity.place) {
      return {
        title: activity.place,
        description: activity.description || `${activity.activity} at ${activity.place}`,
        destination: activity.place,
        nearbyLandmarks: activity.nearbyLandmarks || [],
        travelTime: activity.travelTime,
        bookingInfo: activity.bookingInfo
      };
    }
    
    // Otherwise, treat it as a string
    let activityText = typeof activity === 'string' ? activity : `${activity.activity} at ${activity.place}`;
    
    // Remove any HTML tags
    activityText = activityText.replace(/<\/?[^>]+(>|$)/g, "");
    
    let title = '';
    let description = '';
    let destination = '';
    let nearbyLandmarks: string[] = [];
    let travelTime: string | null = null;
    let bookingInfo: string | null = null;
    
    // Extract place name from the activity text
    // Try to extract time and place information
    const timeMatch = activityText.match(/(\w+):\s*(\d+[h:]\d+)\s*-\s*(.*)/);
    if (timeMatch && timeMatch[3]) {
      // If we have a time format, use the part after the time as title
      title = timeMatch[3].trim();
      description = activityText;
    } else {
      // Otherwise try to split by "at" to get the activity and place
      const atMatch = activityText.match(/(.*) at (.*?)(?:\s+\(Near:|$|\s+-)/);
      if (atMatch && atMatch[1] && atMatch[2]) {
        title = atMatch[1].trim();
        destination = atMatch[2].trim();
        description = activityText;
      } else {
        // Fallback to the full text
        title = activityText;
        description = '';
      }
    }
    
    // Extract nearby landmarks if present
    const landmarksMatch = activityText.match(/Near: (.*?)(?:\)|$)/);
    if (landmarksMatch && landmarksMatch[1]) {
      nearbyLandmarks = landmarksMatch[1].split(',').map(l => l.trim());
    }
    
    // Extract travel time if present
    const travelTimeMatch = activityText.match(/- (.*? from previous location)/);
    if (travelTimeMatch && travelTimeMatch[1]) {
      travelTime = travelTimeMatch[1];
    }
    
    // Extract booking info if present
    const bookingMatch = activityText.match(/Book at: (.*?)(?:$|\s+-)/);
    if (bookingMatch && bookingMatch[1]) {
      bookingInfo = bookingMatch[1].trim();
    }
    
    return {
      title,
      description,
      destination,
      nearbyLandmarks,
      travelTime,
      bookingInfo
    };
  };

  // Extract coordinates from activity title by looking up in attractions and hidden gems
  const findCoordinatesForActivity = (activityTitle: string) => {
    // First check in mustSeeAttractions
    const attraction = suggestionsState.mustSeeAttractions.find(
      item => item.title.toLowerCase().includes(activityTitle.toLowerCase()) || 
             activityTitle.toLowerCase().includes(item.title.toLowerCase())
    );
    if (attraction?.coordinates) return attraction.coordinates;

    // Then check in hiddenGems
    const gem = suggestionsState.hiddenGems.find(
      item => item.title.toLowerCase().includes(activityTitle.toLowerCase()) || 
             activityTitle.toLowerCase().includes(item.title.toLowerCase())
    );
    if (gem?.coordinates) return gem.coordinates;

    // Then check in events
    const event = suggestionsState.events.find(
      item => item.title.toLowerCase().includes(activityTitle.toLowerCase()) || 
             activityTitle.toLowerCase().includes(item.title.toLowerCase())
    );
    if (event?.coordinates) return event.coordinates;

    // If no match found, return destination coordinates as fallback
    return suggestionsState.destination.coordinates;
  };

  // Prepare itinerary items for map display
  const prepareItineraryMapItems = () => {
    const items: any[] = [];
    let globalIndex = 0;
    let continuousIndex = 1; // Start from 1 for continuous numbering

    // Debug: Log the itinerary activities
    console.log('Itinerary activities:', itineraryActivities);
    
    // Sort the days numerically to ensure proper order
    const sortedDays = Object.keys(itineraryActivities)
      .map(day => parseInt(day))
      .filter(day => !isNaN(day))
      .sort((a, b) => a - b);
    
    // Process each day in order
    sortedDays.forEach(day => {
      const dayActivities = itineraryActivities[day] || [];
      
      // Add each activity for this day
      dayActivities.forEach((activity, localIndex) => {
        const activityInfo = extractActivityInfo(activity);
        const coordinates = findCoordinatesForActivity(activityInfo.title);
        
        items.push({
          day: day,
          index: localIndex,
          displayIndex: continuousIndex++, // Use a simple continuous counter starting from 1
          title: activityInfo.title,
          description: activityInfo.description,
          location: activityInfo.destination,
          coordinates
        });
        
        globalIndex++;
      });
    });

    console.log('Prepared map items:', items);
    setItineraryMapItems(items);
  };

  const handleMapButtonClick = () => {
    if (!isMapExpanded) {
      // If map is not expanded, expand it normally
      prepareItineraryMapItems(); // Prepare map items before showing the map
      setIsMapExpanded(true);
    } else {
      // If map is already expanded, toggle fullscreen mode
      prepareItineraryMapItems();
      setIsFullscreenMap(!isFullscreenMap);
    }
  };

  const ResultSection = ({ id, title, items, type }: { id: string; title: string; items: any[]; type: keyof SectionState }) => {
    if (!items || !Array.isArray(items)) {
      return null;
    }

    const allItems = type === 'attractions' 
      ? [...items, ...additionalAttractions]
      : type === 'gems'
      ? [...items, ...additionalGems]
      : type === 'activities'
      ? [...items, ...additionalActivities]
      : items;

    if (allItems.length === 0) {
      return null;
    }

    if (type === 'events' && items.length === 0) {
      return null;
    }

    return (
      <section id={id} className={id === 'itinerary' ? "rounded-lg shadow-sm p-3 lg:p-4 mb-6 w-full" : "bg-white rounded-lg shadow-sm p-3 lg:p-4 mb-6 w-full"}>
        <div
          className="flex justify-between items-center cursor-pointer w-full"
          style={{ backgroundColor: '#003049', padding: '0.25rem 0.5rem', borderRadius: '0.375rem', marginBottom: '0.75rem' }}
          onClick={() => toggleSection(type)}
        >
          <h2 className="text-lg lg:text-xl font-semibold text-white">{title}</h2>
          {expandedSections[type] ? <ChevronUp className="text-white" /> : <ChevronDown className="text-white" />}
        </div>
        {expandedSections[type] && (
          <div className="mt-3 space-y-3 w-full">
            {type === 'itinerary' && (
              <>
                <div className="text-sm text-black border border-black rounded-md p-3 mb-4 relative">
                  {language === 'fr' 
                    ? 'Ceci est un itinéraire de base. Réoranisez les étapes d\'une journée en cliquant et modifiant leurs positions.'
                    : 'This is a basic itinerary. Re-arrange the steps of one day by clicking and dragging them.'}
                </div>
                <div className="p-3 lg:p-4 space-y-8">
                  {suggestionsState.itinerary.map((day, dayIdx) => {
                    // Calculate the starting index for this day based on previous days
                    const startingIndex = suggestionsState.itinerary
                      .slice(0, dayIdx)
                      .reduce((sum, prevDay) => sum + (itineraryActivities[prevDay.day]?.length || 0), 0);
                    
                    return (
                      <div key={day.day} id={`day-${day.day}`} className="border-b pb-6 last:border-b-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4">
                          <div className="flex-shrink-0">
                            {day.day === 1 ? (
                              <AddDate
                                language={language}
                                selectedDate={startDate}
                                onDateSelected={(date) => setStartDate(date)}
                              />
                            ) : (
                              <div className="font-medium">
                                {startDate ? (
                                  format(addDays(startDate, day.day - 1), 'PPP', { 
                                    locale: language === 'fr' ? fr : undefined 
                                  })
                                ) : (
                                  language === 'en' ? `Day ${day.day}` : `Jour ${day.day}`
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <ArrangeItems
                          items={itineraryActivities[day.day] || []}
                          startingIndex={startingIndex}
                          renderItem={(activity: string) => {
                            const activityInfo = extractActivityInfo(activity);
                            
                            // Find the matching activity in the itinerary data from OpenAI
                            const matchingItineraryDay = suggestionsState.itinerary.find(d => d.day === day.day);
                            const matchingActivity = matchingItineraryDay?.activities.find(a => 
                              a.activity === activityInfo.title || 
                              a.place === activityInfo.destination ||
                              (a.activity && activityInfo.title.includes(a.activity)) ||
                              (a.place && activityInfo.title.includes(a.place))
                            );
                            
                            // Process booking info
                            const bookingInfo = matchingActivity?.bookingInfo || activityInfo.bookingInfo || null;
                            const isUrl = bookingInfo && (
                              bookingInfo.startsWith('http://') || 
                              bookingInfo.startsWith('https://') || 
                              bookingInfo.startsWith('www.')
                            );
                            
                            return (
                              <div className="w-full">
                                <p className="text-black text-base flex-1 mb-2 font-bold" style={{ marginLeft: '25px' }}>
                                  {matchingActivity?.activity || activityInfo.title}
                                </p>
                                <PlaceCard 
                                  title={matchingActivity?.activity || activityInfo.title}
                                  description={matchingActivity?.description || activityInfo.description}
                                  location={matchingActivity?.place || activityInfo.destination}
                                  language={language}
                                  nearbyLandmarks={matchingActivity?.nearbyLandmarks || activityInfo.nearbyLandmarks}
                                  travelTime={matchingActivity?.travelTime || activityInfo.travelTime}
                                  bookingUrl={isUrl ? bookingInfo : null}
                                  bookingInfo={!isUrl ? bookingInfo : null}
                                  mustSeeAttractions={suggestionsState.mustSeeAttractions}
                                  hiddenGems={suggestionsState.hiddenGems}
                                  compact={true}
                                />
                              </div>
                            );
                          }}
                          onReorder={(sourceIndex, targetIndex) => {
                            setItineraryActivities(prev => {
                              const newActivities = { ...prev };
                              const dayActivities = [...prev[day.day]];
                              
                              // Swap activities
                              const temp = dayActivities[sourceIndex];
                              dayActivities[sourceIndex] = dayActivities[targetIndex];
                              dayActivities[targetIndex] = temp;
                              
                              newActivities[day.day] = dayActivities;
                              return newActivities;
                            });
                          }}
                          onDelete={(index) => handleDeleteActivity(day.day, index)}
                          dayIndex={day.day}
                          onCrossDayMove={handleCrossDayMove}
                        />
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            {type === 'accommodation' && (
              <div className="overflow-x-auto -mx-4 px-4">
                <div className="flex gap-4 mb-6 min-w-max">
                  <a
                    href={`https://${language === 'fr' ? 'fr' : 'www'}.airbnb.com/s/${encodeURIComponent(suggestionsState.destination.name)}/homes`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-4 py-2 bg-[#FF5A5F] text-white rounded-md text-sm whitespace-nowrap"
                  >
                    {language === 'en' ? 'Airbnb' : 'Airbnb'}
                  </a>
                  <a
                    href={`https://booking.com/${encodeURIComponent(suggestionsState.destination.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-4 py-2 bg-[#003580] text-white rounded-md hover:bg-[#003580]/90 transition-colors text-[14px] sm:text-base"
                  >
                    {language === 'en' ? 'Booking.com' : 'Booking.com'}
                  </a>
                  <a
                    href={`https://trip.tp.st/KPH2sAPm`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-4 py-2 bg-[#003580] text-white rounded-md hover:bg-[#003580]/90 transition-colors whitespace-nowrap"
                  >
                    {language === 'en' ? 'Trip.com' : 'Trip.com'}
                  </a>
                </div>
              </div>
            )}
            {type !== 'itinerary' && (
              <>
                {allItems.map((item) => {
                  const relevantInterests = findRelevantInterests(item.description, interests);
                  return (
                    <div key={`${item.title}-${item.location || ''}-${item.coordinates?.lat || ''}`} className="border-b pb-4 last:border-b-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold flex items-center">
                          {item.title}
                        </h3>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {isInItinerary(item.title) && (
                          <span className="px-1.5 py-0.5 text-xs rounded-full text-white bg-[#205283]">
                            {language === 'fr' ? 'Dans l\'itinéraire' : 'In itinerary'}
                          </span>
                        )}
                        {relevantInterests.map((interest, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 text-xs rounded-full text-white bg-[#81160E]"
                          >
                            {language === 'en' ? interest : (interestTranslations[interest] || interest)}
                          </span>
                        ))}
                      </div>
                      <p className="text-black text-base mt-2">{item.description}</p>
                      {item.location && (
                        <div className="flex items-center gap-4 text-gray-500 mt-2 text-[14px]">
                          <MapPin className="w-4 h-4 mr-1" />
                          <span>{item.location}</span>
                          {item.coordinates && (
                            <a
                              href={getGoogleMapsUrl(item)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center px-4 py-2 bg-background border border-primary/20 hover:border-primary/50 text-primary rounded-md transition-colors text-[14px] sm:text-base"
                            >
                              <Map className="w-4 h-4" />
                              <span className="hidden sm:inline">{language === 'en' ? 'See on Map' : 'Voir sur la carte'}</span>
                            </a>
                          )}
                        </div>
                      )}
                      {item.coordinates && (
                        <>
                          <div className="mt-4">
                            <LocationPhotos
                              location={item.title}
                              coordinates={item.coordinates}
                              language={language}
                            />
                          </div>
                          <div className="flex justify-center gap-4 px-4 pt-4">
                            <a 
                              href={`https://www.google.com/search?q=${encodeURIComponent(item.title)}+${encodeURIComponent(suggestionsState.destination.name)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center px-4 py-1 bg-background border border-primary/20 hover:border-primary/50 text-primary rounded-md transition-colors text-[14px] sm:text-base"
                            >
                              <Info className="w-4 h-4" />
                              <span className="hidden sm:inline ml-2">{language === 'en' ? 'More Info' : 'Plus d\'infos'}</span>
                            </a>
                            {(type === 'attractions' || type === 'gems') && (
                              <a
                                href={`https://www.tiqets.com/en/search/?q=${encodeURIComponent(item.title)}+${encodeURIComponent(suggestionsState.destination.name)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center px-4 py-1 bg-[#003049] text-white rounded-md transition-colors text-[14px] sm:text-base"
                              >
                                <ExternalLink className="w-4 h-4" />
                                <span className="hidden sm:inline ml-2">{language === 'en' ? 'Book Tickets' : 'Réserver'}</span>
                              </a>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-[14px] sm:text-base w-full sm:w-auto flex items-center justify-center"
                              onClick={() => handleAddToItinerary(item.title, item.description)}
                            >
                              <Plus className="hidden sm:inline-block w-4 h-4 mr-2" />
                              {language === 'en' ? 'Add to Itinerary' : 'Ajouter à l\'itinéraire'}
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
                {(type === 'attractions' || type === 'gems' || type === 'activities') && (
                  <div className="mt-6 flex justify-center gap-4">
                    <button
                      onClick={type === 'attractions' ? handleLoadMoreAttractions : type === 'gems' ? handleLoadMoreGems : handleLoadMoreActivities}
                      disabled={isLoadingMore[type === 'attractions' ? 'attractions' : type === 'gems' ? 'gems' : 'activities']}
                      className="inline-flex items-center justify-center px-4 md:px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 text-[14px] sm:text-base"
                    >
                      {isLoadingMore[type === 'attractions' ? 'attractions' : type === 'gems' ? 'gems' : 'activities'] ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          <span>{language === 'en' ? 'Loading...' : 'Chargement...'}</span>
                        </>
                      ) : (
                        <span>
                          {language === 'en' ? 'See more suggestions' : 'Voir plus de suggestions'}
                        </span>
                      )}
                    </button>
                    {type !== 'attractions' && (
                      <a
                        href={`https://www.tiktok.com/search?q=${encodeURIComponent(destination)}%20${type === 'gems' ? 'hidden gems' : 'activities'}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center px-4 py-1 bg-black text-white rounded-md hover:bg-black/90 transition-colors text-[14px] sm:text-base"
                      >
                        <svg
                          className="w-4 h-4 mr-2"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 16c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7zm3.5-13H15v5h5V8.5h-4.5V6zM9 11h4v4H9v-4z"/>
                        </svg>
                        {language === 'en' ? 'Watch on TikTok' : 'Voir sur TikTok'}
                      </a>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </section>
    );
  };

  const handleSaveTrip = async () => {
    if (!user) {
      toast({
        title: language === 'en' ? 'Login Required' : 'Connexion Requise',
        description: language === 'en'
          ? 'Please login to save your trip'
          : 'Veuillez vous connecter pour sauvegarder votre voyage',
        variant: "destructive",
      });
      return;
    }

    try {
      // Update travel suggestions with the modified itinerary
      const updatedSuggestions = {
        ...suggestionsState,
        itinerary: suggestionsState.itinerary.map(day => ({
          ...day,
          activities: itineraryActivities[day.day] || day.activities
        }))
      };

      await saveTrip({
        title: destination,
        destination,
        duration,
        language,
        suggestions: updatedSuggestions,
        userId: user.id
      });

      toast({
        title: language === 'en' ? 'Trip Saved!' : 'Voyage Sauvegardé !',
        description: language === 'en'
          ? 'Your trip has been saved successfully.'
          : 'Votre voyage a été sauvegardé avec succès.',
      });

      analytics.trackSaveTrip({
        destination,
        duration,
        language,
      });
    } catch (error) {
      console.error('Error saving trip:', error);
      toast({
        title: language === 'en' ? 'Save Failed' : 'Échec de la Sauvegarde',
        description: language === 'en'
          ? 'Failed to save your trip. Please try again.'
          : 'Échec de la sauvegarde de votre voyage. Veuillez réessayer.',
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    if (onReset) {
      onReset();
    }
  };

  return (
    <div ref={contentRef} className="relative min-h-screen bg-white w-full">
      <div ref={resultsTitleRef} className="px-0 py-3 rounded-lg mb-4 w-full">
        <h2 className="text-xl lg:text-2xl font-bold mb-3">
          {language === 'en'
            ? `Your ${duration}-day trip to ${destination}`
            : `Votre voyage de ${duration} jours à ${destination}`}
        </h2>
      </div>

      {/* Itinerary and Places buttons */}
      <div className="flex gap-4 mb-3 w-full">
        <span
          className={`text-[#003049] ${viewMode === 'itinerary' ? 'underline font-bold' : ''}`}
          onClick={() => setViewMode('itinerary')}
          style={{ cursor: 'pointer' }}
          onMouseEnter={(e) => e.currentTarget.classList.add('underline')}
          onMouseLeave={(e) => e.currentTarget.classList.remove('underline')}
        >
          {language === 'en' ? 'Itinerary' : 'Itinéraire'}
        </span>
        <span
          className={`text-[#003049] ${viewMode === 'places' ? 'underline font-bold' : ''}`}
          onClick={() => setViewMode('places')}
          style={{ cursor: 'pointer' }}
          onMouseEnter={(e) => e.currentTarget.classList.add('underline')}
          onMouseLeave={(e) => e.currentTarget.classList.remove('underline')}
        >
          {language === 'en' ? 'Places' : 'Lieux'}
        </span>
      </div>

      {viewMode !== 'places' && (
        <NavigationBar language={language} suggestions={suggestionsState} startDate={startDate} />
      )}

      {/* Fullscreen map */}
      {isFullscreenMap && (
        <DynamicMap
          suggestions={suggestionsState}
          fullscreen={true}
          onClose={() => setIsFullscreenMap(false)}
          itineraryItems={itineraryMapItems}
        />
      )}

      {/* Conditional rendering based on map state and view mode */}
      {viewMode === 'itinerary' && !isFullscreenMap && (
        <div className={`flex flex-col lg:flex-row ${isMapExpanded ? 'lg:space-x-4' : ''} w-full max-w-full px-0`}>
          {/* Itinerary section - takes full width when map is not expanded, or left side when map is expanded */}
          <div className={`${isMapExpanded ? 'lg:w-1/2' : 'w-full'}`}>
            <ResultSection
              id="itinerary"
              title={language === 'en' ? 'Day-by-Day Itinerary' : 'Itinéraire Jour par Jour'}
              items={suggestionsState.itinerary}
              type="itinerary"
            />
          </div>
          
          {/* Map section - only visible when expanded, takes right side */}
          {isMapExpanded && !isFullscreenMap && (
            <div className="w-full lg:w-1/2 mt-4 lg:mt-0 sticky top-4 h-[600px]">
              <DynamicMap
                suggestions={suggestionsState}
                itineraryItems={itineraryMapItems}
              />
            </div>
          )}
        </div>
      )}

      {/* Places view or non-itinerary view with map */}
      {(viewMode !== 'itinerary' || (viewMode === 'itinerary' && isFullscreenMap)) && (
        <>
          {isMapExpanded && !isFullscreenMap && (
            <div className="mb-4 w-full">
              <DynamicMap
                suggestions={suggestionsState}
                itineraryItems={itineraryMapItems}
              />
            </div>
          )}

          {viewMode === 'itinerary' && (
            <ResultSection
              id="itinerary"
              title={language === 'en' ? 'Day-by-Day Itinerary' : 'Itinéraire Jour par Jour'}
              items={suggestionsState.itinerary}
              type="itinerary"
            />
          )}
        </>
      )}
      {viewMode === 'places' && (
        <>
          <ResultSection
            id="attractions"
            title={language === 'en' ? 'Must-See Attractions' : 'Attractions Incontournables'}
            items={suggestionsState.mustSeeAttractions}
            type="attractions"
          />
          
          <ResultSection
            id="gems"
            title={language === 'en' ? 'Hidden Gems' : 'Trésors Cachés'}
            items={suggestionsState.hiddenGems}
            type="gems"
          />
        </>
      )}
      <BottomNavBar 
        language={language}
        isMapExpanded={isMapExpanded}
        onShareClick={handleShareClick}
        onMapToggle={handleMapButtonClick}
        onReset={handleReset}
        onSaveTrip={handleSaveTrip}
        isLoggedIn={!!user}
      />
    </div>
  );
}

export default TravelResults;