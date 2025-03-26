import mixpanel, { Config, Mixpanel } from 'mixpanel-browser';

// Extend Mixpanel types to include session replay methods
declare module 'mixpanel-browser' {
  interface Mixpanel {
    start_session_recording(): void;
    stop_session_recording(): void;
    get_session_recording_properties(): Record<string, any>;
    get_session_replay_url(): string | null;
  }
}

// Type for Mixpanel initialization options including session replay
type MixpanelConfig = Partial<Config> & {
  record_sessions_percent?: number;
  record_mask_text_selector?: string;
  record_idle_timeout_ms?: number;
};

const MIXPANEL_TOKEN = '506b88238a64b71eb0defdb84d035c2a';

// Initialize Mixpanel
const config: MixpanelConfig = {
  debug: import.meta.env.DEV,
  track_pageview: true,
  persistence: 'localStorage',
  api_host: 'https://api-eu.mixpanel.com',
  api_transport: 'XHR',
  cross_site_cookie: false,
  cross_subdomain_cookie: false,
  secure_cookie: true,
  persistence_name: 'tripscout_mp',
  upgrade: true,
  disable_persistence: false,
  disable_cookie: false,
  disable_notifications: true,
  record_sessions_percent: 10, // Record 10% of all sessions
  record_mask_text_selector: '.private-data', // Mask elements with class 'private-data'
  record_idle_timeout_ms: 1800000, // Stop recording after 30 minutes of inactivity
  loaded: (mp: Mixpanel) => {
    mp.register({
      'Platform': 'Web',
      'App Version': '0.1.0'
    });
  }
};

mixpanel.init(MIXPANEL_TOKEN, config);

// Analytics events
export const analytics = {
  // Track page views
  trackPageView: (pageName: string) => {
    mixpanel.track('Page View', { page: pageName });
  },

  // Track form submissions
  trackTravelPlanGenerated: (destination: string, duration: number, interests: string[]) => {
    mixpanel.track('Travel Plan Generated', {
      destination,
      duration,
      interests,
      timestamp: new Date().toISOString()
    });
  },

  // Track when user adds an item to the itinerary
  trackAddToItinerary: (destination: string, itemTitle: string) => {
    mixpanel.track('Add To Itinerary', {
      destination,
      itemTitle,
      timestamp: new Date().toISOString()
    });
  },

  // Track when the checkout modal is opened
  trackCheckoutModalOpened: (userId?: string) => {
    mixpanel.track('Checkout Modal Opened', {
      userId: userId || 'anonymous',
      timestamp: new Date().toISOString(),
      path: window.location.pathname
    });
  },

  // Track when the user clicks the "Upgrade to Premium" button
  trackCheckoutButtonClicked: (userId?: string) => {
    mixpanel.track('Checkout Button Clicked', {
      userId: userId || 'anonymous',
      timestamp: new Date().toISOString(),
      path: window.location.pathname
    });
  },

  // Track language changes
  trackLanguageChange: (language: 'en' | 'fr') => {
    mixpanel.track('Language Changed', { language });
  },

  // Track when user views travel results
  trackViewTravelResults: (destination: string) => {
    mixpanel.track('View Travel Results', {
      destination,
      timestamp: new Date().toISOString()
    });
  },

  // Track when user saves a trip
  trackSaveTrip: (data: { destination: string; duration: number; language: string }) => {
    mixpanel.track('Save Trip', {
      ...data,
      timestamp: new Date().toISOString()
    });
  },

  // Track when user shares travel plan
  trackShare: (destination: string, method: 'clipboard' | 'native-share') => {
    mixpanel.track('Share Travel Plan', {
      destination,
      method,
      timestamp: new Date().toISOString()
    });
  },

  // Track when user loads more activities/attractions
  trackLoadMore: (type: 'activities' | 'attractions' | 'hiddenGems', destination: string) => {
    mixpanel.track('Load More Content', { type, destination });
  },

  // Track when user resets the form
  trackReset: () => {
    mixpanel.track('Reset Form');
  },

  // Track destination input
  trackDestinationInput: (destination: string) => {
    mixpanel.track('Destination Input', {
      destination,
      timestamp: new Date().toISOString()
    });
  },

  // Identify user (if you implement user authentication later)
  identifyUser: (userId: string, traits?: Record<string, any>) => {
    mixpanel.identify(userId);
    if (traits) {
      mixpanel.people.set(traits);
    }
  },

  // Session replay controls
  startSessionRecording: () => {
    mixpanel.start_session_recording();
  },

  stopSessionRecording: () => {
    mixpanel.stop_session_recording();
  },

  getSessionReplayUrl: () => {
    return mixpanel.get_session_replay_url();
  },

  getSessionRecordingProperties: () => {
    return mixpanel.get_session_recording_properties();
  },

  // Track when user suggests activities
  trackSuggestActivities: (destination: string) => {
    mixpanel.track('Suggest Activities', {
      destination,
      timestamp: new Date().toISOString()
    });
  },

  // Track when user asks a question
  trackAskQuestion: (destination: string) => {
    mixpanel.track('Ask Question', {
      destination,
      timestamp: new Date().toISOString()
    });
  }
};