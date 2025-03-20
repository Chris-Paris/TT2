import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { generateTravelPlan } from '@/lib/openai';
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import type { TravelSuggestions } from '@/types';
import { TravelForm, type FormValues } from '@/components/TravelForm';
import TravelResults from '@/components/TravelResults';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { analytics } from '@/lib/analytics';
import { updateMetaTags } from '@/lib/metaUpdater';
import { AuthProvider } from './contexts/AuthContext';
import { StripeRedirectHandler } from './components/StripeRedirectHandler';
import MyTrips from './pages/MyTrips';
import SharedTrip from './pages/SharedTrip';
import Success from './pages/Success';
import ResetPassword from './pages/ResetPassword';
import AuthCallback from './pages/AuthCallback';

function Home() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<'en' | 'fr'>(() => {
    // First check URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang') as 'en' | 'fr';
    if (urlLang && ['en', 'fr'].includes(urlLang)) {
      return urlLang;
    }
    
    // Then check browser language
    const browserLang = navigator.language.split('-')[0];
    if (browserLang === 'fr') {
      // Update URL to match detected language
      const url = new URL(window.location.href);
      url.searchParams.set('lang', 'fr');
      window.history.replaceState({}, '', url);
      return 'fr';
    }
    
    // Default to English
    return 'en';
  });
  const [suggestions, setSuggestions] = useState<TravelSuggestions | null>(null);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [formData, setFormData] = useState<FormValues | null>(null);

  useEffect(() => {
    analytics.trackPageView('Home');
  }, []);

  useEffect(() => {
    setIsGoogleMapsLoaded(true);
  }, []);

  useEffect(() => {
    updateMetaTags(language);
  }, [language]);

  useEffect(() => {
    const handleUrlChange = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const newLang = urlParams.get('lang') as 'en' | 'fr';
      if (newLang && (newLang === 'en' || newLang === 'fr')) {
        setLanguage(newLang);
        analytics.trackLanguageChange(newLang);
      }
    };

    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  const handleLanguageChange = (newLanguage: 'en' | 'fr') => {
    setLanguage(newLanguage);
    analytics.trackLanguageChange(newLanguage);
  };

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    setSuggestions(null);
    setFormData(data);
    
    try {
      const result = await generateTravelPlan({
        destination: data.destination,
        date: data.date,
        duration: data.duration,
        interests: data.interests,
        language: language
      });

      setSuggestions(result);
      analytics.trackTravelPlanGenerated(data.destination, data.duration, data.interests);
    } catch (error) {
      console.error('Error:', error);
      toast({
        variant: "destructive",
        title: language === 'en' ? 'Error' : 'Erreur',
        description: language === 'en' 
          ? `Failed to generate travel plan: ${error instanceof Error ? error.message : 'Unknown error'}` 
          : `Échec de la génération du plan de voyage: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSuggestions(null);
    setFormData(null);
    analytics.trackReset();
  };

  if (!isGoogleMapsLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">
            {language === 'en' ? 'Loading...' : 'Chargement...'}
          </h1>
          <p className="text-gray-600">
            {language === 'en' 
              ? 'Please wait while we load the necessary resources.' 
              : 'Veuillez patienter pendant le chargement des ressources nécessaires.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <Header language={language} onLanguageChange={handleLanguageChange} />
      <main className="container max-w-4xl mx-auto px-4 py-0">
        {suggestions ? (
          <TravelResults
            suggestions={suggestions}
            language={language}
            duration={formData!.duration}
            destination={formData!.destination}
            interests={formData!.interests}
            onReset={handleReset}
          />
        ) : (
          <TravelForm
            onSubmit={onSubmit}
            isLoading={isLoading}
            language={language}
            onReset={handleReset}
            hasResults={!!suggestions}
          />
        )}
      </main>
      <Footer language={language} onLanguageChange={handleLanguageChange} />
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <StripeRedirectHandler />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/my-trips" element={<MyTrips />} />
          <Route path="/trip/:publicId" element={<SharedTrip />} />
          <Route path="/success" element={<Success />} />
          <Route path="/auth/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;