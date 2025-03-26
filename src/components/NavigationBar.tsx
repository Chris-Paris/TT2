import { TravelSuggestions } from '@/types';
import { useEffect, useState, useRef, useCallback } from 'react';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';

interface NavigationBarProps {
  language: 'en' | 'fr';
  suggestions: TravelSuggestions;
  startDate?: Date;
}

export function NavigationBar({ language, suggestions, startDate }: NavigationBarProps) {
  const [activeSection, setActiveSection] = useState<string>('day-1');
  const [isVisible, setIsVisible] = useState(true);
  const navContainerRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);

  // Improved scroll detection with throttling
  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    
    // Show/hide based on scroll direction with a threshold
    if (currentScrollY > 100) { // Only apply hide when scrolled down a bit
      if (currentScrollY > lastScrollY.current + 10) {
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY.current - 10) {
        setIsVisible(true);
      }
    } else {
      setIsVisible(true); // Always show at top of page
    }
    
    lastScrollY.current = currentScrollY;
    
    // Look for day sections only
    const sections = document.querySelectorAll<HTMLElement>('[id^="day-"]');
    if (sections.length === 0) return;
    
    const scrollPosition = window.scrollY + 100; // Add offset for the sticky header
    
    // Find the section that's currently in view
    let currentSection = '';
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      
      // If we're above the first section, use it
      if (i === 0 && scrollPosition < sectionTop) {
        currentSection = section.id;
        break;
      }
      
      // If we're within this section's bounds
      if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
        currentSection = section.id;
        break;
      }
      
      // If this is the last section and we're below it
      if (i === sections.length - 1 && scrollPosition >= sectionTop) {
        currentSection = section.id;
      }
    }
    
    if (currentSection && currentSection !== activeSection) {
      setActiveSection(currentSection);
    }
  }, [activeSection]);

  useEffect(() => {
    // Add throttled scroll event listener
    let scrollTimer: number | null = null;
    
    const throttledScroll = () => {
      if (scrollTimer === null) {
        scrollTimer = window.setTimeout(() => {
          handleScroll();
          scrollTimer = null;
        }, 100);
      }
    };
    
    // Run once on mount to set initial active section
    handleScroll();
    
    window.addEventListener('scroll', throttledScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', throttledScroll);
      if (scrollTimer) window.clearTimeout(scrollTimer);
    };
  }, [handleScroll]);

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

  // Handle smooth scrolling when clicking day links
  const handleDayClick = (e: React.MouseEvent<HTMLAnchorElement>, dayId: string) => {
    e.preventDefault();
    const element = document.getElementById(dayId);
    if (element) {
      // Set active immediately for better UX
      setActiveSection(dayId);
      
      // Smooth scroll to the element with offset for the sticky header
      const yOffset = -80; // Adjust based on your header height
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      
      window.scrollTo({
        top: y,
        behavior: 'smooth'
      });
    }
  };

  // Generate day buttons for the itinerary
  const renderDayButtons = () => {
    if (!suggestions.itinerary || !Array.isArray(suggestions.itinerary) || suggestions.itinerary.length === 0) {
      return null;
    }

    // Add individual day buttons
    const dayButtons = suggestions.itinerary.map((day) => {
      const dayId = `day-${day.day}`;
      const dayLabel = startDate 
        ? format(addDays(startDate, day.day - 1), 'd MMM', { locale: language === 'fr' ? fr : undefined })
        : language === 'en' ? `Day ${day.day}` : `Jour ${day.day}`;
      
      return (
        <a
          key={dayId}
          href={`#${dayId}`}
          className={getButtonClass(dayId)}
          onClick={(e) => handleDayClick(e, dayId)}
        >
          {dayLabel}
        </a>
      );
    });

    return dayButtons;
  };

  return (
    <div 
      className={`overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0 pb-2 sticky top-0 bg-white z-50 shadow-sm py-2 no-scrollbar lg:custom-scrollbar transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`} 
      ref={navContainerRef}
    >
      <div className="flex gap-4 min-w-max">
        {renderDayButtons()}
      </div>
    </div>
  );
}