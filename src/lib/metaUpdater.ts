const metaData = {
  en: {
    title: 'Best Travel Planner – Plan Your Perfect Trip Easily',
    description: 'Discover the best travel planner to create personalized itineraries, find top destinations, and organize your trip with ease.',
    ogTitle: 'Plan Your Perfect Trip with the Best Travel Planner',
    ogDescription: 'Effortlessly plan your next adventure with our smart travel planner. Customize your itinerary and explore top destinations!',
    twitterTitle: 'Best Travel Planner – Your Ultimate Trip Organizer',
    twitterDescription: 'Plan your dream trip with the best travel planner. Create custom itineraries, explore new destinations, and travel smarter!'
  },
  fr: {
    title: 'Meilleur Planificateur de Voyage – Organisez Votre Voyage Parfait',
    description: 'Découvrez le meilleur planificateur de voyage pour créer des itinéraires personnalisés, explorer des destinations et organiser votre séjour facilement.',
    ogTitle: 'Organisez Votre Voyage Idéal avec le Meilleur Planificateur',
    ogDescription: 'Planifiez votre prochaine aventure facilement avec notre planificateur de voyage intelligent. Personnalisez votre itinéraire et explorez de nouvelles destinations !',
    twitterTitle: 'Meilleur Planificateur de Voyage – Votre Assistant Idéal',
    twitterDescription: 'Planifiez le voyage de vos rêves avec le meilleur planificateur. Créez des itinéraires personnalisés, explorez de nouvelles destinations et voyagez malin !'
  }
};

export function updateMetaTags(language: 'en' | 'fr') {
  const data = metaData[language];
  
  // Update title and meta description
  document.title = data.title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', data.description);
  
  // Update Open Graph tags
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', data.ogTitle);
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', data.ogDescription);
  
  // Update Twitter Card tags
  document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', data.twitterTitle);
  document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', data.twitterDescription);
}
