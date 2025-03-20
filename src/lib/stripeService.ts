import Stripe from 'stripe';

// Initialize Stripe with the secret key
const stripeSecretKey = import.meta.env.VITE_STRIPE_SECRET_KEY || 'sk_live_your_production_key';
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-02-24.acacia', // Use the latest API version
});

// Types for Stripe API responses
export interface StripeServiceResponse {
  success: boolean;
  data?: any;
  error?: {
    message: string;
    code?: string;
  };
}

export interface StripeCheckoutOptions {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
}

export interface CreateCheckoutSessionOptions {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
}

export interface StripeResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

export interface CheckoutSession {
  id: string;
  object: string;
  url: string;
}

/**
 * Create a checkout session for a subscription
 */
export async function createCheckoutSession(options: CreateCheckoutSessionOptions): Promise<StripeResponse<CheckoutSession>> {
  try {
    const response = await fetch('/.netlify/functions/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });

    // Check if the response is ok
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('Error response from create-checkout-session:', errorData || response.statusText);
      
      return {
        success: false,
        error: {
          message: errorData?.error?.message || `HTTP error! status: ${response.status}`,
          code: errorData?.error?.code || 'http_error',
        },
      };
    }

    const data = await response.json();
    
    if (!data.success) {
      return {
        success: false,
        error: data.error,
      };
    }

    return {
      success: true,
      data: data.data,
    };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        code: 'unknown_error',
      },
    };
  }
}

/**
 * Verify if a payment was successful based on the session ID
 * This uses the Netlify Function to securely verify the payment status
 */
export async function verifyPaymentStatus(sessionId: string): Promise<StripeServiceResponse> {
  try {
    // Call the Netlify Function to verify the payment
    const response = await fetch(`/.netlify/functions/verify-payment?session_id=${sessionId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error verifying payment status:', error);
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        code: 'api_error',
      },
    };
  }
}

/**
 * Retrieve a checkout session by ID
 */
export async function retrieveCheckoutSession(sessionId: string): Promise<StripeServiceResponse> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    });

    return {
      success: true,
      data: session,
    };
  } catch (error) {
    console.error('Error retrieving checkout session:', error);
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        code: error instanceof Stripe.errors.StripeError ? error.code : undefined,
      },
    };
  }
}

/**
 * Create a customer portal session for managing subscriptions
 */
export async function createCustomerPortalSession(customerId: string, returnUrl: string): Promise<StripeServiceResponse> {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return {
      success: true,
      data: session,
    };
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        code: error instanceof Stripe.errors.StripeError ? error.code : undefined,
      },
    };
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(subscriptionId: string): Promise<StripeServiceResponse> {
  try {
    const subscription = await stripe.subscriptions.cancel(subscriptionId);

    return {
      success: true,
      data: subscription,
    };
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        code: error instanceof Stripe.errors.StripeError ? error.code : undefined,
      },
    };
  }
}
