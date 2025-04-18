import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createCheckoutSession } from '@/lib/stripeService';
import { useToast } from '@/components/ui/use-toast';
import { analytics } from '@/lib/analytics';

interface CheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  language?: 'en' | 'fr';
}

export function Checkout({ isOpen, onClose, language = 'en' }: CheckoutProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Track when the checkout modal is opened
  useEffect(() => {
    if (isOpen) {
      analytics.trackCheckoutModalOpened(user?.id);
    }
  }, [isOpen, user?.id]);

  const handleCheckoutClick = async () => {
    setIsLoading(true);
    
    // Track the checkout button click
    analytics.trackCheckoutButtonClicked(user?.id);
    
    try {
      // Define the success and cancel URLs
      const successUrl = `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = window.location.href;
      
      // Create a checkout session
      const { success, data, error } = await createCheckoutSession({
        // Use the specific product ID
        priceId: import.meta.env.VITE_STRIPE_PRICE_ID || 'price_1R1kmT04MIC9pcQ6NNQKDzrp', // Connect to the production product prod_Rvc0NeVEQXxTGS
        successUrl,
        cancelUrl,
        customerEmail: user?.email || '',
        metadata: {
          userId: user?.id || '',
        },
      });
      
      if (success && data?.url) {
        // Open the Stripe checkout page in a new tab
        window.open(data.url, '_blank');
      } else {
        toast({
          title: language === 'fr' ? 'Erreur de paiement' : 'Payment Error',
          description: error?.message || (language === 'fr' ? 'Impossible de créer la session de paiement' : 'Unable to create payment session'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: language === 'fr' ? 'Erreur' : 'Error',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) onClose();
      }}>
        <DialogContent className="sm:max-w-md">
          <div className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4 cursor-pointer" onClick={onClose} />
            <span className="sr-only">Close</span>
          </div>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>
                {language === 'fr' ? 'Fonctionnalités Premium' : 'Premium Features'}
              </DialogTitle>
              <div className="bg-yellow-400 text-black text-xs font-medium px-2 py-1 rounded">
                9,95€/an
              </div>
            </div>
            <DialogDescription>
              {language === 'fr'
                ? 'Pour accéder à ces fonctionnalités, vous devez passer à la version premium.'
                : 'To access these features, you need to upgrade to the premium version.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="font-medium">
                {language === 'fr' ? 'Fonctionnalités incluses:' : 'Features included:'}
              </h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  {language === 'fr'
                    ? 'Partagez votre voyage avec vos proches en 1 clic'
                    : 'Share your trip and allow others to collaborate'}
                </li>
                <li>
                  {language === 'fr'
                    ? 'Générez un guide PDF à emporter partout'
                    : 'Generate a PDF guide to take with you'}
                </li>
                <li>
                  {language === 'fr'
                    ? 'Planifiez autant de voyage que vous le souhaitez'
                    : 'Plan as many trips as you want'}
                </li>
                <li>
                  {language === 'fr'
                    ? 'Enregistrez vos planifications pour les comparer'
                    : 'Save your plans to compare them'}
                </li>
              </ul>
            </div>
            <div className="mt-6 space-y-4">
              <div className="text-center">
                <p className="font-semibold text-lg text-primary">
                  {language === 'fr' 
                    ? 'Accès illimité premium pendant 1 an pour 9,95 €' 
                    : 'Unlimited premium access for 1 year for €9.95'}
                </p>
              </div>
              <div className="bg-muted/50 p-4 rounded-md italic text-center">
                <p>
                  {language === 'fr'
                    ? '"Travellingtrip ... c\'est comme avoir toujours sur soi un petit guide de voyage"'
                    : '"Travellingtrip ... it\'s like always having a small travel guide with you"'}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="mt-2 sm:mt-0"
            >
              <X className="h-4 w-4 mr-2" />
              {language === 'fr' ? 'Fermer' : 'Close'}
            </Button>
            <Button 
              type="button"
              onClick={handleCheckoutClick}
              disabled={isLoading}
            >
              {isLoading 
                ? (language === 'fr' ? 'Chargement...' : 'Loading...') 
                : (language === 'fr' ? 'Passer à Premium' : 'Upgrade to Premium')}
            </Button>
          </DialogFooter>
          <div className="mt-4 text-center text-xs text-muted-foreground flex items-center justify-center">
            <svg className="h-4 w-4 mr-1" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <path d="M32 16.008c0 8.818-7.175 15.992-15.992 15.992S.016 24.826.016 16.008 7.191.016 16.008.016 32 7.191 32 16.008z" fill="#6772e5"/>
              <path d="M13.229 10.858c0-.65.539-1.177 1.188-1.177.66 0 1.198.527 1.198 1.177 0 .651-.538 1.178-1.198 1.178-.65 0-1.188-.527-1.188-1.178zm-1.68 7.392c0-.355.287-.639.639-.639.355 0 .639.284.639.639 0 .352-.284.639-.639.639-.352 0-.639-.287-.639-.639zm1.948-3.378c0-.397.322-.718.718-.718.397 0 .718.321.718.718 0 .394-.321.718-.718.718-.396 0-.718-.324-.718-.718zm-3.32 0c0-.397.322-.718.718-.718.397 0 .718.321.718.718 0 .394-.321.718-.718.718-.396 0-.718-.324-.718-.718zm8.291-2.252c0-.285.231-.516.516-.516.288 0 .516.231.516.516 0 .288-.228.516-.516.516-.285 0-.516-.228-.516-.516zm-1.68 5.63c0-.428.347-.778.778-.778.428 0 .778.35.778.778 0 .428-.35.775-.778.775-.431 0-.778-.347-.778-.775zm3.359-2.252c0-.355.287-.639.639-.639.355 0 .639.284.639.639 0 .352-.284.639-.639.639-.352 0-.639-.287-.639-.639zm-1.948-3.378c0-.397.322-.718.718-.718.397 0 .718.321.718.718 0 .394-.321.718-.718.718-.396 0-.718-.324-.718-.718zm3.32 0c0-.397.322-.718.718-.718.397 0 .718.321.718.718 0 .394-.321.718-.718.718-.396 0-.718-.324-.718-.718zm1.68 3.378c0-.355.287-.639.639-.639.355 0 .639.284.639.639 0 .352-.284.639-.639.639-.352 0-.639-.287-.639-.639zm-1.68-7.392c0-.65.539-1.177 1.188-1.177.66 0 1.198.527 1.198 1.177 0 .651-.538 1.178-1.198 1.178-.65 0-1.188-.527-1.188-1.178z" fill="#fff"/>
            </svg>
            {language === 'fr' ? 'Paiement sécurisé par Stripe' : 'Payment secured by Stripe'}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default Checkout;
