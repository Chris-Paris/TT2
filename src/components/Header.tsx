import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Login } from '@/components/auth/Login';
import { TripsModal } from '@/components/TripsModal';
import { Checkout } from '@/components/ui/Checkout';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut } from 'lucide-react';

interface HeaderProps {
  language: 'en' | 'fr';
  onLanguageChange: (lang: 'en' | 'fr') => void;
}

export function Header({ language }: HeaderProps) {
  const { user, signOut } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isTripsModalOpen, setIsTripsModalOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [userInitials, setUserInitials] = useState('');

  useEffect(() => {
    if (user?.email) {
      // Generate user initials from email
      const email = user.email;
      const name = email.split('@')[0];
      const initials = name.substring(0, 2).toUpperCase();
      setUserInitials(initials);
    } else {
      setUserInitials('');
    }
  }, [user]);

  const handleTripsClick = () => {
    if (user) {
      // If user is logged in, show trips modal
      setIsTripsModalOpen(true);
    } else {
      // If user is not logged in, show checkout modal
      setIsCheckoutOpen(true);
    }
  };

  return (
    <header className="border-b bg-white mb-3">
      <div className="container max-w-4xl mx-auto px-3 h-10 flex items-center justify-between">
        <div className="flex items-center">
          <svg className="h-8 w-8 text-[#d99a08] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <h1 className="text-lg font-bold text-[#d99a08]">TravellingTrip</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTripsClick}
            className="font-medium"
          >
            {language === 'en' ? 'My Trips' : 'Mes Voyages'}
          </Button>
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-[#d99a08] text-white">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-sm font-medium leading-none">{user.email}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {language === 'en' ? 'My Account' : 'Mon Compte'}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-red-600 focus:text-red-600"
                  onClick={() => signOut()}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{language === 'en' ? 'Log out' : 'Déconnexion'}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLoginOpen(true)}
              className="font-medium"
            >
              {language === 'en' ? 'Login' : 'Connexion'}
            </Button>
          )}
          
          <Login 
            isOpen={isLoginOpen} 
            onClose={() => setIsLoginOpen(false)} 
            language={language}
          />
          
          <TripsModal
            isOpen={isTripsModalOpen}
            onClose={() => setIsTripsModalOpen(false)}
            language={language}
          />

          <Checkout
            isOpen={isCheckoutOpen}
            onClose={() => setIsCheckoutOpen(false)}
            language={language}
          />
        </div>
      </div>
    </header>
  );
}