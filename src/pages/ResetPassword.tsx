import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/lib/supabase';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const resetPasswordSchema = z.object({
  password: z.string().min(6, {
    message: 'Password must be at least 6 characters',
  }),
  confirmPassword: z.string().min(6, {
    message: 'Password must be at least 6 characters',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const [language, setLanguage] = useState<'en' | 'fr'>('en');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isTokenProcessed, setIsTokenProcessed] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  // Detect browser language and set language state
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

  const handleLanguageChange = (newLanguage: 'en' | 'fr') => {
    setLanguage(newLanguage);
  };

  // Handle the reset token when the component mounts
  useEffect(() => {
    const handleResetToken = async () => {
      try {
        // Check if we're on the reset password page with a token
        if (location.hash && location.hash.includes('type=recovery')) {
          console.log('Recovery hash found:', location.hash);
          
          // The hash contains the auth info - Supabase will handle this automatically
          // We just need to wait for the auth state to update
          setIsTokenProcessed(true);
        } else if (location.search && location.search.includes('code=')) {
          console.log('Recovery code found in query params:', location.search);
          setIsTokenProcessed(true);
        } else {
          setIsError(true);
          setErrorMessage(language === 'en' 
            ? 'Invalid or expired reset link. Please request a new password reset link.' 
            : 'Lien de réinitialisation invalide ou expiré. Veuillez demander un nouveau lien de réinitialisation.');
        }
      } catch (error: any) {
        console.error('Reset token handling error:', error);
        setIsError(true);
        setErrorMessage(error.message || (language === 'en'
          ? 'Failed to process reset link'
          : 'Échec du traitement du lien de réinitialisation'));
      }
    };

    handleResetToken();
  }, [location, language]);

  const handleResetPassword = async (data: ResetPasswordFormValues) => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage('');
    
    try {
      // Update the user's password
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        console.error('Password update error:', error);
        throw error;
      }

      setIsSuccess(true);
      
      toast({
        title: language === 'en' ? 'Password updated!' : 'Mot de passe mis à jour !',
        description: language === 'en'
          ? 'Your password has been successfully updated'
          : 'Votre mot de passe a été mis à jour avec succès',
      });
      
      // Redirect to home page after 3 seconds
      setTimeout(() => {
        navigate('/');
      }, 3000);
      
    } catch (error: any) {
      console.error('Password reset error:', error);
      setIsError(true);
      setErrorMessage(error.message || (language === 'en'
        ? 'Failed to reset password. Please request a new reset link.'
        : 'Échec de la réinitialisation du mot de passe. Veuillez demander un nouveau lien de réinitialisation.'));
      
      toast({
        variant: "destructive",
        title: language === 'en' ? 'Password reset failed' : 'Échec de réinitialisation',
        description: error.message || (language === 'en'
          ? 'Failed to reset password'
          : 'Échec de la réinitialisation du mot de passe'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header language={language} />
      
      <main className="flex-1 container max-w-4xl mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-6">
            {language === 'en' ? 'Reset Your Password' : 'Réinitialiser votre mot de passe'}
          </h1>
          
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                {language === 'en' ? 'Password Updated!' : 'Mot de passe mis à jour !'}
              </h2>
              <p className="text-gray-600 mb-6">
                {language === 'en' 
                  ? 'Your password has been successfully reset. You will be redirected to the home page.'
                  : 'Votre mot de passe a été réinitialisé avec succès. Vous allez être redirigé vers la page d\'accueil.'}
              </p>
              <Button onClick={() => navigate('/')}>
                {language === 'en' ? 'Go to Home Page' : 'Aller à la page d\'accueil'}
              </Button>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <XCircle className="h-16 w-16 text-red-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                {language === 'en' ? 'Password Reset Failed' : 'Échec de la réinitialisation'}
              </h2>
              <p className="text-gray-600 mb-6">
                {errorMessage}
              </p>
              <Button onClick={() => navigate('/')}>
                {language === 'en' ? 'Go to Home Page' : 'Aller à la page d\'accueil'}
              </Button>
            </div>
          ) : isTokenProcessed ? (
            <form onSubmit={form.handleSubmit(handleResetPassword)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">
                  {language === 'en' ? 'New Password' : 'Nouveau mot de passe'}
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={language === 'en' ? 'Enter your new password' : 'Entrez votre nouveau mot de passe'}
                  {...form.register('password')}
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  {language === 'en' ? 'Confirm Password' : 'Confirmer le mot de passe'}
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder={language === 'en' ? 'Confirm your new password' : 'Confirmez votre nouveau mot de passe'}
                  {...form.register('confirmPassword')}
                />
                {form.formState.errors.confirmPassword && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span>{language === 'en' ? 'Resetting...' : 'Réinitialisation...'}</span>
                  </>
                ) : (
                  <span>{language === 'en' ? 'Reset Password' : 'Réinitialiser le mot de passe'}</span>
                )}
              </Button>
            </form>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-gray-600 mb-6">
                {language === 'en' 
                  ? 'Please wait while we process the reset link...'
                  : 'Veuillez patienter pendant que nous traitons le lien de réinitialisation...'}
              </p>
            </div>
          )}
        </div>
      </main>
      
      <Footer language={language} onLanguageChange={handleLanguageChange} />
    </div>
  );
}
