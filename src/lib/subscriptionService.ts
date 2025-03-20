import { supabase } from './supabase';

// Interface for subscription data
export interface SubscriptionData {
  userId: string;
  stripeSessionId: string;
  subscriptionStatus: 'active' | 'canceled' | 'expired';
  expiresAt: string; // ISO date string
}

/**
 * Creates or updates a user's premium subscription
 * @param userId The user's ID
 * @param stripeSessionId The Stripe session ID from the successful payment
 * @returns A promise that resolves to the result of the operation
 */
export const createOrUpdateSubscription = async (
  userId: string,
  stripeSessionId: string
): Promise<{ data: any; error: any }> => {
  // Calculate expiration date (1 year from now)
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  // First check if a subscription already exists with this session ID to prevent duplicates
  const { data: existingSessionSubscription } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('stripe_session_id', stripeSessionId)
    .single();

  if (existingSessionSubscription) {
    // If this session ID is already in the database, just return the existing data
    // This prevents duplicate entries when the function is called multiple times
    return { data: existingSessionSubscription, error: null };
  }

  // Check if a subscription already exists for this user
  const { data: existingSubscription, error: fetchError } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    // Error other than "no rows returned"
    return { data: null, error: fetchError };
  }

  if (existingSubscription) {
    // Update existing subscription
    const { data, error } = await supabase
      .from('user_subscriptions')
      .update({
        stripe_session_id: stripeSessionId,
        subscription_status: 'active',
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select();

    return { data, error };
  } else {
    // Create new subscription
    const { data, error } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        stripe_session_id: stripeSessionId,
        subscription_status: 'active',
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select();

    return { data, error };
  }
};

/**
 * Checks if a user has an active premium subscription
 * @param userId The user's ID
 * @returns A promise that resolves to a boolean indicating if the user has an active subscription
 */
export const hasActiveSubscription = async (userId: string): Promise<boolean> => {
  if (!userId) return false;

  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('subscription_status', 'active')
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data) {
    return false;
  }

  return true;
};

/**
 * Stores a temporary session ID for a user who has paid but not yet created an account
 * @param sessionId The Stripe session ID
 * @returns A promise that resolves when the session is stored
 */
export const storeTemporarySession = async (sessionId: string): Promise<void> => {
  // Store in localStorage for now - this will be transferred to the user's account when they sign up
  localStorage.setItem('pendingPremiumSession', sessionId);
};

/**
 * Retrieves and clears the temporary session ID
 * @returns The stored session ID or null if none exists
 */
export const retrieveAndClearTemporarySession = (): string | null => {
  const sessionId = localStorage.getItem('pendingPremiumSession');
  if (sessionId) {
    localStorage.removeItem('pendingPremiumSession');
  }
  return sessionId;
};
