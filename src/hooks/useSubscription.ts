import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { hasActiveSubscription, retrieveAndClearTemporarySession, createOrUpdateSubscription } from '@/lib/subscriptionService';

export function useSubscription() {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const checkSubscription = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        if (user) {
          // First check if user already has an active subscription
          const hasSubscription = await hasActiveSubscription(user.id);
          
          if (hasSubscription) {
            setIsSubscribed(true);
          } else {
            // Check if there's a pending session from a payment before signup
            const pendingSessionId = retrieveAndClearTemporarySession();
            
            if (pendingSessionId) {
              // User has just signed up after payment, activate their subscription
              await createOrUpdateSubscription(user.id, pendingSessionId);
              setIsSubscribed(true);
            } else {
              setIsSubscribed(false);
            }
          }
        } else {
          setIsSubscribed(false);
        }
      } catch (err) {
        console.error('Error checking subscription:', err);
        setError(err as Error);
        setIsSubscribed(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSubscription();
  }, [user]);

  return { isSubscribed, isLoading, error };
}
