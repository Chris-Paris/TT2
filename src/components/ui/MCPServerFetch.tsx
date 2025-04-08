import { useState, useEffect } from 'react';
import { Button } from './button';

interface MCPServerFetchProps {
  url?: string;
  onDataFetched?: (data: HotelResult[]) => void;
  searchParams?: any;
  destination?: string;
  duration?: number;
  hidden?: boolean;
  onAddToItinerary?: (dayIndex: number, title: string, description: string, photoUrl?: string) => void;
  language?: 'en' | 'fr';
  itineraryDays?: number[];
  destinationInput?: string;
}

interface HotelResult {
  id: string;
  name: string;
  price: number;
  address: string;
  rating: number;
  amenities: string[];
  photos: string[];
  isAIGenerated: boolean;
  distance?: string;
  url?: string;
}

// Function to parse hotel data from Booking.com HTML
const parseHotelData = async (html: string, searchParams: any): Promise<HotelResult[]> => {
  try {
    console.log('Parsing HTML data, length:', html.length);
    
    if (!html || html.length < 1000) {
      console.error('HTML content is too short or empty:', html.substring(0, 100));
      return [];
    }
    
    // Log a sample of the HTML for debugging
    console.log('HTML sample:', html.substring(0, 500));
    
    // Create a DOM parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Check if we got a proper HTML document
    if (!doc.querySelector('body')) {
      console.error('Failed to parse HTML properly, no body element found');
      return [];
    }
    
    // Find hotel elements using multiple selectors
    const hotelSelectors = [
      '[data-testid="property-card"]',
      '.sr_property_block',
      '.sr_item',
      '.hotel_card',
      '.bui-card',
      '.js-sr-property',
      '.e13098a59f',
      '[data-capla-component-boundary="property-card"]'
    ];
    
    let hotelElements: Element[] = [];
    for (const selector of hotelSelectors) {
      const elements = Array.from(doc.querySelectorAll(selector));
      if (elements.length > 0) {
        hotelElements = elements;
        console.log(`Found ${elements.length} hotel elements with selector: ${selector}`);
        break;
      }
    }
    
    if (hotelElements.length === 0) {
      console.log('No hotel elements found with standard selectors, trying alternative approach');
      
      // Try to find any elements that might contain hotel information
      const possibleHotelContainers = [
        doc.querySelectorAll('div[id^="hotel_"]'),
        doc.querySelectorAll('div[data-hotelid]'),
        doc.querySelectorAll('div.bui-card'),
        doc.querySelectorAll('div.sr_item_content'),
        doc.querySelectorAll('div.sr-hotel__title'),
        doc.querySelectorAll('div[data-testid*="title"]')
      ];
      
      for (const containerList of possibleHotelContainers) {
        if (containerList.length > 0) {
          hotelElements = Array.from(containerList);
          console.log(`Found ${hotelElements.length} possible hotel elements with alternative selector`);
          break;
        }
      }
      
      if (hotelElements.length === 0) {
        console.log('No hotel elements found, returning empty array');
        return [];
      }
    }

    // Extract data from each hotel element
    const extractedHotels = hotelElements.map((element: Element) => {
      // Try multiple selectors for each piece of information
      const nameSelectors = ['.sr-hotel__name', '.fcab3ed991', '.e6e1bcb1d1', '[data-testid="title"]', '.bui-card__title'];
      const ratingSelectors = ['.bui-review-score__badge', '.bui-review-score__badge--blue', '.review-score-badge', '.review-score-badge--blue', '[data-testid="rating-score"]', '[data-testid="review-score"]'];
      const addressSelectors = ['.address', '.address_line', '.sr-hotel__address', '.bui-list__description', '[data-testid="address"]'];
      const photoSelectors = ['.hotel_image', '.hotel-thumbnail', '.hotel-image', '.bui-card__image', '[data-testid="image"]', 'img.b8b0793b0e'];
      const urlSelectors = ['a[data-testid="title-link"]', '.hotel_name_link', '.bui-card__title a', '.sr_item_photo_link'];

      // Helper function to find content using multiple selectors
      const findContent = (selectors: string[]): string | null => {
        for (const selector of selectors) {
          const contentElement = element.querySelector(selector);
          if (contentElement) {
            const text = contentElement.textContent?.trim() || '';
            return text.length > 0 ? text : null;
          }
        }
        return null;
      };

      // Helper function to find URL using multiple selectors
      const findUrl = (selectors: string[]): string | null => {
        for (const selector of selectors) {
          const linkElement = element.querySelector(selector) as HTMLAnchorElement;
          if (linkElement && linkElement.href) {
            return linkElement.href;
          }
        }
        return null;
      };

      // Try to extract image URL
      let imageUrl = null;
      
      // First try to get the src attribute from an img element
      for (const selector of photoSelectors) {
        const imgElement = element.querySelector(selector) as HTMLImageElement;
        if (imgElement && imgElement.src) {
          imageUrl = imgElement.src;
          break;
        }
      }
      
      // If that fails, try to get the background-image from style
      if (!imageUrl) {
        for (const selector of photoSelectors) {
          const divElement = element.querySelector(selector);
          if (divElement) {
            const style = window.getComputedStyle(divElement);
            const backgroundImage = style.backgroundImage;
            if (backgroundImage && backgroundImage !== 'none') {
              // Extract URL from background-image: url("...")
              const urlMatch = backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
              if (urlMatch && urlMatch[1]) {
                imageUrl = urlMatch[1];
                break;
              }
            }
          }
        }
      }
      
      // Additional attempt to find images using more specific selectors
      if (!imageUrl) {
        const additionalSelectors = [
          'img.hotel_image', 
          'img[data-testid="property-card-picture"]',
          '.bh-photo-grid-item img',
          '.bh-photo-grid-thumb-cell img',
          '.sr_rooms_table_photo img'
        ];
        
        for (const selector of additionalSelectors) {
          const imgElement = element.querySelector(selector) as HTMLImageElement;
          if (imgElement && imgElement.src) {
            imageUrl = imgElement.src;
            break;
          }
        }
      }
      
      // Extract hotel URL
      let hotelUrl = findUrl(urlSelectors);
      
      // Try additional URL selectors if the first attempt failed
      if (!hotelUrl) {
        const additionalUrlSelectors = [
          'a.hotel_name_link',
          'a.bui-card__title-link',
          'a.js-sr-hotel-link',
          'a[data-testid="title-link"]',
          'a.e13098a59f',
          '.js-sr-hotel-link'
        ];
        
        for (const selector of additionalUrlSelectors) {
          const linkElement = element.querySelector(selector) as HTMLAnchorElement;
          if (linkElement && linkElement.href) {
            hotelUrl = linkElement.href;
            break;
          }
        }
      }
      
      // Ensure URL is absolute
      if (hotelUrl && !hotelUrl.startsWith('http')) {
        hotelUrl = new URL(hotelUrl, 'https://www.booking.com').href;
      }
      
      // Skip this hotel if no URL found
      if (!hotelUrl) {
        return null;
      }

      // Extract rating
      let rating = 0;
      const ratingText = findContent(ratingSelectors);
      if (ratingText) {
        const ratingMatch = ratingText.match(/\d+(\.\d+)?/);
        if (ratingMatch) {
          // Convert to a scale of 10 if it's on a scale of 5
          const parsedRating = parseFloat(ratingMatch[0]);
          rating = parsedRating > 5 ? parsedRating : parsedRating * 2;
        }
      }
      
      // Skip this hotel if no rating found
      if (rating === 0) {
        return null;
      }

      // Try to extract amenities
      const amenitiesSelectors = [
        '.bui-list__item',
        '.hotel-facilities-group__facility',
        '.hp_desc_important_facilities',
        '.important_facility'
      ];
      
      let amenities: string[] = [];
      for (const selector of amenitiesSelectors) {
        const amenityElements = element.querySelectorAll(selector);
        if (amenityElements && amenityElements.length > 0) {
          amenities = Array.from(amenityElements).map(el => el.textContent?.trim() || '').filter(Boolean);
          break;
        }
      }

      // Get hotel name
      const name = findContent(nameSelectors);
      
      // Skip this hotel if no name found
      if (!name) {
        return null;
      }

      // Get hotel address
      const address = findContent(addressSelectors);
      
      // Skip this hotel if no address found
      if (!address) {
        return null;
      }

      // Try to extract price
      let price = 0;
      const priceSelectors = [
        '.bui-price-display__value', 
        '.prco-valign-middle-helper',
        '.price',
        '[data-testid="price-and-discounted-price"]',
        '.bui-price-display__value',
        '.prco-text-nowrap-helper',
        '.bui-price-display',
        '.prco-inline-block-maker-helper'
      ];
      
      for (const selector of priceSelectors) {
        const priceElement = element.querySelector(selector);
        if (priceElement) {
          const priceText = priceElement.textContent?.trim() || '';
          const priceMatch = priceText.match(/\d+/);
          if (priceMatch) {
            price = parseInt(priceMatch[0], 10);
            break;
          }
        }
      }
      
      // Skip this hotel if no price found
      if (price === 0) {
        return null;
      }

      return {
        id: `hotel-${Math.random().toString(36).substring(2, 9)}`,
        name,
        price,
        address,
        rating,
        amenities,
        photos: imageUrl ? [imageUrl] : [],
        isAIGenerated: false,
        distance: findContent(['.sr_card_address_line .sr_card_address_item:last-child']) || undefined,
        url: hotelUrl
      };
    });

    // Filter out null values (hotels that didn't have complete data)
    const validHotels = extractedHotels.filter(hotel => hotel !== null) as HotelResult[];
    
    console.log(`Found ${validHotels.length} valid hotels with complete data`);
    
    // Filter hotels based on price range if provided in searchParams
    let filteredHotels = validHotels;
    if (searchParams?.priceRange) {
      const { min, max } = searchParams.priceRange;
      filteredHotels = validHotels.filter(hotel => {
        return hotel.price >= min && (max ? hotel.price <= max : true);
      });
      console.log(`Filtered to ${filteredHotels.length} hotels within price range ${min} - ${max || 'unlimited'}`);
    }
    
    return filteredHotels;
  } catch (error) {
    console.error('Error parsing hotel data:', error);
    return [];
  }
};

export function MCPServerFetch({ 
  url, 
  onDataFetched, 
  searchParams, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  destination, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  duration, 
  hidden = false, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onAddToItinerary, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  language, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  itineraryDays, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  destinationInput,
}: MCPServerFetchProps) {
  const [data, setData] = useState<any>(null);
  const [hotelData, setHotelData] = useState<HotelResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!url) {
      setError('URL is required');
      return {
        data: '',
        hotels: []
      };
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Fetching data from URL:', url);
      
      const response = await fetch('/api/fetch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server response error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
      }

      const result = await response.json();
      
      if (result.error) {
        console.error('API returned error:', result.error, result.message || '');
        throw new Error(`API error: ${result.error}, ${result.message || ''}`);
      }
      
      if (!result.data || result.data.length < 1000) {
        console.error('API returned insufficient data:', result.data?.substring(0, 100));
        throw new Error('Insufficient data received from API');
      }
      
      setData(result);

      // Parse hotel data from the HTML
      const hotels = await parseHotelData(result.data || '', searchParams);
      setHotelData(hotels);

      // Call the callback with the parsed data
      if (onDataFetched) {
        onDataFetched(hotels);
      }
      
      return {
        data: result.data,
        hotels
      };
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(`Failed to fetch data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setLoading(false);
      
      // Return empty array on error
      if (onDataFetched) {
        onDataFetched([]);
      }
      
      return {
        data: '',
        hotels: []
      };
    }
  };

  // Only fetch data when url changes
  useEffect(() => {
    if (url) {
      fetchData();
    }
  }, [url]);

  // Handle refresh
  const handleRefetch = () => {
    if (url) {
      fetchData();
    }
  };

  if (hidden) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button 
          onClick={handleRefetch} 
          disabled={loading}
        >
          {loading ? 'Fetching...' : 'Fetch Booking.com Data'}
        </Button>
        
        {error && (
          <div className="text-red-500 text-sm">
            {error}
          </div>
        )}
      </div>
      
      {data && hotelData.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-medium">Hotels Found: {hotelData.length}</h3>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hotelData.map((hotel) => (
              <div key={hotel.id} className="border rounded-md p-4 shadow-sm">
                <h4 className="font-medium">{hotel.name}</h4>
                <p className="text-gray-600 text-sm">{hotel.address}</p>
                <div className="flex justify-between mt-2">
                  <span className="text-sm">Rating: {typeof hotel.rating === 'number' ? hotel.rating.toFixed(1) : hotel.rating}</span>
                  <span className="font-medium">€{hotel.price}</span>
                </div>
                <p className="text-gray-600 text-sm mt-2">URL: <a href={hotel.url} target="_blank" rel="noopener noreferrer">{hotel.url}</a></p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {data && hotelData.length === 0 && (
        <div className="mt-4">
          <Button onClick={handleRefetch}>Refresh Data</Button>
        </div>
      )}
    </div>
  );
}