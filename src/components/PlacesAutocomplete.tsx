import { useEffect, useRef, useState } from 'react';
import { UseFormRegister, UseFormSetValue } from 'react-hook-form';
import { FormValues } from './TravelForm';
import { analytics } from '@/lib/analytics';

interface Address {
  city?: string;
  town?: string;
  village?: string;
  country?: string;
}

interface NominatimResult {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  address?: Address;
}

interface PlacesAutocompleteProps {
  register: UseFormRegister<FormValues>;
  setValue: UseFormSetValue<FormValues>;
  language: 'en' | 'fr';
  onFocus?: () => void;
  onBlur?: () => void;
}

export function PlacesAutocomplete({
  register,
  setValue,
  language,
  onFocus,
  onBlur,
}: PlacesAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceTimeout = useRef<NodeJS.Timeout>();
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const searchPlaces = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          query
        )}&format=json&limit=5`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }
      const data: NominatimResult[] = await response.json();
      
      // Process the results to show only city/town and country
      const processedData = data.map(result => ({
        ...result,
        display_name: formatLocationName(result)
      }));
      
      setSuggestions(processedData);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    }
  };

  const formatLocationName = (result: NominatimResult): string => {
    if (!result.address) return result.display_name;
    
    const place = result.address.city || result.address.town || result.address.village;
    const country = result.address.country;
    
    if (place && country) {
      return `${place}, ${country}`;
    }
    
    return result.display_name;
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (inputRef.current) {
      inputRef.current.value = value;
    }
    setValue('destination', value);
    setShowSuggestions(true);

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      searchPlaces(value);
    }, 300);
  };

  const handleSuggestionClick = (suggestion: NominatimResult) => {
    analytics.trackDestinationInput(suggestion.display_name);
    if (inputRef.current) {
      inputRef.current.value = suggestion.display_name;
    }
    setValue('destination', suggestion.display_name);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!suggestions.length) return;

    const updateInputValue = (value: string) => {
      setValue('destination', value);
      if (inputRef.current) {
        inputRef.current.value = value;
      }
    };

    let newIndex = selectedIndex;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        newIndex = selectedIndex < suggestions.length - 1 ? selectedIndex + 1 : selectedIndex;
        setSelectedIndex(newIndex);
        // Update input value with selected suggestion
        if (newIndex >= 0) {
          updateInputValue(suggestions[newIndex].display_name);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        newIndex = selectedIndex > 0 ? selectedIndex - 1 : -1;
        setSelectedIndex(newIndex);
        // Update input value with selected suggestion or restore original input
        if (newIndex >= 0) {
          updateInputValue(suggestions[newIndex].display_name);
        } else if (inputRef.current) {
          updateInputValue(inputRef.current.value);
        }
        break;
      case 'Enter':
        event.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionClick(suggestions[selectedIndex]);
          setShowSuggestions(false);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        // Restore original input value
        if (inputRef.current) {
          updateInputValue(inputRef.current.value);
        }
        break;
    }
  };

  // Reset selection when suggestions change
  useEffect(() => {
    setSelectedIndex(-1);
    // Clear any highlighted suggestion value
    if (inputRef.current) {
      const value = inputRef.current.value;
      setValue('destination', value);
      inputRef.current.value = value;
    }
  }, [suggestions]);

  // Close suggestions on blur after a short delay
  const handleBlur = () => {
    // First update the input value if there's a selected suggestion
    if (selectedIndex >= 0 && suggestions[selectedIndex]) {
      const value = suggestions[selectedIndex].display_name;
      if (inputRef.current) {
        inputRef.current.value = value;
      }
      setValue('destination', value);
    }

    // Then close suggestions and call onBlur after a delay
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedIndex(-1);
      onBlur?.();
    }, 200);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <div className="relative flex items-center">
        <input
        type="text"
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        {...register('destination')}
        onChange={handleInputChange}
        onFocus={() => {
          setShowSuggestions(true);
          onFocus?.();
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={language === 'fr' ? 'Entrez une ville ou une destination' : 'Enter a city or destination'}
        autoComplete="off"
        role="combobox"
        ref={(e) => {
          inputRef.current = e;
          const { ref } = register('destination');
          if (typeof ref === 'function') {
            ref(e);
          }
        }}
      />
      {/* Loader SVG removed */}
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <ul 
          className="absolute z-10 w-full bg-white border rounded-md mt-1 shadow-lg max-h-60 overflow-auto" 
          role="listbox"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.place_id}
              className={`px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm ${
                index === selectedIndex ? 'bg-gray-100' : ''
              }`}
              onClick={() => handleSuggestionClick(suggestion)}
              role="option"
              aria-selected={index === selectedIndex}
              >
              {suggestion.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}