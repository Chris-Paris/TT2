import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getTripByPublicId } from '@/lib/tripService';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import TravelResults from '@/components/TravelResults';
import { TravelSuggestions } from '@/types';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';

export default function SharedTrip() {
  const { publicId } = useParams<{ publicId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<'en' | 'fr'>('en');
  const [tripData, setTripData] = useState<{
    title: string;
    destination: string;
    data: TravelSuggestions;
    language?: 'en' | 'fr';
  } | null>(null);

  useEffect(() => {
    const fetchTrip = async () => {
      if (!publicId) return;

      try {
        const trip = await getTripByPublicId(publicId);
        
        if (!trip) {
          toast({
            variant: "destructive",
            title: "Trip not found",
            description: "The shared trip could not be found or may have been deleted.",
          });
          navigate('/');
          return;
        }

        // Check for language in URL parameters
        const urlParams = new URLSearchParams(location.search);
        const urlLang = urlParams.get('lang') as 'en' | 'fr';
        
        // Determine language: URL param > trip data > default to English
        const tripData = trip.data as unknown as TravelSuggestions;
        const tripLanguage = urlLang && ['en', 'fr'].includes(urlLang) 
          ? urlLang 
          : (tripData?.language || 'en');
        
        setLanguage(tripLanguage);

        setTripData({
          title: trip.trip_title,
          destination: trip.destination,
          data: tripData,
          language: tripLanguage
        });
      } catch (error) {
        console.error('Error fetching trip:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load the trip. Please try again later.",
        });
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchTrip();
  }, [publicId, navigate, toast, location.search]);

  const handleLanguageChange = (newLanguage: 'en' | 'fr') => {
    setLanguage(newLanguage);
    const url = new URL(window.location.href);
    url.searchParams.set('lang', newLanguage);
    window.history.pushState({}, '', url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tripData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Trip Not Found</h1>
          <p className="text-gray-600 mb-6">The trip you're looking for could not be found.</p>
          <Button onClick={() => navigate('/')}>Go to Trip Planner</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <Header language={language} />
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between my-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go to Trip Planner
            </Button>
            <h1 className="text-xl font-bold">Shared Trip: {tripData.title}</h1>
          </div>
        </div>

        {/* Display the travel plan using the TravelResults component */}
        <TravelResults
          suggestions={tripData.data}
          language={tripData.language || 'en'}
          duration={tripData.data.itinerary.length}
          destination={tripData.destination}
          interests={[]} // No interests needed for display
          onReset={() => navigate('/')}
        />
      </div>
      <Footer language={language} onLanguageChange={handleLanguageChange} />
    </div>
  );
}