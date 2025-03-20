-- Create a view that joins users with their subscription information
CREATE OR REPLACE VIEW users_with_subscriptions_view AS
SELECT 
  au.id,
  au.email,
  au.created_at,
  au.raw_user_meta_data->>'subscription_status' as subscription_status,
  au.raw_user_meta_data->>'subscription_expires_at' as subscription_expires_at,
  us.id as subscription_id,
  us.stripe_session_id,
  us.created_at as subscription_created_at,
  us.updated_at as subscription_updated_at
FROM 
  auth.users au
LEFT JOIN 
  public.user_subscriptions us ON au.id = us.user_id::uuid
WHERE 
  au.deleted_at IS NULL;

-- Grant appropriate permissions
GRANT SELECT ON users_with_subscriptions_view TO authenticated;
GRANT SELECT ON users_with_subscriptions_view TO service_role;
