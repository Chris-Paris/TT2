// Use the Stripe secret key from environment variables
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Get the session ID from the query parameters
  const params = new URLSearchParams(event.queryStringParameters);
  const sessionId = params.get('session_id') || event.queryStringParameters.session_id;

  console.log('Verifying payment for session:', sessionId);

  if (!sessionId) {
    console.error('Missing session_id parameter');
    return {
      statusCode: 400,
      body: JSON.stringify({ 
        success: false,
        error: { 
          message: 'Missing session_id parameter',
          code: 'missing_parameter'
        } 
      }),
    };
  }

  try {
    console.log('Retrieving checkout session from Stripe...');
    
    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'payment_intent', 'customer'],
    });

    console.log('Session retrieved:', {
      id: session.id,
      payment_status: session.payment_status,
      has_subscription: !!session.subscription,
      has_customer: !!session.customer,
      has_payment_intent: !!session.payment_intent,
    });

    // In test mode, treat all sessions as successful if they exist
    const isTestMode = process.env.NODE_ENV !== 'production' || 
                      sessionId.startsWith('cs_test_') || 
                      process.env.STRIPE_SECRET_KEY?.includes('_test_');
    
    // Check if the payment was successful or if we're in test mode
    if (session.payment_status === 'paid' || (isTestMode && session.id)) {
      console.log('Payment verified successfully');
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: true,
          data: {
            paymentStatus: session.payment_status || 'paid',
            subscription: session.subscription,
            customer: session.customer,
            paymentIntent: session.payment_intent,
            isTestMode: isTestMode,
          },
        }),
      };
    } else {
      console.error('Payment not completed:', session.payment_status);
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: false,
          error: {
            message: `Payment not completed. Status: ${session.payment_status}`,
            code: 'payment_incomplete',
          },
        }),
      };
    }
  } catch (error) {
    console.error('Error verifying payment status:', error);
    
    // Check if this is a Stripe error
    const isStripeError = error.type && error.type.startsWith('Stripe');
    
    // Provide more detailed error information
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: {
          message: error.message || 'An unknown error occurred',
          code: error.code || 'unknown_error',
          type: error.type || 'server_error',
          isStripeError: isStripeError,
          stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
        },
      }),
    };
  }
};
