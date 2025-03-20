const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_51QkiGA04MIC9pcQ6kQU6zj04JrJQWeex1X4KHnxPWGtyFeQWYiv84ThHlXBkwBrjIYUWL9s54E5NihUex0oIkrgN00eKm6KbRw');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project-id.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your_service_role_key';
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event) => {
  try {
    // Verify the webhook signature
    const stripeSignature = event.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!stripeSignature || !webhookSecret) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing stripe signature or webhook secret' }),
      };
    }

    // Construct the event from the raw body and signature
    let stripeEvent;
    try {
      stripeEvent = stripe.webhooks.constructEvent(
        event.body,
        stripeSignature,
        webhookSecret
      );
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: `Webhook Error: ${err.message}` }),
      };
    }

    // Handle specific event types
    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object;
        
        // Store the completed checkout session in Supabase
        if (session.customer && session.subscription) {
          // Check if the customer already has a user account
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('stripe_customer_id', session.customer)
            .single();
          
          if (userData) {
            // Update existing user's subscription
            await supabase
              .from('user_subscriptions')
              .upsert({
                user_id: userData.id,
                stripe_customer_id: session.customer,
                stripe_subscription_id: session.subscription,
                status: 'active',
                price_id: session.metadata?.price_id,
                current_period_end: null, // This will be updated by the subscription.updated event
              });
          } else {
            // Store the session for later association with a user
            await supabase
              .from('pending_subscriptions')
              .upsert({
                stripe_session_id: session.id,
                stripe_customer_id: session.customer,
                stripe_subscription_id: session.subscription,
                status: 'pending',
                created_at: new Date().toISOString(),
              });
          }
        }
        break;
      }
      
      case 'customer.subscription.updated': {
        const subscription = stripeEvent.data.object;
        
        // Update the subscription status in Supabase
        await supabase
          .from('user_subscriptions')
          .update({
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);
        
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = stripeEvent.data.object;
        
        // Update the subscription status in Supabase
        await supabase
          .from('user_subscriptions')
          .update({
            status: 'canceled',
          })
          .eq('stripe_subscription_id', subscription.id);
        
        break;
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
