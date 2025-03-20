import { TravelSuggestions } from '@/types';
import { useEffect, useState, useRef } from 'react';

interface NavigationBarProps {
  language: 'en' | 'fr';
  suggestions: TravelSuggestions;
}

export function NavigationBar({ language, suggestions }: NavigationBarProps) {
  const [activeSection, setActiveSection] = useState<string>('itinerary');
  const navContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll<HTMLElement>('section[id]');
      const scrollPosition = window.scrollY + 100; // Add offset for the sticky header

      // Find all sections that are currently in view
      const visibleSections = Array.from(sections).filter(section => {
        const sectionTop = section.offsetTop;
        const sectionBottom = sectionTop + section.offsetHeight;
        return scrollPosition >= sectionTop && scrollPosition <= sectionBottom;
      });

      // If we found visible sections, use the first one
      if (visibleSections.length > 0) {
        setActiveSection(visibleSections[0].id);
      }
      // If we're at the very top, use the first section
      else if (scrollPosition <= sections[0]?.offsetTop) {
        setActiveSection(sections[0]?.id);
      }
      // If we're at the bottom, use the last section
      else if (scrollPosition >= sections[sections.length - 1]?.offsetTop) {
        setActiveSection(sections[sections.length - 1]?.id);
      }
    };

    // Run once on mount to set initial active section
    handleScroll();
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Add effect to handle scrolling of navigation when active section changes
  useEffect(() => {
    if (!navContainerRef.current) return;
    
    const activeButton = navContainerRef.current.querySelector(`[href="#${activeSection}"]`);
    if (!activeButton) return;

    const container = navContainerRef.current;
    const buttonRect = activeButton.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    // Calculate the scroll position to center the button
    const scrollLeft = buttonRect.left - containerRect.left - (containerRect.width / 2) + (buttonRect.width / 2);
    
    container.scrollTo({
      left: container.scrollLeft + scrollLeft,
      behavior: 'smooth'
    });
  }, [activeSection]);

  const getButtonClass = (sectionId: string) => {
    const baseClass = "px-4 py-2 rounded-lg text-sm font-medium transition-colors border-2 ";
    const activeClass = `border-[#003049] bg-[#669BBC] text-white`;
    const inactiveClass = `border-[#003049] bg-white text-[#003049] hover:bg-[#669BBC] hover:text-white`;
    
    return baseClass + (activeSection === sectionId ? activeClass : inactiveClass);
  };

  return (
    <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-2 sticky top-0 bg-white z-50 shadow-sm py-2 no-scrollbar md:custom-scrollbar" ref={navContainerRef}>
      <div className="flex gap-4 min-w-max">
        <a
          href="#itinerary"
          className={getButtonClass('itinerary')}
        >
          {language === 'en' ? 'Day-by-Day Itinerary' : 'Itinéraire Jour par Jour'}
        </a>
        <a
          href="#attractions"
          className={getButtonClass('attractions')}
        >
          {language === 'en' ? 'Must-See Attractions' : 'Attractions Incontournables'}
        </a>
        <a
          href="#gems"
          className={getButtonClass('gems')}
        >
          {language === 'en' ? 'Hidden Gems' : 'Trésors Cachés'}
        </a>
        <a
          href="#restaurants"
          className={getButtonClass('restaurants')}
        >
          {language === 'en' ? 'Restaurants' : 'Restaurants'}
        </a>
        {suggestions.events.length > 0 && (
          <a
            href="#events"
            className={getButtonClass('events')}
          >
            {language === 'en' ? 'Events' : 'Événements'}
          </a>
        )}
        <a
          href="#accommodation"
          className={getButtonClass('accommodation')}
        >
          {language === 'en' ? 'Where to Stay' : 'Où Séjourner'}
        </a>
        <a
          href="#advice"
          className={getButtonClass('advice')}
        >
          {language === 'en' ? 'Practical Advice' : 'Conseils Pratiques'}
        </a>
      </div>
    </div>
  );
}