import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Map, MapPin, Share2, Loader2, Plus, Info, Ticket, X, Save, ExternalLink, Printer } from 'lucide-react';
import { TravelSuggestions, TravelSuggestion } from '@/types';
import { LocationPhotos } from './LocationPhotos';
import { DynamicMap } from './DynamicMap';
import { ArrangeItems } from './ui/ArrangeItems';
import { Button } from './ui/button';
import { PreciseItinerary } from './PreciseItinerary';
import { AddDate } from './ui/AddDate';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from './ui/use-toast';
import { getGoogleMapsUrl } from "@/lib/utils";
import { generateMoreAttractions, generateMoreHiddenGems, generateMoreActivities } from "@/lib/openai";
import { analytics } from '@/lib/analytics';
import { formatTravelPlanForSharing, shareContent } from "@/lib/shareUtils";
import { NavigationBar } from "./NavigationBar";
import { ActivityIdeasInterests } from '@/components/ui/ActivityIdeasInterests';
import { SpecificPracticalAdvice } from './ui/SpecificPracticalAdvice';
import { RestaurantIdeas } from './ui/RestaurantIdeas';
import { PrintToPDF } from './ui/PrintToPDF';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { saveTrip } from '@/lib/tripService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkout } from '@/components/ui/Checkout';

interface TravelResultsProps {
  suggestions: TravelSuggestions;
  language: 'en' | 'fr';
  duration: number;
  destination: string;
  interests: string[];
  onReset: () => void;
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
  const [flickrPhotos, setFlickrPhotos] = useState<string[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [savedAnswers, setSavedAnswers] = useState<string[]>([]);
  const [suggestionsState, setSuggestionsState] = useState<TravelSuggestions>(suggestions);
  const [startDate, setStartDate] = useState<Date>();
  const [showInstructions, setShowInstructions] = useState(true);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [tripTitle, setTripTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [autoLoadPhotos, setAutoLoadPhotos] = useState(false);

  const renderTextWithLinks = (text: string) => {
    // Handle Markdown-style links [text](url)
    const markdownRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const boldRegex = /\*\*([^*]+)\*\*/g;
    const bulletRegex = /^\* (.+)$/gm;
    
    // First replace Markdown links with clickable links
    let processedText = text.replace(markdownRegex, (_, linkText, url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">${linkText}</a>`;
    });
    
    // Then handle any remaining plain URLs
    processedText = processedText.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">${url}</a>`;
    });

    // Handle bold text
    processedText = processedText.replace(boldRegex, '<strong>$1</strong>');

    // Handle bullet points
    processedText = processedText.replace(bulletRegex, '<div class="flex gap-2 items-start"><span class="mt-1.5">•</span><span>$1</span></div>');

    // Handle line breaks
    processedText = processedText.replace(/\n/g, '<br />');

    return (
      <div 
        className="text-sm whitespace-pre-wrap space-y-2"
        dangerouslySetInnerHTML={{ __html: processedText }}
      />
    );
  };

  // Ensure we have valid suggestions before accessing properties
  if (!suggestionsState || !suggestionsState.itinerary) {
    return null;
  }

  const fetchFlickrPhotos = async (searchTerm: string) => {
    // If no search term is provided, return empty array
    if (!searchTerm || searchTerm.trim() === '') {
      return [];
    }
    
    const API_KEY = '4306b70370312d7ccde3304184179b2b';
    // Add CORS proxy to avoid CORS issues
    const url = `https://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=${API_KEY}&text=${encodeURIComponent(searchTerm)}&sort=relevance&per_page=5&format=json&nojsoncallback=1&safe_search=1&content_type=1&media=photos`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.stat !== 'ok') {
        throw new Error(data.message || 'Failed to fetch photos');
      }

      if (!data.photos?.photo || data.photos.photo.length === 0) {
        console.log('No photos found for search term:', searchTerm);
        return [];
      }

      const photoUrls = data.photos.photo
        .filter((photo: any) => photo.server && photo.id && photo.secret)
        .map((photo: any) => 
          `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_b.jpg`
        );
      
      return photoUrls;
    } catch (error) {
      console.error('Error fetching Flickr photos:', error);
      // Return empty array instead of throwing error to prevent UI disruption
      return [];
    }
  };

  useEffect(() => {
    analytics.trackViewTravelResults(destination);
    // Initialize itinerary activities from suggestions
    const initialActivities = (suggestionsState.itinerary || []).reduce((acc, day) => {
      acc[day.day] = day.activities;
      return acc;
    }, {} as { [key: number]: string[] });
    setItineraryActivities(initialActivities);
  }, [destination, suggestionsState]);

  useEffect(() => {
    const loadFlickrPhotos = async () => {
      // Only attempt to load photos if we have a valid destination
      if (!destination || destination.trim() === '') {
        return;
      }
      
      setIsLoadingPhotos(true);
      try {
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        const photos = await fetchFlickrPhotos(destination);
        if (photos && photos.length > 0) {
          setFlickrPhotos(photos);
        } else {
          // If no photos found for the exact destination, try a more generic search
          const fallbackPhotos = await fetchFlickrPhotos(destination + ' landmark');
          setFlickrPhotos(fallbackPhotos);
        }
      } catch (error) {
        console.error('Error in loadFlickrPhotos:', error);
      } finally {
        setIsLoadingPhotos(false);
      }
    };

    if (destination) {
      loadFlickrPhotos();
    }
  }, [destination]);

  useEffect(() => {
    if (suggestions) {
      setSuggestionsState(suggestions);
      
      // Set autoLoadPhotos to true after a short delay to ensure the component is fully rendered
      setTimeout(() => {
        setAutoLoadPhotos(true);
      }, 2000);
    }
  }, [suggestions]);

  const handleShareClick = async () => {
    if (!user || !isSubscribed) {
      setIsCheckoutOpen(true);
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
      <section id={id} className={id === 'itinerary' ? "rounded-lg shadow-sm p-3 md:p-4 mb-6" : "bg-white rounded-lg shadow-sm p-3 md:p-4 mb-6"}>
        <div
          className="flex justify-between items-center cursor-pointer"
          style={{ backgroundColor: '#003049', padding: '0.25rem 0.5rem', borderRadius: '0.375rem', marginBottom: '0.75rem' }}
          onClick={() => toggleSection(type)}
        >
          <h2 className="text-lg md:text-xl font-semibold text-white">{title}</h2>
          {expandedSections[type] ? <ChevronUp className="text-white" /> : <ChevronDown className="text-white" />}
        </div>
        {expandedSections[type] && (
          <div className="mt-3 space-y-3">
            {type === 'itinerary' && (
              <>
                {showInstructions && (
                  <div className="text-sm text-black border border-black rounded-md p-3 mb-4 relative">
                    <button 
                      onClick={() => setShowInstructions(false)}
                      className="absolute top-2 right-2 text-gray-600 hover:text-black transition-colors"
                      aria-label="Close instructions"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {language === 'fr' 
                      ? 'Ceci est un itinéraire de base. Réoranisez les étapes d\'une journée en cliquant et modifiant leurs positions.'
                      : 'This is a basic itinerary. Re-arrange the steps of one day by clicking and dragging them.'}
                  </div>
                )}
                <div className="flex justify-center mb-4">
                  <PreciseItinerary
                    suggestions={suggestionsState}
                    language={language}
                    onNewItinerary={(newItinerary) => {
                      const newActivities: Record<number, string[]> = {};
                      newItinerary.forEach(day => {
                        newActivities[day.day] = day.activities;
                      });
                      setItineraryActivities(newActivities);
                    }}
                    currentItinerary={itineraryActivities}
                  />
                </div>
                <div className="bg-[#FDF0D5] rounded-lg p-3 md:p-4 space-y-8">
                  {items.map((day: { day: number; activities: string[] }) => (
                    <div key={day.day} className="border-b pb-6 last:border-b-0">
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
                        renderItem={(activity: string) => (
                          <p 
                            className="text-black text-base flex-1"
                            dangerouslySetInnerHTML={{ __html: activity }}
                          />
                        )}
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
                  ))}
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
                          <span className="inline-flex items-center border-inherit justify-center w-6 h-6 rounded-full bg-[#FDF0D5] border border-black-500 text-sm mr-2">
                            {type === 'restaurants' ? 'R' : type === 'accommodation' ? 'A' : allItems.indexOf(item) + 1}
                          </span>
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
                              autoLoad={autoLoadPhotos}
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
                            <a 
                              href={type === 'restaurants' ? "https://lk.gt/aGLM6" : "https://tiqets.tp.st/p7Cvr9BI"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center px-4 py-1 bg-background border border-primary/20 hover:border-primary/50 text-primary rounded-md transition-colors text-[14px] sm:text-base"
                            >
                              <Ticket className="w-4 h-4" />
                              <span className="ml-2">{language === 'en' ? 'Book' : 'Réserver'}</span>
                            </a>
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

  const handleAddRestaurant = (restaurantName: string) => {
    const newRestaurant: TravelSuggestion = {
      title: restaurantName,
      description: '',
      location: destination,
      coordinates: suggestionsState.destination.coordinates
    };
    
    setSuggestionsState(prev => ({
      ...prev,
      restaurants: [...prev.restaurants, newRestaurant]
    }));
    
    toast({
      title: language === 'fr' ? 'Restaurant ajouté !' : 'Restaurant added!',
      description: language === 'fr' ? 'Le restaurant a été ajouté à vos suggestions.' : 'The restaurant has been added to your suggestions.',
    });
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

    if (!tripTitle.trim()) {
      toast({
        title: language === 'en' ? 'Title Required' : 'Titre Requis',
        description: language === 'en'
          ? 'Please enter a title for your trip'
          : 'Veuillez entrer un titre pour votre voyage',
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // Update travel suggestions with the modified itinerary
      const updatedSuggestions = {
        ...suggestionsState,
        language: language,
        itinerary: Object.keys(itineraryActivities).map(day => ({
          day: Number(day),
          activities: itineraryActivities[Number(day)]
        }))
      };

      // Save trip to database
      await saveTrip({
        user_id: user.id,
        trip_title: tripTitle,
        destination: destination,
        data: updatedSuggestions
      });

      toast({
        title: language === 'en' ? 'Trip Saved!' : 'Voyage Sauvegardé !',
        description: language === 'en'
          ? 'Find it in "My Trips"'
          : 'Retrouvez le dans "Mes Voyages"',
      });

      setIsSaveDialogOpen(false);
    } catch (error) {
      console.error('Error saving trip:', error);
      toast({
        title: language === 'en' ? 'Error' : 'Erreur',
        description: language === 'en'
          ? 'Failed to save your trip. Please try again.'
          : 'Échec de la sauvegarde de votre voyage. Veuillez réessayer.',
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (!user || !isSubscribed) {
      setIsCheckoutOpen(true);
    } else {
      onReset();
    }
  };

  const CustomPrintToPDF = () => {
    if (!user || !isSubscribed) {
      return (
        <Button
          onClick={() => setIsCheckoutOpen(true)}
          variant="outline"
          size="sm"
          className="flex-1 sm:flex-none gap-2"
        >
          <Printer className="h-4 w-4" />
          {language === 'fr' ? 'Guide PDF' : 'PDF Guide'}
        </Button>
      );
    }
    
    return <PrintToPDF contentRef={contentRef} language={language} destination={destination} />;
  };

  return (
    <div ref={contentRef} className="relative min-h-screen bg-white">
      <div ref={resultsTitleRef} className="bg-[#5f9585] px-4 py-3 rounded-lg mb-4">
        <h2 className="text-xl md:text-2xl font-bold mb-3">
          {language === 'en'
            ? `Your ${duration}-day trip to ${destination}`
            : `Votre voyage de ${duration} jours à ${destination}`}
        </h2>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              onClick={handleShareClick}
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none gap-2"
            >
              <Share2 className="h-4 w-4" />
              {language === 'fr' ? 'Whatsapp' : 'Whatsapp'}
            </Button>
            <CustomPrintToPDF />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {(!user || !isSubscribed) && (
              <Button
                onClick={() => setIsCheckoutOpen(true)}
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                {language === 'fr' ? 'Partager ce voyage' : 'Share this trip'}
              </Button>
            )}
            <Button
              onClick={handleReset}
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none gap-2"
            >
              <X className="h-4 w-4" />
              {language === 'fr' ? 'Recommencer' : 'Start Over'}
            </Button>
          </div>
          {user && (
            <Button
              onClick={() => {
                setTripTitle(destination);
                setIsSaveDialogOpen(true);
              }}
              variant="outline"
              size="sm"
              className="w-full sm:w-auto gap-2"
            >
              <Save className="h-4 w-4" />
              {language === 'fr' ? 'Sauvegarder & partager ce voyage' : 'Save & share this trip'}
            </Button>
          )}
        </div>
      </div>

      <NavigationBar language={language} suggestions={suggestionsState} />

      {suggestionsState.destination.coordinates && (
        <div className="space-y-4 mt-4">
          {flickrPhotos.length > 0 && (
            <div className="relative group">
              <div className="overflow-x-auto pb-4 no-scrollbar md:custom-scrollbar">
                <div className="flex gap-4 min-w-max px-4">
                  {flickrPhotos.map((photo, index) => (
                    <img
                      key={index}
                      src={photo}
                      alt={`${destination} photo ${index + 1}`}
                      className="w-64 h-48 object-cover rounded-lg shadow-md"
                      loading="lazy"
                    />
                  ))}
                </div>
              </div>
              {isLoadingPhotos && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">
                      {language === 'en' ? 'Loading photos...' : 'Chargement des photos...'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-center">
            <button
              onClick={() => setIsMapExpanded(!isMapExpanded)}
              className="px-6 py-2 bg-white text-[#d99a08] border border-[#d99a08] rounded-lg hover:bg-[#d99a08] hover:text-white transition-colors duration-200 flex items-center gap-2 shadow-sm"
            >
              <Map className="w-4 h-4" />
              {isMapExpanded 
                ? (language === 'en' ? 'Hide Map' : 'Masquer la carte')
                : (language === 'en' ? 'Show Map' : 'Afficher la carte')
              }
            </button>
          </div>
          
          {isMapExpanded && (
            <div className="h-[250px] md:h-[400px] transition-all duration-300 ease-in-out">
              <DynamicMap
                suggestions={suggestionsState}
              />
            </div>
          )}
        </div>
      )}

      <ResultSection
        id="itinerary"
        title={language === 'en' ? 'Day-by-Day Itinerary' : 'Itinéraire Jour par Jour'}
        items={suggestionsState.itinerary}
        type="itinerary"
      />

      <ActivityIdeasInterests
        destination={destination}
        language={language}
        onAddActivity={(activity) => {
          const lastDay = suggestionsState.itinerary[suggestionsState.itinerary.length - 1]?.day || 1;
          setItineraryActivities(prev => {
            const newActivities = { ...prev };
            const dayActivities = prev[lastDay] || [];
            
            newActivities[lastDay] = [...dayActivities, activity];
            return newActivities;
          });
        }}
      />

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

      <ResultSection
        id="restaurants"
        title={language === 'en' ? 'Restaurants' : 'Restaurants'}
        items={suggestionsState.restaurants}
        type="restaurants"
      />

      <div className="mt-8 mb-8">
        <RestaurantIdeas 
          destination={destination}
          language={language}
          onAddRestaurant={handleAddRestaurant}
        />
      </div>

      {suggestionsState.events.length > 0 && (
        <ResultSection
          id="events"
          title={language === 'en' ? 'Events' : 'Événements'}
          items={suggestionsState.events}
          type="events"
        />
      )}

      <ResultSection
        id="accommodation"
        title={language === 'en' ? 'Where to Stay' : 'Où Séjourner'}
        items={suggestionsState.accommodation}
        type="accommodation"
      />

      <div id="advice" className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 bg-[#FDF0D5] px-4 py-2 rounded-lg">
          {language === 'en' ? 'Practical Advice' : 'Conseils Pratiques'}
        </h2>
        <div className="space-y-6">
          <div className="text-black text-base mt-2">
            {renderTextWithLinks(suggestionsState.practicalAdvice)}
            {savedAnswers.map((answer, index) => (
              <div key={index} className="mt-4 pt-4 border-t">
                {renderTextWithLinks(answer)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {suggestionsState.practicalAdvice && (
        <div className="mt-4">
          <SpecificPracticalAdvice
            destination={destination}
            language={language}
            practicalAdvice={suggestionsState.practicalAdvice}
            onSaveAnswer={(answer) => setSavedAnswers(prev => [...prev, answer])}
          />
        </div>
      )}

      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {language === 'en' ? 'Save Your Trip' : 'Sauvegarder Votre Voyage'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="trip-title" className="text-right">
                {language === 'en' ? 'Title' : 'Titre'}
              </Label>
              <Input
                id="trip-title"
                value={tripTitle}
                onChange={(e) => setTripTitle(e.target.value)}
                placeholder={language === 'en' ? 'My Trip to...' : 'Mon voyage à...'}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsSaveDialogOpen(false)} 
              disabled={isSaving}
            >
              {language === 'en' ? 'Cancel' : 'Annuler'}
            </Button>
            <Button 
              type="submit" 
              onClick={handleSaveTrip}
              disabled={isSaving}
            >
              {isSaving ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{language === 'en' ? 'Saving...' : 'Sauvegarde...'}</span>
                </div>
              ) : (
                <span>{language === 'en' ? 'Save' : 'Sauvegarder'}</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Checkout 
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        language={language}
      />
    </div>
  );
}

export default TravelResults;