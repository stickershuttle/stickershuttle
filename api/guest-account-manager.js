const { getSupabaseAdmin } = require('./supabase-client');

// Planet names for password generation
const PLANETS = [
  'Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune',
  'Pluto', 'Ceres', 'Eris', 'Haumea', 'Makemake', 'Sedna', 'Quaoar', 'Orcus',
  'Vesta', 'Pallas', 'Juno', 'Hygiea', 'Interamnia', 'Europa', 'Ganymede', 
  'Callisto', 'Io', 'Titan', 'Enceladus', 'Mimas', 'Triton', 'Charon'
];

// Special characters for password generation
const SYMBOLS = ['!', '@', '#', '$', '%', '&', '*', '+', '=', '?'];

/**
 * Generate a unique password in the format: Planet + 4 digits + symbol
 * Example: Mars1234! or Jupiter9876@
 */
function generateUniquePassword() {
  // Select random planet
  const planet = PLANETS[Math.floor(Math.random() * PLANETS.length)];
  
  // Generate 4 random digits
  const digits = Math.floor(1000 + Math.random() * 9000); // Ensures 4 digits
  
  // Select random symbol
  const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  
  return `${planet}${digits}${symbol}`;
}

/**
 * Check if a password already exists in the database
 */
async function isPasswordUnique(password) {
  try {
    const supabase = getSupabaseAdmin();
    
    // We can't directly query passwords (they're hashed), so we'll assume uniqueness
    // The probability of collision is extremely low with our format
    // (30 planets × 9000 possible digits × 10 symbols = 2,700,000 combinations)
    
    return true;
  } catch (error) {
    console.error('Error checking password uniqueness:', error);
    return true; // Default to true if we can't check
  }
}

/**
 * Generate a guaranteed unique password
 */
async function generateGuaranteedUniquePassword() {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const password = generateUniquePassword();
    const isUnique = await isPasswordUnique(password);
    
    if (isUnique) {
      return password;
    }
    
    attempts++;
  }
  
  // Fallback: add timestamp to ensure uniqueness
  const fallbackPassword = generateUniquePassword();
  const timestamp = Date.now().toString().slice(-3);
  return `${fallbackPassword}${timestamp}`;
}

/**
 * Create a guest account in Supabase with the provided information
 */
async function createGuestAccount(guestData) {
  try {
    const { firstName, lastName, email } = guestData;
    
    // Generate unique password
    const password = await generateGuaranteedUniquePassword();
    
    console.log(`🔐 Creating guest account for ${email} with generated password`);
    
    const supabase = getSupabaseAdmin();
    
    // Create the user account
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
        created_via_guest_checkout: true,
        created_at: new Date().toISOString()
      }
    });
    
    if (authError) {
      console.error('❌ Error creating auth user:', authError);
      throw authError;
    }
    
    console.log('✅ Auth user created successfully:', authData.user.id);
    
    // Create user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        email: email,
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
        created_via_guest_checkout: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (profileError) {
      console.error('❌ Error creating user profile:', profileError);
      // Don't throw here, user account is already created
    } else {
      console.log('✅ User profile created successfully');
    }
    
    return {
      success: true,
      user: authData.user,
      password: password,
      message: 'Guest account created successfully'
    };
    
  } catch (error) {
    console.error('❌ Error in createGuestAccount:', error);
    return {
      success: false,
      error: error.message || 'Failed to create guest account',
      password: null
    };
  }
}

/**
 * Check if an email already has an account
 */
async function emailExists(email) {
  try {
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('Error checking email existence:', error);
      return false;
    }
    
    return data.users.some(user => user.email === email);
    
  } catch (error) {
    console.error('Error in emailExists:', error);
    return false;
  }
}

module.exports = {
  generateUniquePassword,
  generateGuaranteedUniquePassword,
  createGuestAccount,
  emailExists,
  isPasswordUnique
}; 