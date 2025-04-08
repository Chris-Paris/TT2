import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { InspirationPhotos } from './InspirationPhotos';
import { PlacesAutocomplete } from './PlacesAutocomplete';
import { analytics } from '@/lib/analytics';
import { WhereToGo } from './ui/WhereToGo';
import { ArrowRight } from 'lucide-react';

export type Interest = 'Culture' | 'Nature' | 'Food' | 'Shopping' | 'Adventure' | 'Relaxation' | 'History' | 'Art' | 'Couple Trip' | 'Family Trip' | 'Night Life' | 'Business Trip' | 'Roadtrip';

interface Recommendation {
  name: string;
  description: string;
}

const recommendations: Record<'en' | 'fr', Recommendation[]> = {
  en: [
    {
      name: "Sarah's Adventure",
      description: "I used TravellingTrip to plan my 2-week journey through Japan. The AI suggested hidden gems I would've never found otherwise, like a tiny sushi place in Tokyo and a peaceful temple in Kyoto. The itinerary was perfectly balanced between cultural sites and modern attractions."
    },
    {
      name: "Michael's Family Trip",
      description: "Planning a family vacation to Spain was a breeze with TravellingTrip. The AI understood our need for kid-friendly activities and suggested amazing spots like interactive museums and parks. The day-by-day schedule helped us make the most of our time without exhausting the children."
    },
    {
      name: "Emma's Cultural Tour",
      description: "TravellingTrip crafted the perfect cultural experience in Italy for me. From hidden art galleries in Florence to local cooking classes in Bologna, every recommendation was spot-on. The practical advice about transportation and local customs was invaluable for solo traveling."
    }
  ],
  fr: [
    {
      name: "L'Aventure de Sarah",
      description: "J'ai utilisé TravellingTrip pour planifier mon voyage de 2 semaines au Japon. L'IA a suggéré des trésors cachés que je n'aurais jamais trouvés autrement, comme un petit restaurant de sushi à Tokyo et un temple paisible à Kyoto. L'itinéraire était parfaitement équilibré entre sites culturels et attractions modernes."
    },
    {
      name: "Le Voyage en Famille de Michael",
      description: "Planifier des vacances en famille en Espagne a été un jeu d'enfant avec TravellingTrip. L'IA a compris notre besoin d'activités adaptées aux enfants et a suggéré des endroits incroyables comme des musées interactifs et des parcs. Le programme jour par jour nous a aidés à optimiser notre temps sans épuiser les enfants."
    },
    { 
      name: "Le Tour Culturel d'Emma",
      description: "TravellingTrip a créé l'expérience culturelle parfaite en Italie pour moi. Des galeries d'art cachées à Florence aux cours de cuisine locaux à Bologne, chaque recommandation était parfaite. Les conseils pratiques sur les transports et les coutumes locales ont été inestimables pour voyager en solo."
    }
  ]
};

const interestTranslations: Record<Interest, Record<'en' | 'fr', string>> = {
  Culture: { en: 'Culture', fr: 'Culture' },
  Nature: { en: 'Nature', fr: 'Nature' },
  Food: { en: 'Food', fr: 'Gastronomie' },
  Shopping: { en: 'Shopping', fr: 'Shopping' },
  Adventure: { en: 'Adventure', fr: 'Aventure' },
  Relaxation: { en: 'Relaxation', fr: 'Détente' },
  History: { en: 'History', fr: 'Histoire' },
  Art: { en: 'Art', fr: 'Art' },
  'Couple Trip': { en: 'Couple Trip', fr: 'Voyage en couple' },
  'Family Trip': { en: 'Family Trip', fr: 'Voyage en famille' },
  'Night Life': { en: 'Night Life', fr: 'Vie nocturne' },
  'Business Trip': { en: 'Business Trip', fr: 'Voyage d\'affaires' },
  'Roadtrip': { en: 'Roadtrip', fr: 'Roadtrip' }
};

const interests: Interest[] = ['Culture', 'Nature', 'Food', 'Shopping', 'Adventure', 'Relaxation', 'History', 'Art', 'Couple Trip', 'Family Trip', 'Night Life', 'Business Trip', 'Roadtrip'];

// Split interests into two groups: initial visible ones and hidden ones
const initialInterests: Interest[] = ['Culture', 'Nature', 'Food', 'Shopping', 'Adventure', 'Relaxation', 'Couple Trip', 'Family Trip', 'Roadtrip'];
const hiddenInterests: Interest[] = ['History', 'Art', 'Night Life', 'Business Trip'];

interface TravelFormProps {
  onSubmit: (data: FormValues) => void;
  isLoading: boolean;
  language: 'en' | 'fr';
  onReset: () => void;
  hasResults?: boolean;
}

export const formSchema = z.object({
  destination: z.string().min(2, {
    message: 'Destination must be at least 2 characters.'
  }),
  duration: z.number().min(1).max(30),
  interests: z.array(z.enum(['Culture', 'Nature', 'Food', 'Shopping', 'Adventure', 'Relaxation', 'History', 'Art', 'Couple Trip', 'Family Trip', 'Night Life', 'Business Trip', 'Roadtrip']))
});

export type FormValues = z.infer<typeof formSchema>;

function useTypewriter(text: string, speed: number = 100000) {
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    let i = 0;
    setDisplayText('');
    
    const typing = setInterval(() => {
      if (i < text.length) {
        setDisplayText(prev => prev + text.charAt(i));
        i++;
      } else {
        clearInterval(typing);
      }
    }, speed);

    return () => clearInterval(typing);
  }, [text, speed]);

  return displayText;
}

export function TravelForm({ onSubmit, isLoading, language, onReset, hasResults = false }: TravelFormProps) {
  const [showMoreInterests, setShowMoreInterests] = useState(false);
  const [isGifExpanded, setIsGifExpanded] = useState(false);
  const showInspirationPhotos = true;
  const loadingText = language === 'en'
    ? "YYour trip is on its way! AI is preparing the best recommendations in terms of must see places, best local restaurants and of course things to do day by day ... It's almost there, be a bit patient... generating it all might take up to 20 seconds... and then it's... DONE!"
    : "VVotre voyage est en cours de route ! L'intelligence artificielle vous prépare les meilleures suggestions en terme de choses à voir, de restaurants locaux et de choses à faire, ce jour par jour en fonction de vos intérêts ...   C'est presque prêt, encore un peu de patience... la génération peut prendre jusqu'à 20 secondes... puis c'est.. PRÊT !";
  
  const loadingDisplayText = useTypewriter(isLoading ? loadingText : '', 100);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      destination: '',
      duration: 3,
      interests: ['Culture', 'Nature'] // Update default value here
    },
  });

  useEffect(() => {
    const currentInterests = form.getValues('interests');
    if (currentInterests.length > 0) {
      const translatedInterests = currentInterests
        .map(interest => {
          const index = interests.indexOf(interest as any);
          return index !== -1 ? interestTranslations[interest][language] : null;
        })
        .filter((interest): interest is Interest => interest !== null);

      if (translatedInterests.length > 0) {
        form.setValue('interests', translatedInterests);
      }
    }
  }, [language, form]);

  const handleSubmit = async (data: FormValues) => {
    const tripIframe = document.getElementById('tripIframe');
    if (tripIframe) {
      tripIframe.style.display = 'none';
    }
    
    // Log the form data for debugging
    console.log('Form data submitted:', data);
    
    analytics.trackTravelPlanGenerated(
      data.destination,
      data.duration,
      data.interests
    );
    onSubmit(data);
  };

  return (
    <div className="flex flex-col gap-4 mb-5">
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 lg:space-y-5 max-w-lg lg:max-w-7xl mx-auto pt-0">
        {/* Background video section with title overlay */}
        <div className="relative w-full" style={{ height: "300px" }}>
          {/* Background video */}
          <InspirationPhotos isVisible={showInspirationPhotos} language={language} backgroundMode={true} />
          
          {/* Content that goes on top of the video */}
          <div className="relative z-10 h-full flex flex-col justify-center">
            <h1 className="text-white text-4xl lg:text-5xl font-bold text-center mb-4 text-shadow-sm">
              {language === 'en' 
                ? 'Your trip planned in one minute.'
                : 'Votre voyage planifié en une minute.'}
            </h1>
            <div className="relative flex items-center justify-center overflow-hidden mt-1.5">
              <h2 className="text-xl lg:text-2xl font-semibold text-center text-white [animation:pulse_3s_cubic-bezier(0.4,0,0.6,1)_infinite] text-shadow-sm">
              {language === 'en'
                ? 'Skip the endless searching. Get a personalized itinerary in few clicks planned by AI !'
                : 'Évitez les recherches interminables. Obtenez un itinéraire planifié en quelques clics avec l\'IA !'}
              </h2>
            </div>
            {/* Destination ideas button placed below H2 text and styled white */}
            <div className="flex justify-center mt-6">
              <button
                type="button"
                className="text-white text-lg lg:text-xl text-center hover:opacity-80 transition-opacity duration-200 flex items-center gap-2 underline underline-offset-4"
                onClick={() => {
                  document.getElementById('destination-ideas-trigger')?.click();
                }}
              >
                <span>{language === 'en' ? 'Destination Ideas' : 'Idées de destinations'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <div className="hidden">
                <WhereToGo 
                  language={language} 
                  onDestinationSelect={(destination) => {
                    form.setValue('destination', destination);
                  }}
                  id="destination-ideas-trigger"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Unified Search Bar */}
        <div className="flex flex-col lg:mx-32 lg:mt-2">
          <div className="flex-1">
            <div className="bg-[#5f9585] rounded-lg p-2">
              <div className="flex flex-row gap-3">
                <div className="flex-[2]">
                  <label className="block text-sm font-medium text-white">
                    {language === 'en' ? 'Where are you going?' : 'Où voulez-vous aller?'}
                  </label>
                  <div className="mt-1">
                    <PlacesAutocomplete
                      register={form.register}
                      setValue={form.setValue}
                      language={language}
                      onFocus={() => {}}
                      onBlur={() => {}}
                    />
                  </div>
                </div>

                <div className="flex-[1]">
                  <label className="block text-sm font-medium text-white">
                    {language === 'en' ? 'Duration' : 'Durée'}
                  </label>
                  <div className="mt-1">
                    <select
                      {...form.register('duration', { valueAsNumber: true })}
                      className="w-full h-10 border rounded-lg bg-white shadow-sm hover:border-gray-300 focus:border-[#d99a08] focus:ring-2 focus:ring-[#d99a08]/20 transition-all duration-200"
                      defaultValue="3"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((days) => (
                        <option key={days} value={days}>
                          {days} {language === 'en' ? (days === 1 ? 'day' : 'days') : (days === 1 ? 'jour' : 'jours')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {form.formState.errors.destination && (
              <p className="text-red-500 text-sm mt-2">
                {form.formState.errors.destination.message}
              </p>
            )}
          </div>

          <div className="flex justify-center">
            <div className="hidden">
              <WhereToGo 
                language={language} 
                onDestinationSelect={(destination) => {
                  form.setValue('destination', destination);
                }}
                id="destination-ideas-trigger"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-m font-bold text-[#5f9585] p-2">
            {language === 'en' ? 'Your interests' : 'Vos centres d\'intérêt'}
          </label>
          <div className="space-y-2.5">
            <div className="flex flex-wrap gap-2.5">
              {initialInterests.map((interest) => {
                const inputId = `interest-${interest}`;
                return (
                  <label
                    key={interest}
                    htmlFor={inputId}
                    className={`inline-flex items-center cursor-pointer group`}
                  >
                    <input
                      type="checkbox"
                      id={inputId}
                      {...form.register('interests')}
                      value={interest}
                      className="sr-only peer"
                    />
                    <div className={`px-3 py-2 rounded-full border-2 border-[#5f9585] bg-white text-[#5f9585]
                      peer-checked:bg-[#5f9585] peer-checked:text-white peer-checked:border-[#5f9585] peer-checked:shadow-md
                      hover:border-[#5f9585] hover:border-opacity-70 hover:shadow-sm transition-all duration-200`}>
                      {interestTranslations[interest][language]}
                    </div>
                  </label>
                );
              })}
              <button
                type="button"
                onClick={() => setShowMoreInterests(!showMoreInterests)}
                className="px-3 py-2 rounded-full border-2 border-[#5f9585] bg-white text-[#5f9585] hover:bg-[#5f9585]/5 transition-colors"
              >
                {showMoreInterests 
                  ? (language === 'en' ? 'Show Less' : 'Voir Moins') 
                  : (language === 'en' ? 'More Options' : 'Plus d\'Options')}
              </button>
            </div>
            {showMoreInterests && (
            <div className="flex flex-wrap gap-2.5">
              {hiddenInterests.map((interest) => {
              const inputId = `interest-${interest}`;
              return (
                <label
                  key={interest}
                  htmlFor={inputId}
                  className={`inline-flex items-center cursor-pointer group`}
                >
                  <input
                    type="checkbox"
                    id={inputId}
                    {...form.register('interests')}
                    value={interest}
                    className="sr-only peer"
                  />
                  <div className={`px-3 py-2 rounded-full border-2 border-[#5f9585] bg-white text-[#5f9585]
                    peer-checked:bg-[#5f9585] peer-checked:text-white peer-checked:border-[#5f9585] peer-checked:shadow-md
                    hover:border-[#5f9585] hover:border-opacity-70 hover:shadow-sm transition-all duration-200`}>
                    {interestTranslations[interest][language]}
                  </div>
                </label>
              );
              })}
            </div>
            )}
          </div>
          {form.formState.errors.interests && (
            <p className="text-red-500 text-sm mt-2">
              {form.formState.errors.interests.message}
            </p>
          )}
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 bg-[#d99a08] text-white rounded-lg hover:bg-[#d99a08]/90 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 flex-1 text-base font-medium"
          >
            <div className="flex items-center justify-center gap-2">
              {isLoading ? (
                <span className="flex items-center gap-2"><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>{language === 'en' ? 'Generating...' : 'Génération...'}</span>
              ) : (
                <>
                  <span>{language === 'en' ? 'Generate with AI' : 'Générer mon voyage'}</span>
                  <svg 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14m-7-7 7 7-7 7"/>
                  </svg>
                </>
              )}
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              form.reset();
              onReset();
            }}
            className="px-6 py-3 border-2 border-gray-300 bg-white hover:bg-gray-50 rounded-lg transition-all duration-200 text-base font-medium"
          >
            {language === 'en' ? 'Reset' : 'Réinitialiser'}
          </button>
        </div>

        {(!isLoading && !hasResults) ? (
          <>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setIsGifExpanded(!isGifExpanded)}
                className="text-black text-lg text-xl text-center hover:opacity-80 transition-opacity duration-200 flex items-center gap-3 underline underline-offset-4"
              >
                <span>{language === 'en' ? 'How does it work' : 'Comment ça marche'}</span>
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14m-7-7 7 7-7 7"/>
                </svg>
              </button>
            </div>

            {isGifExpanded && (
              <div className="mt-4 flex justify-center w-full overflow-hidden transition-all duration-300">
                <div style={{ width: '1500px', position: 'relative', paddingTop: '506.25px' }}>
                  <img 
                    src="https://s3.gifyu.com/images/bS9jR.gif" 
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain' }}
                    alt="Travel animation"
                  />
                </div>
              </div>
            )}

            <div className="mt-8 lg:mt-10 w-full max-w-1280 lg:max-w-1280 mx-auto bg-[#FDF0D5] rounded-lg p-6">
              <h3 className="text-xl lg:text-2xl font-bold text-center mb-6">
                {language === 'en' ? 'What our travelers say' : 'Ce que disent nos voyageurs'}
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {recommendations[language].map((rec, index) => (
                  <div
                    key={index}
                    className="bg-white p-6 rounded-lg shadow-lg flex flex-col relative transform transition-all duration-300 hover:scale-105"
                  >
                    <div className="absolute -top-3 left-6 bg-white text-[#d99a08] border-2 border-[#d99a08] px-4 py-1 rounded-full text-sm">
                      {language === 'en' ? 'Verified Trip' : 'Voyage Vérifié'}
                    </div>
                   <div className="flex flex-col gap-4">
                      <img
                        src={index === 0 
                          ? "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg" // Sarah
                          : index === 1
                          ? "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg" // Michael 
                          : "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg" // Emma
                        }
                        alt={rec.name}
                       className="w-16 h-16 rounded-full object-cover mx-auto"
                      />
                     <div className="text-center">
                       <h4 className="font-semibold text-lg mb-3">{rec.name}</h4>
                       <p className="text-gray-600 leading-relaxed">{rec.description}</p>
                        <div className="flex items-center mt-4 text-[#d99a08]">
                          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-center mt-8 text-gray-600">
                <p className="font-medium">
                  {language === 'en' 
                    ? '1000+ travelers have planned their perfect trip with TravellingTrip' 
                      : 'Plus de 1000 voyageurs ont planifié leur voyage parfait avec TravellingTrip'}
                </p>
              </div>
            </div>

            <div className="mt-8 lg:mt-10">
              <iframe
                className="w-full"
                height="250"
                src="https://www.trip.com/partners/ad/SB1313692?Allianceid=5922575&SID=165091732&trip_sub1="
                frameBorder="0"
                scrolling="no"
              />
            </div>
          </>
        ) : isLoading ? (
          <div className="mt-8 text-center text-lg text-gray-600 animate-pulse max-w-2xl mx-auto">
            {loadingDisplayText}
          </div>
        ) : null}
      </form>
    </div>
  );
}