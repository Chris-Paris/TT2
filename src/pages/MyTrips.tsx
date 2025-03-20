import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserTrips, deleteTrip } from '@/lib/tripService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, Globe, ArrowLeft } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Trip } from '@/types/supabase';
import { TravelSuggestions } from '@/types';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';

export default function MyTrips() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // Add language state for UI
  const [language, setLanguage] = useState<'en' | 'fr'>(() => {
    // Check URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang') as 'en' | 'fr';
    if (urlLang && ['en', 'fr'].includes(urlLang)) {
      return urlLang;
    }
    
    // Check browser language
    const browserLang = navigator.language.split('-')[0];
    if (browserLang === 'fr') {
      return 'fr';
    }
    
    // Default to English
    return 'en';
  });

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const fetchTrips = async () => {
      setLoading(true);
      try {
        const userTrips = await getUserTrips(user.id);
        setTrips(userTrips);
      } catch (error) {
        console.error('Error fetching trips:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load your trips. Please try again later.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTrips();
  }, [user, navigate, toast]);

  const loadTrip = (trip: Trip) => {
    // Navigate to home with trip data
    navigate('/', { 
      state: { 
        tripData: trip.data,
        tripTitle: trip.trip_title,
        destination: trip.destination
      } 
    });
  };

  const shareTrip = async (trip: Trip) => {
    // Copy the share URL to clipboard
    const shareUrl = `${window.location.origin}/trip/${trip.public_url_id}`;
    await navigator.clipboard.writeText(shareUrl);
    
    toast({
      title: "Link copied!",
      description: "Share link has been copied to your clipboard",
    });
  };

  const confirmDelete = (trip: Trip) => {
    setTripToDelete(trip);
  };

  const handleDeleteTrip = async () => {
    if (!tripToDelete || !user) return;
    
    setIsDeleting(true);
    try {
      await deleteTrip(tripToDelete.id);
      
      // Remove from local state
      setTrips(prev => prev.filter(t => t.id !== tripToDelete.id));
      
      toast({
        title: "Trip deleted",
        description: "Your trip has been successfully deleted",
      });
    } catch (error) {
      console.error('Error deleting trip:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete trip. Please try again later.",
      });
    } finally {
      setIsDeleting(false);
      setTripToDelete(null);
    }
  };

  const handleLanguageChange = (newLanguage: 'en' | 'fr') => {
    setLanguage(newLanguage);
    const url = new URL(window.location.href);
    url.searchParams.set('lang', newLanguage);
    window.history.pushState({}, '', url);
  };

  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <Header language={language} onLanguageChange={handleLanguageChange} />
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/')}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Trip Planner
          </Button>
          <h1 className="text-2xl font-bold">My Saved Trips</h1>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">You don't have any saved trips yet.</p>
            <Button onClick={() => navigate('/')}>Create a Trip</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {trips.map(trip => (
              <Card key={trip.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{trip.trip_title}</CardTitle>
                  <CardDescription>{trip.destination}</CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {((trip.data as unknown as TravelSuggestions)?.practicalAdvice?.substring(0, 120) || 'No description')}...
                  </p>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => shareTrip(trip)}
                    >
                      <Globe className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => confirmDelete(trip)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => loadTrip(trip)}
                  >
                    View
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={!!tripToDelete} onOpenChange={(open) => !open && setTripToDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Trip</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this trip? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setTripToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteTrip}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Footer language={language} onLanguageChange={handleLanguageChange} />
    </div>
  );
}