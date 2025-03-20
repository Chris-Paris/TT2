import React, { useState } from 'react';
import { Button } from './button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Printer, Loader2, AlertCircle } from 'lucide-react';
import html2canvas from 'html2canvas';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { useToast } from './use-toast';

// Use type assertion to avoid TypeScript errors with the VFS
// This is necessary because the type definitions don't match the actual runtime structure
(pdfMake as any).vfs = pdfFonts as any;

interface PrintToPDFProps {
  contentRef: React.RefObject<HTMLElement>;
  language: 'en' | 'fr';
  destination: string;
}

export const PrintToPDF: React.FC<PrintToPDFProps> = ({ contentRef, language, destination }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const generatePDF = async () => {
    if (!contentRef.current || isGenerating) return;
    
    setError(null);
    setProgress(0);
    setSuccess(false);
    try {
      setIsGenerating(true);
      console.log('Starting PDF generation');

      // First, ensure all images are loaded to avoid rendering issues
      const allImages = contentRef.current.querySelectorAll('img');
      await Promise.all(Array.from(allImages).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve; // Continue even if image fails to load
        });
      }));
      
      // Define consistent colors and styles
      const colors = {
        primary: '#d99a08',
        secondary: '#003049',
        accent: '#669BBC',
        background: '#FDF0D5',
        text: '#333333',
        lightGray: '#f8f8f8'
      };
      
      // Create a custom cover page with title and featured image
      const coverPage = document.createElement('div');
      coverPage.style.width = '800px';
      coverPage.style.height = '1100px';
      coverPage.style.position = 'relative';
      coverPage.style.backgroundColor = 'white';
      
      // Add a decorative header band
      const headerBand = document.createElement('div');
      headerBand.style.width = '100%';
      headerBand.style.height = '120px';
      headerBand.style.backgroundColor = colors.primary;
      headerBand.style.position = 'absolute';
      headerBand.style.top = '0';
      headerBand.style.left = '0';
      coverPage.appendChild(headerBand);
      
      // Add a decorative side band
      const sideBand = document.createElement('div');
      sideBand.style.width = '120px';
      sideBand.style.height = '100%';
      sideBand.style.backgroundColor = colors.accent;
      sideBand.style.position = 'absolute';
      sideBand.style.left = '0';
      sideBand.style.top = '0';
      sideBand.style.opacity = '0.7';
      coverPage.appendChild(sideBand);
      
      // Add destination title
      const titleContainer = document.createElement('div');
      titleContainer.style.position = 'absolute';
      titleContainer.style.top = '180px';
      titleContainer.style.left = '150px';
      titleContainer.style.right = '50px';
      
      const title = document.createElement('h1');
      title.style.fontSize = '42px';
      title.style.fontWeight = 'bold';
      title.style.color = colors.primary;
      title.style.marginBottom = '15px';
      title.textContent = language === 'fr' ? `Voyage à ${destination}` : `Trip to ${destination}`;
      titleContainer.appendChild(title);
      
      const subtitle = document.createElement('h2');
      subtitle.style.fontSize = '24px';
      subtitle.style.fontWeight = 'normal';
      subtitle.style.color = colors.secondary;
      subtitle.style.marginBottom = '30px';
      subtitle.textContent = language === 'fr' 
        ? 'Votre guide de voyage personnalisé' 
        : 'Your Personalized Travel Guide';
      titleContainer.appendChild(subtitle);
      
      coverPage.appendChild(titleContainer);
      
      // Add travel icon
      const iconContainer = document.createElement('div');
      iconContainer.style.position = 'absolute';
      iconContainer.style.top = '320px';
      iconContainer.style.right = '100px';
      iconContainer.style.width = '150px';
      iconContainer.style.height = '150px';
      iconContainer.style.borderRadius = '50%';
      iconContainer.style.backgroundColor = colors.background;
      iconContainer.style.display = 'flex';
      iconContainer.style.alignItems = 'center';
      iconContainer.style.justifyContent = 'center';
      
      // Use an SVG plane icon
      iconContainer.innerHTML = `
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="${colors.primary}" 
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
        </svg>
      `;
      coverPage.appendChild(iconContainer);
      
      // Add destination photos if available
      const photos = Array.from(contentRef.current.querySelectorAll('img.object-cover.rounded-lg')).slice(0, 3);
      if (photos.length > 0) {
        const photoGrid = document.createElement('div');
        photoGrid.style.position = 'absolute';
        photoGrid.style.top = '450px';
        photoGrid.style.left = '150px';
        photoGrid.style.right = '50px';
        photoGrid.style.display = 'flex';
        photoGrid.style.flexWrap = 'wrap';
        photoGrid.style.gap = '15px';
        photoGrid.style.justifyContent = 'center';
        
        photos.forEach((photo, index) => {
          const photoContainer = document.createElement('div');
          photoContainer.style.width = '220px';
          photoContainer.style.height = '150px';
          photoContainer.style.position = 'relative';
          photoContainer.style.overflow = 'hidden';
          photoContainer.style.borderRadius = '8px';
          photoContainer.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
          photoContainer.style.transform = `rotate(${index % 2 === 0 ? '-3' : '3'}deg)`;
          
          const imgClone = photo.cloneNode(true) as HTMLImageElement;
          imgClone.style.width = '100%';
          imgClone.style.height = '100%';
          imgClone.style.objectFit = 'cover';
          photoContainer.appendChild(imgClone);
          
          photoGrid.appendChild(photoContainer);
        });
        
        coverPage.appendChild(photoGrid);
      }
      
      // Add footer with date and logo
      const footer = document.createElement('div');
      footer.style.position = 'absolute';
      footer.style.bottom = '40px';
      footer.style.left = '150px';
      footer.style.right = '50px';
      footer.style.borderTop = `2px solid ${colors.accent}`;
      footer.style.paddingTop = '20px';
      footer.style.display = 'flex';
      footer.style.justifyContent = 'space-between';
      footer.style.alignItems = 'center';
      
      const dateInfo = document.createElement('div');
      dateInfo.style.fontSize = '14px';
      dateInfo.style.color = colors.secondary;
      dateInfo.textContent = `${language === 'fr' ? 'Créé le' : 'Created on'} ${new Date().toLocaleDateString()}`;
      footer.appendChild(dateInfo);
      
      const logo = document.createElement('div');
      logo.style.fontSize = '20px';
      logo.style.fontWeight = 'bold';
      logo.style.color = colors.primary;
      logo.style.display = 'flex';
      logo.style.alignItems = 'center';
      logo.innerHTML = `
        <svg class="h-8 w-8 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        TravellingTrip
      `;
      footer.appendChild(logo);
      
      coverPage.appendChild(footer);
      
      // Helper function to clean up a section for PDF
      const cleanSectionForPDF = (sectionClone: HTMLElement) => {
        // Remove buttons that aren't date indicators
        const buttons = sectionClone.querySelectorAll('button');
        buttons.forEach(button => {
          // Preserve date buttons that show the day
          const buttonText = button.textContent || '';
          const isDateButton = buttonText.match(/\d{1,2}\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)/i) !== null ||
                              buttonText.match(/\d{1,2}\/\d{1,2}\/\d{4}/) !== null;
          
          if (!isDateButton && !buttonText.includes('Itinéraire intelligent')) {
            button.remove();
          } else {
            // For date buttons, make them stand out
            (button as HTMLElement).style.fontWeight = 'bold';
            (button as HTMLElement).style.fontSize = '18px';
            (button as HTMLElement).style.color = colors.secondary;
            (button as HTMLElement).style.border = 'none';
            (button as HTMLElement).style.background = 'none';
            (button as HTMLElement).style.padding = '0';
            (button as HTMLElement).style.cursor = 'auto';
          }
        });
        
        // Remove action links (See on Map, More Info, Book)
        const actionLinks = Array.from(sectionClone.querySelectorAll('a')).filter(link => {
          const text = link.textContent || '';
          return text.includes('Map') || text.includes('carte') ||
                 text.includes('More Info') || text.includes('Plus d\'infos') ||
                 text.includes('Book') || text.includes('Réserver') ||
                 text.includes('Airbnb') || text.includes('Booking.com') || text.includes('Trip.com') ||
                 text.includes('TikTok');
        });
        
        actionLinks.forEach(link => {
          if (link.parentElement) {
            if (link.parentElement.childNodes.length === 1) {
              link.parentElement.remove();
            } else {
              link.remove();
            }
          }
        });
        
        // Remove buttons for adding to itinerary, TikTok, etc.
        const removeButtons = Array.from(sectionClone.querySelectorAll('button')).filter(button => {
          const text = button.textContent?.trim() || '';
          return text.includes('Add to Itinerary') || 
                 text.includes('Ajouter à l\'itinéraire') ||
                 text.includes('TikTok') ||
                 text.includes('See more suggestions') ||
                 text.includes('Voir plus de suggestions') ||
                 text.includes('Smart Itinerary') ||
                 text.includes('Itinéraire intelligent');
        });
        
        removeButtons.forEach(button => {
          if (button.parentElement) {
            button.parentElement.removeChild(button);
          }
        });
        
        // Remove interaction icons
        const icons = sectionClone.querySelectorAll('.opacity-0, .group-hover\\:opacity-100, svg, .cursor-move');
        icons.forEach(icon => icon.remove());
        
        // Remove tags
        const tags = sectionClone.querySelectorAll('.px-1\\.5.py-0\\.5.text-xs.rounded-full, .flex.flex-wrap.gap-2');
        tags.forEach(tag => tag.remove());
        
        // Enhance headers
        const headers = sectionClone.querySelectorAll('h2, h3');
        headers.forEach(header => {
          if (header.classList.contains('section-header') || header.textContent?.includes('Day') || header.textContent?.includes('Jour')) {
            (header as HTMLElement).style.fontSize = '24px';
            (header as HTMLElement).style.fontWeight = 'bold';
            (header as HTMLElement).style.color = colors.primary;
            (header as HTMLElement).style.marginBottom = '15px';
            (header as HTMLElement).style.borderBottom = `2px solid ${colors.accent}`;
            (header as HTMLElement).style.paddingBottom = '8px';
          }
        });
        
        // Enhance location titles
        const locationTitles = sectionClone.querySelectorAll('.font-semibold');
        locationTitles.forEach(title => {
          title.classList.add('location-title');
          (title as HTMLElement).style.fontSize = '18px';
          (title as HTMLElement).style.color = colors.secondary;
          (title as HTMLElement).style.marginTop = '15px';
          (title as HTMLElement).style.marginBottom = '5px';
        });
        
        // Force section to update layout after modifications
        sectionClone.style.display = 'none';
        sectionClone.offsetHeight; // Force reflow
        sectionClone.style.display = 'block';
      };
      
      // Create a table of contents page
      const tocPage = document.createElement('div');
      tocPage.style.width = '800px';
      tocPage.style.backgroundColor = 'white';
      tocPage.style.padding = '40px';
      
      const tocTitle = document.createElement('h1');
      tocTitle.style.fontSize = '30px';
      tocTitle.style.fontWeight = 'bold';
      tocTitle.style.color = colors.primary;
      tocTitle.style.marginBottom = '25px';
      tocTitle.style.paddingBottom = '10px';
      tocTitle.style.borderBottom = `2px solid ${colors.accent}`;
      tocTitle.textContent = language === 'fr' ? 'Table des Matières' : 'Table of Contents';
      tocPage.appendChild(tocTitle);
      
      // Find the relevant sections from the page - except itinerary section which we'll handle separately
      const findContentSections = () => {
        // Collection to hold all sections
        const sections: HTMLElement[] = [];
        
        // Get all sections with IDs - but exclude itinerary section which will be handled separately
        const idSections = contentRef.current ? Array.from(contentRef.current.querySelectorAll('section[id]')).filter(
          section => section.id !== 'itinerary'
        ) : [];

        idSections.forEach(section => {
          sections.push(section as HTMLElement);
        });
        
        return sections;
      };

      // Get day-by-day itinerary separately
      const getItineraryDays = () => {
        const itineraryDays: HTMLElement[] = [];
        const itinerarySection = contentRef.current ? contentRef.current.querySelector('#itinerary') : null;
        
        if (itinerarySection) {
          const dayDivs = Array.from(itinerarySection.querySelectorAll('.border-b.pb-6'));
          
          if (dayDivs.length > 0) {
            // Add individual day divs as separate sections
            dayDivs.forEach(day => {
              const dayClone = day.cloneNode(true) as HTMLElement;
              
              // Find day number or date
              const dayTitle = day.querySelector('.font-medium')?.textContent || 
                              day.querySelector('button')?.textContent || 
                              'Day';
              
              // Create a proper heading
              const heading = document.createElement('h2');
              heading.className = 'section-header';
              heading.textContent = dayTitle;
              dayClone.insertBefore(heading, dayClone.firstChild);
              
              itineraryDays.push(dayClone);
            });
          }
        }
        
        return itineraryDays;
      };
      
      // Get content sections (excluding itinerary)
      const contentSections = findContentSections();
      
      // Get itinerary days
      const itineraryDays = getItineraryDays();
      
      // Create TOC entries
      const tocList = document.createElement('ul');
      tocList.style.listStyleType = 'none';
      tocList.style.padding = '0';
      
      // Add an entry for the day-by-day itinerary section
      if (itineraryDays.length > 0) {
        const tocItem = document.createElement('li');
        tocItem.style.margin = '12px 0';
        tocItem.style.padding = '10px 15px';
        tocItem.style.borderLeft = `4px solid ${colors.accent}`;
        tocItem.style.backgroundColor = colors.lightGray;
        
        const tocItemContent = document.createElement('div');
        tocItemContent.style.display = 'flex';
        tocItemContent.style.justifyContent = 'space-between';
        tocItemContent.style.alignItems = 'center';
        
        const tocItemTitle = document.createElement('span');
        tocItemTitle.style.fontSize = '18px';
        tocItemTitle.style.fontWeight = 'bold';
        tocItemTitle.style.color = colors.secondary;
        tocItemTitle.textContent = `1. ${language === 'fr' ? 'Itinéraire Jour par Jour' : 'Day-by-Day Itinerary'}`;
        tocItemContent.appendChild(tocItemTitle);
        
        const tocItemPage = document.createElement('span');
        tocItemPage.style.fontSize = '14px';
        tocItemPage.style.color = colors.primary;
        tocItemPage.textContent = `Page 3`; // Cover + TOC + first content page
        tocItemContent.appendChild(tocItemPage);
        
        tocItem.appendChild(tocItemContent);
        tocList.appendChild(tocItem);
      }
      
      // Add other sections to TOC
      contentSections.forEach((section, index) => {
        const sectionId = section.id;
        const sectionTitle = section.querySelector('h2')?.textContent || sectionId;
        
        const tocItem = document.createElement('li');
        tocItem.style.margin = '12px 0';
        tocItem.style.padding = '10px 15px';
        tocItem.style.borderLeft = `4px solid ${colors.accent}`;
        tocItem.style.backgroundColor = index % 2 === 0 ? colors.lightGray : 'white';
        
        const tocItemContent = document.createElement('div');
        tocItemContent.style.display = 'flex';
        tocItemContent.style.justifyContent = 'space-between';
        tocItemContent.style.alignItems = 'center';
        
        const tocItemTitle = document.createElement('span');
        tocItemTitle.style.fontSize = '18px';
        tocItemTitle.style.fontWeight = 'bold';
        tocItemTitle.style.color = colors.secondary;
        tocItemTitle.textContent = `${index + 2}. ${sectionTitle}`; // +2 because we have itinerary as #1
        tocItemContent.appendChild(tocItemTitle);
        
        const tocItemPage = document.createElement('span');
        tocItemPage.style.fontSize = '14px';
        tocItemPage.style.color = colors.primary;
        // Page number calculation: Cover + TOC + itinerary section (multiple pages) + previous sections
        const pageNum = 3 + itineraryDays.length + index;
        tocItemPage.textContent = `Page ${pageNum}`;
        tocItemContent.appendChild(tocItemPage);
        
        tocItem.appendChild(tocItemContent);
        tocList.appendChild(tocItem);
      });
      
      tocPage.appendChild(tocList);
      
      // Add a note about the trip
      const tocNote = document.createElement('div');
      tocNote.style.marginTop = '40px';
      tocNote.style.padding = '20px';
      tocNote.style.backgroundColor = colors.background;
      tocNote.style.borderRadius = '8px';
      tocNote.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
      
      const tocNoteTitle = document.createElement('h3');
      tocNoteTitle.style.fontSize = '18px';
      tocNoteTitle.style.fontWeight = 'bold';
      tocNoteTitle.style.color = colors.primary;
      tocNoteTitle.style.marginBottom = '10px';
      tocNoteTitle.textContent = language === 'fr' ? 'À propos de ce guide' : 'About this guide';
      tocNote.appendChild(tocNoteTitle);
      
      const tocNoteText = document.createElement('p');
      tocNoteText.style.fontSize = '14px';
      tocNoteText.style.lineHeight = '1.5';
      tocNoteText.style.color = colors.text;
      tocNoteText.textContent = language === 'fr' 
        ? `Ce guide de voyage pour ${destination} a été généré par TravellingTrip pour vous aider à planifier votre voyage parfait. Il comprend des attractions, des itinéraires jour par jour, des recommandations de restaurants et des conseils pratiques. Utilisez-le comme référence pendant votre séjour !` 
        : `This travel guide for ${destination} was generated by TravellingTrip to help you plan your perfect trip. It includes attractions, day-by-day itineraries, restaurant recommendations, and practical advice. Use it as your reference during your stay!`;
      tocNote.appendChild(tocNoteText);
      
      tocPage.appendChild(tocNote);
      
      // Generate the PDF content array
      const pdfContent: any[] = [];
      
      // First, render the cover page
      document.body.appendChild(coverPage);
      try {
        const coverCanvas = await html2canvas(coverPage, {
          scale: 2,
          useCORS: true,
          logging: false,
          allowTaint: true,
          backgroundColor: 'white'
        });
        
        pdfContent.push({
          image: coverCanvas.toDataURL('image/png', 1.0),
          width: 515, // A4 width minus margins
          pageBreak: '' // No page break for first page
        });
      } finally {
        document.body.removeChild(coverPage);
      }
      
      // Next, render the TOC page
      document.body.appendChild(tocPage);
      try {
        const tocCanvas = await html2canvas(tocPage, {
          scale: 2,
          useCORS: true,
          logging: false,
          allowTaint: true,
          backgroundColor: 'white'
        });
        
        pdfContent.push({
          image: tocCanvas.toDataURL('image/png', 1.0),
          width: 515,
          pageBreak: 'before'
        });
      } finally {
        document.body.removeChild(tocPage);
      }
      
      // Create an itinerary section header
      const itineraryHeader = document.createElement('div');
      itineraryHeader.style.width = '800px';
      itineraryHeader.style.padding = '40px 40px 20px 40px';
      itineraryHeader.style.backgroundColor = 'white';
      
      const itineraryTitle = document.createElement('h1');
      itineraryTitle.style.fontSize = '32px';
      itineraryTitle.style.fontWeight = 'bold';
      itineraryTitle.style.color = colors.primary;
      itineraryTitle.style.marginBottom = '15px';
      itineraryTitle.style.paddingBottom = '10px';
      itineraryTitle.style.borderBottom = `2px solid ${colors.accent}`;
      itineraryTitle.textContent = language === 'fr' ? 'Itinéraire Jour par Jour' : 'Day-by-Day Itinerary';
      itineraryHeader.appendChild(itineraryTitle);
      
      const itineraryDescription = document.createElement('p');
      itineraryDescription.style.fontSize = '16px';
      itineraryDescription.style.color = colors.text;
      itineraryDescription.style.marginBottom = '20px';
      itineraryDescription.textContent = language === 'fr'
        ? `Voici votre itinéraire détaillé pour profiter au maximum de votre séjour à ${destination}.`
        : `Here's your detailed itinerary to make the most of your stay in ${destination}.`;
      itineraryHeader.appendChild(itineraryDescription);
      
      // Render the itinerary section header
      document.body.appendChild(itineraryHeader);
      try {
        const headerCanvas = await html2canvas(itineraryHeader, {
          scale: 2,
          useCORS: true,
          logging: false,
          allowTaint: true,
          backgroundColor: 'white'
        });
        
        pdfContent.push({
          image: headerCanvas.toDataURL('image/png', 1.0),
          width: 515,
          pageBreak: 'before'
        });
      } finally {
        document.body.removeChild(itineraryHeader);
      }
      
      // Render the itinerary days
      for (let i = 0; i < itineraryDays.length; i++) {
        const daySection = itineraryDays[i];
        setProgress(Math.round(((i + 1) / (itineraryDays.length + contentSections.length)) * 100));
        
        // Clone and style the section
        const sectionClone = daySection.cloneNode(true) as HTMLElement;
        sectionClone.style.width = '800px';
        sectionClone.style.padding = '40px';
        sectionClone.style.backgroundColor = 'white';
        sectionClone.style.position = 'relative';
        
        // Add day number and decorative element
        const dayIndex = document.createElement('div');
        dayIndex.style.position = 'absolute';
        dayIndex.style.top = '20px';
        dayIndex.style.right = '20px';
        dayIndex.style.width = '40px';
        dayIndex.style.height = '40px';
        dayIndex.style.borderRadius = '50%';
        dayIndex.style.backgroundColor = colors.primary;
        dayIndex.style.color = 'white';
        dayIndex.style.display = 'flex';
        dayIndex.style.alignItems = 'center';
        dayIndex.style.justifyContent = 'center';
        dayIndex.style.fontWeight = 'bold';
        dayIndex.textContent = `${i + 1}`;
        sectionClone.appendChild(dayIndex);
        
        // Clean up the section for PDF
        cleanSectionForPDF(sectionClone);
        
        // Add a decorative top border
        const topBorder = document.createElement('div');
        topBorder.style.position = 'absolute';
        topBorder.style.top = '0';
        topBorder.style.left = '0';
        topBorder.style.right = '0';
        topBorder.style.height = '10px';
        topBorder.style.backgroundColor = i % 2 === 0 ? colors.primary : colors.accent;
        sectionClone.appendChild(topBorder);
        
        // Force section to update layout after modifications
        document.body.appendChild(sectionClone);
        
        try {
          const canvas = await html2canvas(sectionClone, {
            scale: 2,
            useCORS: true,
            logging: false,
            allowTaint: true,
            backgroundColor: 'white'
          });
          
          pdfContent.push({
            image: canvas.toDataURL('image/png', 1.0),
            width: 515,
            pageBreak: 'before'
          });
        } finally {
          document.body.removeChild(sectionClone);
        }
      }
      
      // Process remaining content sections
      for (let i = 0; i < contentSections.length; i++) {
        const section = contentSections[i];
        setProgress(Math.round(((itineraryDays.length + i + 1) / (itineraryDays.length + contentSections.length)) * 100));
        
        // Skip empty sections
        if (!section.textContent?.trim()) continue;
        
        // Clone and style the section
        const sectionClone = section.cloneNode(true) as HTMLElement;
        sectionClone.style.width = '800px';
        sectionClone.style.padding = '40px';
        sectionClone.style.backgroundColor = 'white';
        sectionClone.style.position = 'relative';
        
        // Add section number and decorative element
        const sectionIndex = document.createElement('div');
        sectionIndex.style.position = 'absolute';
        sectionIndex.style.top = '20px';
        sectionIndex.style.right = '20px';
        sectionIndex.style.width = '40px';
        sectionIndex.style.height = '40px';
        sectionIndex.style.borderRadius = '50%';
        sectionIndex.style.backgroundColor = colors.primary;
        sectionIndex.style.color = 'white';
        sectionIndex.style.display = 'flex';
        sectionIndex.style.alignItems = 'center';
        sectionIndex.style.justifyContent = 'center';
        sectionIndex.style.fontWeight = 'bold';
        sectionIndex.textContent = `${i + 2}`; // +2 because we have itinerary as #1
        sectionClone.appendChild(sectionIndex);
        
        // Clean up the section for PDF
        cleanSectionForPDF(sectionClone);
        
        // Add a decorative top border
        const topBorder = document.createElement('div');
        topBorder.style.position = 'absolute';
        topBorder.style.top = '0';
        topBorder.style.left = '0';
        topBorder.style.right = '0';
        topBorder.style.height = '10px';
        topBorder.style.backgroundColor = i % 2 === 0 ? colors.primary : colors.accent;
        sectionClone.appendChild(topBorder);
        
        // Force section to update layout after modifications
        document.body.appendChild(sectionClone);
        
        try {
          const canvas = await html2canvas(sectionClone, {
            scale: 2,
            useCORS: true,
            logging: false,
            allowTaint: true,
            backgroundColor: 'white'
          });
          
          pdfContent.push({
            image: canvas.toDataURL('image/png', 1.0),
            width: 515,
            pageBreak: 'before'
          });
        } finally {
          document.body.removeChild(sectionClone);
        }
      }
      
      // Create document definition with explicit page breaks
      const docDefinition: TDocumentDefinitions = {
        pageSize: 'A4',
        pageMargins: [40, 40, 40, 60], // Add more margin at the bottom for page numbers
        info: {
          title: `Travel Guide - ${destination}`,
          subject: 'Travel Itinerary',
          creator: 'TravellingTrip Travel Guide Generator',
          producer: 'TravellingTrip'
        },
        footer: function(currentPage, pageCount) {
          return {
            columns: [
              { 
                text: `TravellingTrip - ${destination}`, 
                alignment: 'left',
                margin: [40, 0, 0, 0],
                fontSize: 8,
                color: '#666666'
              },
              {
                text: `${currentPage} / ${pageCount}`,
                alignment: 'right',
                margin: [0, 0, 40, 0],
                fontSize: 8
              }
            ],
            margin: [0, 20, 0, 0]
          };
        },
        content: pdfContent
      };
      
      // Generate and download the PDF
      const fileName = `TravellingTrip-${destination.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;
      pdfMake.createPdf(docDefinition).download(fileName);
      
      setSuccess(true);
      
      toast({
        title: language === 'fr' ? 'PDF créé avec succès!' : 'PDF successfully created!',
        description: language === 'fr'
          ? `Votre guide de voyage pour ${destination} a été téléchargé.`
          : `Your travel guide for ${destination} has been downloaded.`
      });
      
      console.log('PDF generation complete');
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError(language === 'fr'
        ? 'Une erreur est survenue lors de la génération du PDF'
        : 'An error occurred while generating the PDF'
      );
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex-1 sm:flex-none gap-2" disabled={isGenerating}>
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Printer className="h-4 w-4" />
          )}
          {language === 'fr' ? 'Guide PDF' : 'PDF Guide'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {language === 'fr' 
              ? `Créer un guide de voyage pour ${destination}` 
              : `Create travel guide for ${destination}`}
          </DialogTitle>
          <DialogDescription>
            {language === 'fr' 
              ? 'Téléchargez un guide de voyage professionnel en PDF pour votre destination' 
              : 'Download a professional PDF travel guide for your destination'}
          </DialogDescription>
        </DialogHeader>
        {error && (
          <div className="flex items-center gap-2 text-sm text-[#d99a08] bg-[#d99a08]/10 p-2 rounded">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
        
        {success && !isGenerating && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            {language === 'fr' 
              ? `Votre guide de voyage pour ${destination} a été téléchargé avec succès!` 
              : `Your travel guide for ${destination} has been successfully downloaded!`}
          </div>
        )}
        
        {isGenerating && (
          <div className="w-full space-y-2">
            <div className="bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-[#d99a08] h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-center">
              {language === 'fr' ? 'Création du guide PDF...' : 'Creating PDF guide...'}
              {progress > 0 && ` ${progress}%`}
            </p>
          </div>
        )}
        
        <div className="py-4 space-y-4">
          <div className="bg-[#FDF0D5] p-4 rounded-md">
            <h3 className="font-semibold text-[#d99a08] mb-2">
              {language === 'fr' ? 'Ce que contient votre guide' : 'What your guide includes'}
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-[#d99a08] text-white flex items-center justify-center text-xs flex-shrink-0 mt-0.5">1</div>
                <span>{language === 'fr' ? 'Couverture personnalisée' : 'Custom cover page'}</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-[#d99a08] text-white flex items-center justify-center text-xs flex-shrink-0 mt-0.5">2</div>
                <span>{language === 'fr' ? 'Table des matières' : 'Table of contents'}</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-[#d99a08] text-white flex items-center justify-center text-xs flex-shrink-0 mt-0.5">3</div>
                <span>{language === 'fr' ? 'Itinéraire jour par jour' : 'Day-by-day itinerary'}</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-[#d99a08] text-white flex items-center justify-center text-xs flex-shrink-0 mt-0.5">4</div>
                <span>{language === 'fr' ? 'Attractions et points d\'intérêt' : 'Attractions and points of interest'}</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-[#d99a08] text-white flex items-center justify-center text-xs flex-shrink-0 mt-0.5">5</div>
                <span>{language === 'fr' ? 'Conseils pratiques et recommandations' : 'Practical advice and recommendations'}</span>
              </li>
            </ul>
          </div>
          
          <Button 
            onClick={generatePDF}
            className="w-full gap-2"
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Printer className="h-4 w-4" />
            )}
            {language === 'fr' ? 'Créer mon guide PDF' : 'Create my PDF guide'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};