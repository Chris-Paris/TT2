import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState<'en' | 'fr'>('en');

  // Detect browser language
  useEffect(() => {
    const detectBrowserLanguage = () => {
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith('fr')) {
        setLanguage('fr');
      } else {
        setLanguage('en');
      }
    };

    detectBrowserLanguage();
  }, []);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the hash fragment from the URL
        const hash = window.location.hash;
        
        if (hash) {
          // Process the callback
          const { error } = await supabase.auth.getSession();
          
          if (error) throw error;
          
          // Redirect to home page after successful authentication
          navigate('/');
        } else {
          // No hash found, redirect to home
          navigate('/');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        // Redirect to home page on error
        navigate('/');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="flex flex-col items-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <h1 className="text-2xl font-bold text-center">
          {language === 'en' 
            ? 'Processing your authentication...' 
            : 'Traitement de votre authentification...'}
        </h1>
      </div>
    </div>
  );
}
