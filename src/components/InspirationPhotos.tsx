import { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface InspirationPhotosProps {
  isVisible: boolean;
  language: 'en' | 'fr';
  fullWidth?: boolean;
  backgroundMode?: boolean;
}

// Use the specific video URL
const SPECIFIC_VIDEO_URL = 'https://videos.pexels.com/video-files/8333654/8333654-hd_2048_1080_25fps.mp4';

export function InspirationPhotos({ isVisible, language, fullWidth = false, backgroundMode = false }: InspirationPhotosProps) {
  // We'll keep isLoading state for future use if needed
  const [isLoading] = useState(false);

  if (!isVisible) return null;

  return (
    <div className={`${backgroundMode ? 'absolute top-0 left-0 w-full h-full z-0 pointer-events-none overflow-hidden p-0 m-0' : 'mb-4 relative'}`}>
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">
              {language === 'en' ? 'Loading inspiration...' : 'Chargement de l\'inspiration...'}
            </span>
          </div>
        </div>
      ) : (
        <div className={backgroundMode ? 'w-full h-full p-0 m-0' : 'overflow-x-auto pb-4 no-scrollbar'}>
          {backgroundMode ? (
            <div className="w-full h-full p-0 m-0">
              <video
                src={SPECIFIC_VIDEO_URL}
                className="w-full h-full object-cover"
                autoPlay
                muted
                loop
                playsInline
              />
            </div>
          ) : (
            <>
              <div className={`flex ${fullWidth ? 'w-full' : ''}`}>
                <div className={`${fullWidth ? 'w-full' : 'w-64'} h-48 rounded-lg shadow-md flex-shrink-0 overflow-hidden`}>
                  <video
                    src={SPECIFIC_VIDEO_URL}
                    className="w-full h-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                </div>
              </div>
              <div className="mt-2 text-center">
                <a
                  href="https://www.pexels.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {language === 'en' ? 'What will be your next travel?        Inspiration by Pexels' : 'Quel sera votre prochain voyage ?        Inspiration by Pexels'}
                </a>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}