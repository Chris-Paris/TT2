// Use the Stripe secret key from environment variables
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_51QkiGA04MIC9pcQ6kQU6zj04JrJQWeex1X4KHnxPWGtyFeQWYiv84ThHlXBkwBrjIYUWL9s54E5NihUex0oIkrgN00eKm6KbRw');

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse the request body
    const data = JSON.parse(event.body);
    const { priceId, successUrl, cancelUrl, customerEmail, metadata } = data;

    console.log('Received request with data:', JSON.stringify({
      priceId,
      successUrl,
      cancelUrl,
      customerEmail,
      metadata
    }, null, 2));

    if (!priceId || !successUrl || !cancelUrl) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          success: false,
          error: { message: 'Missing required parameters' } 
        }),
      };
    }

    console.log('Creating checkout session with price ID:', priceId);

    // Create the checkout session with simpler parameters first
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      ...(customerEmail ? { customer_email: customerEmail } : {}),
    });

    console.log('Checkout session created successfully:', session.id);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        data: {
          id: session.id,
          url: session.url,
        },
      }),
    };
  } catch (error) {
    console.error('Error creating checkout session:', error.message);
    
    if (error.type === 'StripeInvalidRequestError') {
      console.error('Stripe invalid request details:', error.param, error.code);
    }
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: {
          message: error.message || 'An unknown error occurred',
          code: error.code || 'unknown_error',
          type: error.type || 'unknown_type',
          param: error.param,
        },
      }),
    };
  }
};
