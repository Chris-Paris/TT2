import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { storeTemporarySession, createOrUpdateSubscription } from '@/lib/subscriptionService';
import { useToast } from '@/components/ui/use-toast';

interface PaymentSuccessProps {
  open: boolean;
  onClose: () => void;
  sessionId: string | null;
  language?: 'en' | 'fr';
}

export function PaymentSuccess({ open, onClose, sessionId, language = 'en' }: PaymentSuccessProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();

  // Ensure focus is properly managed
  const initialFocusRef = useRef<HTMLInputElement>(null);
  
  // Get the session ID from storage if not provided
  useEffect(() => {
    if (!sessionId) {
      const storedSessionId = sessionStorage.getItem('stripeSessionId');
      if (storedSessionId) {
        sessionId = storedSessionId;
      }
    }
  }, [sessionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sessionId) {
      toast({
        title: language === 'fr' ? 'Erreur' : 'Error',
        description: language === 'fr' 
          ? 'ID de session introuvable. Veuillez réessayer.' 
          : 'Session ID not found. Please try again.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);

    try {
      if (isSignUp) {
        // Create a new account
        const { error } = await signUp(email, password);
        
        if (error) {
          toast({
            title: language === 'fr' ? 'Erreur d\'inscription' : 'Sign Up Error',
            description: error.message,
            variant: 'destructive',
          });
        } else {
          // Store the session ID temporarily until the user confirms their email
          await storeTemporarySession(sessionId);
          
          toast({
            title: language === 'fr' ? 'Compte créé avec succès' : 'Account Created Successfully',
            description: language === 'fr' 
              ? 'Veuillez vérifier votre email pour confirmer votre compte.' 
              : 'Please check your email to confirm your account.',
          });
          
          onClose();
        }
      } else {
        // Sign in to existing account
        const { error } = await signIn(email, password);
        
        if (error) {
          toast({
            title: language === 'fr' ? 'Erreur de connexion' : 'Sign In Error',
            description: error.message,
            variant: 'destructive',
          });
        } else {
          // User is now signed in, update their subscription
          if (user) {
            const { error: subscriptionError } = await createOrUpdateSubscription(user.id, sessionId);
            
            if (subscriptionError) {
              toast({
                title: language === 'fr' ? 'Erreur d\'abonnement' : 'Subscription Error',
                description: subscriptionError.message,
                variant: 'destructive',
              });
            } else {
              toast({
                title: language === 'fr' ? 'Abonnement activé' : 'Subscription Activated',
                description: language === 'fr'
                  ? 'Votre abonnement premium a été activé avec succès.'
                  : 'Your premium subscription has been successfully activated.',
              });
              
              onClose();
            }
          }
        }
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
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>
            {language === 'fr' ? 'Paiement réussi!' : 'Payment Successful!'}
          </DialogTitle>
          <DialogDescription>
            {language === 'fr'
              ? 'Pour activer votre abonnement premium, veuillez vous connecter ou créer un compte.'
              : 'To activate your premium subscription, please sign in or create an account.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">
              {language === 'fr' ? 'Email' : 'Email'}
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={language === 'fr' ? 'votre@email.com' : 'your@email.com'}
              ref={initialFocusRef}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">
              {language === 'fr' ? 'Mot de passe' : 'Password'}
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder={language === 'fr' ? 'Votre mot de passe' : 'Your password'}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant="outline"
              className={isSignUp ? '' : 'bg-primary text-primary-foreground'}
              onClick={() => setIsSignUp(false)}
            >
              {language === 'fr' ? 'Se connecter' : 'Sign In'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className={isSignUp ? 'bg-primary text-primary-foreground' : ''}
              onClick={() => setIsSignUp(true)}
            >
              {language === 'fr' ? 'Créer un compte' : 'Create Account'}
            </Button>
          </div>
          
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? (language === 'fr' ? 'Traitement...' : 'Processing...')
                : (isSignUp
                    ? (language === 'fr' ? 'Créer et activer' : 'Create & Activate')
                    : (language === 'fr' ? 'Se connecter et activer' : 'Sign In & Activate')
                  )
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
