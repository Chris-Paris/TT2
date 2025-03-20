import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function StripeRedirectHandler() {
  const navigate = useNavigate();

  // Listen for the return from Stripe checkout
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const sessionId = queryParams.get('session_id');
    
    if (sessionId) {
      // Redirect to the success page with the session_id
      navigate(`/success?session_id=${sessionId}`);
      
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [navigate]);

  return null;
}
