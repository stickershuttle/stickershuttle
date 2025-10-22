// Script to generate SQL for adding Pro member columns to user_profiles table
console.log('🔧 SQL to add Pro member columns to user_profiles table:');
console.log('');
console.log('-- Copy and paste this SQL into your Supabase SQL editor --');
console.log('');

const sql = `
-- Add Pro membership columns to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS is_pro_member BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pro_status TEXT,
ADD COLUMN IF NOT EXISTS pro_plan TEXT,
ADD COLUMN IF NOT EXISTS pro_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS pro_current_period_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pro_current_period_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pro_current_design_file TEXT,
ADD COLUMN IF NOT EXISTS pro_design_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pro_design_approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pro_design_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pro_design_locked_at TIMESTAMPTZ;

-- Create index for faster Pro member queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_pro_member ON user_profiles(is_pro_member);
CREATE INDEX IF NOT EXISTS idx_user_profiles_pro_subscription_id ON user_profiles(pro_subscription_id);

-- Verify columns were added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name LIKE 'pro_%' OR column_name = 'is_pro_member'
ORDER BY column_name;
`;

console.log(sql);
console.log('');
console.log('📋 Instructions:');
console.log('1. Go to your Supabase dashboard');
console.log('2. Navigate to SQL Editor');
console.log('3. Copy and paste the SQL above');
console.log('4. Run the query');
console.log('5. Come back and run: node test-local-pro.js');
console.log('');
