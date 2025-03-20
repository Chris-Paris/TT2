import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ArrowLeft, X } from 'lucide-react';

interface LoginProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'en' | 'fr';
}

const loginSchema = z.object({
  email: z.string().email({
    message: 'Please enter a valid email address',
  }),
  password: z.string().min(6, {
    message: 'Password must be at least 6 characters',
  }),
});

const forgotPasswordSchema = z.object({
  email: z.string().email({
    message: 'Please enter a valid email address',
  }),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export function Login({ isOpen, onClose, language }: LoginProps) {
  const { toast } = useToast();
  const { signIn, signUp, resetPassword } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const forgotPasswordForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const handleLogin = async (data: LoginFormValues) => {
    setIsLoading(true);
    
    try {
      const { error } = await signIn(data.email, data.password);
      
      if (error) throw error;
      
      toast({
        title: language === 'en' ? 'Success!' : 'Succès !',
        description: language === 'en' 
          ? 'You are now logged in' 
          : 'Vous êtes maintenant connecté',
      });
      
      onClose();
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        variant: "destructive",
        title: language === 'en' ? 'Login failed' : 'Échec de connexion',
        description: error.message || (language === 'en' 
          ? 'Invalid email or password' 
          : 'Email ou mot de passe invalide'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (data: LoginFormValues) => {
    setIsLoading(true);
    
    try {
      const { error } = await signUp(data.email, data.password);
      
      if (error) throw error;
      
      toast({
        title: language === 'en' ? 'Account created!' : 'Compte créé !',
        description: language === 'en'
          ? 'Your account has been created successfully'
          : 'Votre compte a été créé avec succès',
      });
      
      // Automatically switch to login tab
      setActiveTab('login');
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        variant: "destructive",
        title: language === 'en' ? 'Registration failed' : 'Échec d\'inscription',
        description: error.message || (language === 'en'
          ? 'Failed to create account' 
          : 'Impossible de créer le compte'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (data: ForgotPasswordFormValues) => {
    setIsLoading(true);
    
    try {
      const { error } = await resetPassword(data.email);
      
      if (error) throw error;
      
      toast({
        title: language === 'en' ? 'Password reset email sent!' : 'Email de réinitialisation envoyé !',
        description: language === 'en'
          ? 'Check your email for a password reset link'
          : 'Vérifiez votre email pour un lien de réinitialisation du mot de passe',
      });
      
      // Go back to login
      setShowForgotPassword(false);
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        variant: "destructive",
        title: language === 'en' ? 'Password reset failed' : 'Échec de réinitialisation',
        description: error.message || (language === 'en'
          ? 'Failed to send password reset email' 
          : 'Impossible d\'envoyer l\'email de réinitialisation'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (data: LoginFormValues) => {
    if (activeTab === 'login') {
      handleLogin(data);
    } else {
      handleRegister(data);
    }
  };

  if (showForgotPassword) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) onClose();
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <DialogHeader>
            <DialogTitle>
              {language === 'en' ? 'Reset Password' : 'Réinitialiser le mot de passe'}
            </DialogTitle>
            <DialogDescription>
              {language === 'en' 
                ? 'Enter your email address and we\'ll send you a link to reset your password'
                : 'Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPassword)} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">
                {language === 'en' ? 'Email' : 'Email'}
              </Label>
              <Input
                id="reset-email"
                type="email"
                placeholder={language === 'en' ? 'Enter your email' : 'Entrez votre email'}
                {...forgotPasswordForm.register('email')}
              />
              {forgotPasswordForm.formState.errors.email && (
                <p className="text-sm text-red-500">
                  {language === 'en' 
                    ? forgotPasswordForm.formState.errors.email.message 
                    : 'Veuillez entrer un email valide'}
                </p>
              )}
            </div>
            
            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-2 mt-4"
              onClick={() => setShowForgotPassword(false)}
            >
              <ArrowLeft className="h-4 w-4" />
              {language === 'en' ? 'Back to login' : 'Retour à la connexion'}
            </Button>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>
                    {language === 'en' ? 'Sending...' : 'Envoi en cours...'}
                  </span>
                </div>
              ) : (
                <span>
                  {language === 'en' ? 'Send Reset Link' : 'Envoyer le lien de réinitialisation'}
                </span>
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogClose>
        <DialogHeader>
          <DialogTitle>
            {language === 'en' ? 'Welcome to TravellingTrip' : 'Bienvenue sur TravellingTrip'}
          </DialogTitle>
          <DialogDescription>
            {language === 'en' 
              ? 'Sign in or create an account to save your trips'
              : 'Connectez-vous ou créez un compte pour sauvegarder vos voyages'}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs 
          defaultValue="login" 
          value={activeTab} 
          onValueChange={(value) => setActiveTab(value as 'login' | 'register')}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">
              {language === 'en' ? 'Login' : 'Connexion'}
            </TabsTrigger>
            <TabsTrigger value="register">
              {language === 'en' ? 'Register' : 'Inscription'}
            </TabsTrigger>
          </TabsList>
          
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <TabsContent value="login" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="email">
                  {language === 'en' ? 'Email' : 'Email'}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={language === 'en' ? 'Enter your email' : 'Entrez votre email'}
                  {...form.register('email')}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-red-500">
                    {language === 'en' 
                      ? form.formState.errors.email.message 
                      : 'Veuillez entrer un email valide'}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">
                    {language === 'en' ? 'Password' : 'Mot de passe'}
                  </Label>
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-xs text-primary"
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                  >
                    {language === 'en' ? 'Forgot password?' : 'Mot de passe oublié ?'}
                  </Button>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder={language === 'en' ? 'Enter your password' : 'Entrez votre mot de passe'}
                  {...form.register('password')}
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-red-500">
                    {language === 'en'
                      ? form.formState.errors.password.message
                      : 'Le mot de passe doit contenir au moins 6 caractères'}
                  </p>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="register" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="email">
                  {language === 'en' ? 'Email' : 'Email'}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={language === 'en' ? 'Enter your email' : 'Entrez votre email'}
                  {...form.register('email')}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-red-500">
                    {language === 'en'
                      ? form.formState.errors.email.message
                      : 'Veuillez entrer un email valide'}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">
                  {language === 'en' ? 'Password' : 'Mot de passe'}
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={language === 'en' ? 'Create a password' : 'Créez un mot de passe'}
                  {...form.register('password')}
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-red-500">
                    {language === 'en'
                      ? form.formState.errors.password.message
                      : 'Le mot de passe doit contenir au moins 6 caractères'}
                  </p>
                )}
              </div>
            </TabsContent>
            
            <DialogFooter className="mt-6">
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>
                      {language === 'en' ? 'Please wait...' : 'Veuillez patienter...'}
                    </span>
                  </div>
                ) : (
                  <span>
                    {activeTab === 'login'
                      ? (language === 'en' ? 'Sign In' : 'Se connecter')
                      : (language === 'en' ? 'Create Account' : 'Créer un compte')}
                  </span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
