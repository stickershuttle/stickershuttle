-- Fix wholesale profile for jayfowler@outlook.com
-- User ID: 63dac538-f90c-42f0-89c4-7fc2b63f587f

INSERT INTO user_profiles (
  id,
  user_id, 
  first_name,
  last_name,
  display_name,
  company_name,
  is_wholesale_customer,
  wholesale_status,
  wholesale_credit_rate,
  wholesale_monthly_customers,
  wholesale_ordering_for,
  wholesale_fit_explanation,
  wholesale_approved_at,
  wholesale_approved_by,
  profile_photo_url,
  created_at,
  updated_at
) VALUES (
  '63dac538-f90c-42f0-89c4-7fc2b63f587f',
  '63dac538-f90c-42f0-89c4-7fc2b63f587f',
  'Justin',
  'Fowler', 
  'Justin Fowler',
  'Sticker Shuttle',
  true,
  'approved',
  0.10,
  '50+',
  'For clients',
  'Owner/operator of Sticker Shuttle',
  NOW(),
  'admin',
  'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1751341811/default-avatars/avatar-1_xqj8zs.png',
  NOW(),
  NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  display_name = EXCLUDED.display_name,
  company_name = EXCLUDED.company_name,
  is_wholesale_customer = EXCLUDED.is_wholesale_customer,
  wholesale_status = EXCLUDED.wholesale_status,
  wholesale_credit_rate = EXCLUDED.wholesale_credit_rate,
  wholesale_monthly_customers = EXCLUDED.wholesale_monthly_customers,
  wholesale_ordering_for = EXCLUDED.wholesale_ordering_for,
  wholesale_fit_explanation = EXCLUDED.wholesale_fit_explanation,
  wholesale_approved_at = EXCLUDED.wholesale_approved_at,
  wholesale_approved_by = EXCLUDED.wholesale_approved_by,
  updated_at = NOW(); 