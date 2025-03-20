import { FaLinkedin, FaRegCommentDots } from 'react-icons/fa';

interface FooterProps {
  language: 'en' | 'fr';
  onLanguageChange: (lang: 'en' | 'fr') => void;
}

export function Footer({ language, onLanguageChange }: FooterProps) {
  return (
    <footer className="bg-white border-t mt-6">
      <div className="container max-w-4xl mx-auto px-3 py-4">
        <div className="flex flex-col items-center gap-4">
          <a
            href="https://tally.so/r/3xRPEJ"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-[#780000] rounded-md"
          >
            <FaRegCommentDots className="w-4 h-4" />
            {language === 'en' ? 'Tell us what you need!' : 'Dites-nous ce qui vous manque !'}
          </a>
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 w-full">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {new Date().getFullYear()} {' '}
                <span className="flex items-center gap-2">
                  <a 
                    href="https://ai-lab.services/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#780000] transition-colors"
                  >
                    AI LAB Services
                  </a>
                  •
                  <a
                    href="https://holistic-stoplight-1ba.notion.site/Mentions-l-gales-Legal-Notice-9a1b2b238dba4ab9811aa53fb5447662"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#780000] transition-colors"
                  >
                    {language === 'en' ? 'Legal Notice' : 'Mentions légales'}
                  </a>
                </span>
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const newLang = language === 'en' ? 'fr' : 'en';
                  onLanguageChange(newLang);
                  const url = new URL(window.location.href);
                  url.searchParams.set('lang', newLang);
                  window.history.pushState({}, '', url);
                }}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium border rounded-full hover:bg-gray-50 transition-colors"
              >
                <span className={`${language === 'en' ? 'text-gray-400' : 'text-gray-900'}`}>FR</span>
                <span className="text-gray-300">/</span>
                <span className={`${language === 'fr' ? 'text-gray-400' : 'text-gray-900'}`}>ENG</span>
              </button>
              
              <a
                href="https://www.linkedin.com/company/ai-lab-services"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-[#780000] transition-colors"
                aria-label="LinkedIn"
              >
                <FaLinkedin size={20} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}