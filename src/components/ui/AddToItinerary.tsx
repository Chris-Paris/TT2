import { useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { useToast } from './use-toast';
import { analytics } from '@/lib/analytics';

interface AddToItineraryProps {
  title: string;
  description: string;
  photoUrl?: string;
  destination: string;
  itineraryDays: number[];
  onAddToItinerary: (dayIndex: number, title: string, description: string, photoUrl?: string) => void;
  language: 'en' | 'fr';
}

export function AddToItinerary({
  title,
  description,
  photoUrl,
  destination,
  itineraryDays,
  onAddToItinerary,
  language
}: AddToItineraryProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  // Sort days in ascending order
  const sortedDays = [...itineraryDays].sort((a, b) => a - b);

  const handleAddToDay = (dayIndex: number) => {
    // Track the "Add to Itinerary" button click in analytics
    analytics.trackAddToItinerary(destination, title);
    
    // Call the parent component's handler
    onAddToItinerary(dayIndex, title, description, photoUrl);
    
    // Close the dropdown
    setIsOpen(false);
    
    // Show a toast notification
    toast({
      title: language === 'fr' ? "Ajouté à l'itinéraire" : "Added to Itinerary",
      description: language === 'fr' 
        ? `Élément ajouté au jour ${dayIndex} de votre itinéraire` 
        : `Item added to day ${dayIndex} of your itinerary`,
    });
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-[14px] sm:text-base w-full sm:w-auto flex items-center justify-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          {language === 'en' ? 'Add to Itinerary' : 'Ajouter à l\'itinéraire'}
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {sortedDays.length > 0 ? (
          sortedDays.map((day) => (
            <DropdownMenuItem
              key={day}
              onClick={() => handleAddToDay(day)}
              className="cursor-pointer"
            >
              {language === 'en' ? `Day ${day}` : `Jour ${day}`}
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem disabled>
            {language === 'en' ? 'No days available' : 'Aucun jour disponible'}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
