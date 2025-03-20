import { useState, useEffect } from 'react';
import { getUserTrips } from '@/lib/tripService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink, Copy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trip } from '@/types/supabase';

interface TripsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'en' | 'fr';
}

export function TripsModal({ isOpen, onClose, language }: TripsModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !user) return;

    const fetchTrips = async () => {
      setLoading(true);
      try {
        const userTrips = await getUserTrips(user.id);
        setTrips(userTrips);
      } catch (error) {
        console.error('Error fetching trips:', error);
        toast({
          variant: "destructive",
          title: language === 'en' ? "Error" : "Erreur",
          description: language === 'en' 
            ? "Failed to load your trips. Please try again." 
            : "Échec du chargement de vos voyages. Veuillez réessayer.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTrips();
  }, [isOpen, user, toast, language]);

  const copyUrlToClipboard = (tripId: string) => {
    const shareUrl = `${window.location.origin}/trip/${tripId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast({
        title: language === 'en' ? "URL copied!" : "URL copiée !",
        description: language === 'en' 
          ? "Public URL has been copied to clipboard" 
          : "L'URL publique a été copiée dans le presse-papiers",
      });
    }).catch(err => {
      console.error('Failed to copy:', err);
      toast({
        variant: "destructive",
        title: language === 'en' ? "Error" : "Erreur",
        description: language === 'en'
          ? "Failed to copy URL to clipboard"
          : "Impossible de copier l'URL dans le presse-papiers",
      });
    });
  };

  const openTripInNewTab = (tripId: string) => {
    window.open(`/trip/${tripId}`, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="sm:max-w-md"
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          onClose();
        }}
        onInteractOutside={(e) => {
          e.preventDefault();
          onClose();
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {language === 'en' ? 'My Saved Trips' : 'Mes Voyages Enregistrés'}
          </DialogTitle>
          <DialogDescription>
            {language === 'en' 
              ? 'View and share your saved travel plans' 
              : 'Consultez et partagez vos plans de voyage enregistrés'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : trips.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-muted-foreground mb-4">
              {language === 'en' 
                ? 'You haven\'t saved any trips yet.' 
                : 'Vous n\'avez pas encore enregistré de voyages.'}
            </p>
            <Button onClick={onClose}>
              {language === 'en' ? 'Close' : 'Fermer'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            {trips.map((trip) => (
              <div key={trip.id} className="p-4 rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col space-y-2">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium">{trip.trip_title}</h3>
                    <span className="text-xs text-muted-foreground">
                      {new Date(trip.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{trip.destination}</p>
                  <div className="flex justify-between items-center mt-4">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyUrlToClipboard(trip.public_url_id)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        {language === 'en' ? 'Copy URL' : 'Copier l\'URL'}
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => openTripInNewTab(trip.public_url_id)}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {language === 'en' ? 'Open' : 'Ouvrir'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}