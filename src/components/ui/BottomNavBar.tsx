import React from 'react';
import { Button } from './button';
import { Share2, Map, X, Save, Printer } from 'lucide-react';

interface BottomNavBarProps {
  language: 'en' | 'fr';
  isMapExpanded: boolean;
  onShareClick: () => void;
  onMapToggle: () => void;
  onReset: () => void;
  onSaveTrip?: () => void;
  onPrintClick?: () => void;
  isLoggedIn: boolean;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  language,
  isMapExpanded,
  onShareClick,
  onMapToggle,
  onReset,
  onSaveTrip,
  onPrintClick,
  isLoggedIn
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 z-50">
      <div className="flex justify-around items-center max-w-lg mx-auto lg:max-w-7xl">
        <Button
          onClick={onShareClick}
          variant="ghost"
          size="sm"
          className="flex flex-col items-center justify-center gap-1"
        >
          <Share2 className="h-5 w-5" />
          <span className="text-xs">{language === 'fr' ? 'Partager' : 'Share'}</span>
        </Button>
        
        <Button
          onClick={onMapToggle}
          variant="ghost"
          size="sm"
          className="flex flex-col items-center justify-center gap-1"
        >
          <Map className="h-5 w-5" />
          <span className="text-xs">
            {isMapExpanded 
              ? (language === 'en' ? 'Map' : 'Carte')
              : (language === 'en' ? 'Show Map' : 'Carte')
            }
          </span>
        </Button>
        
        {onPrintClick && (
          <Button
            onClick={onPrintClick}
            variant="ghost"
            size="sm"
            className="flex flex-col items-center justify-center gap-1"
          >
            <Printer className="h-5 w-5" />
            <span className="text-xs">{language === 'fr' ? 'Imprimer' : 'Print'}</span>
          </Button>
        )}
        
        {isLoggedIn && onSaveTrip && (
          <Button
            onClick={onSaveTrip}
            variant="ghost"
            size="sm"
            className="flex flex-col items-center justify-center gap-1"
          >
            <Save className="h-5 w-5" />
            <span className="text-xs">{language === 'fr' ? 'Sauvegarder' : 'Save'}</span>
          </Button>
        )}
        
        <Button
          onClick={onReset}
          variant="ghost"
          size="sm"
          className="flex flex-col items-center justify-center gap-1"
        >
          <X className="h-5 w-5" />
          <span className="text-xs">{language === 'fr' ? 'Recommencer' : 'Reset'}</span>
        </Button>
      </div>
    </div>
  );
};
