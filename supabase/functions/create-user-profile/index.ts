import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the request body
    const { user } = await req.json()

    if (!user) {
      throw new Error('No user data provided')
    }

    console.log('🔍 Processing user profile creation for:', user.email)
    console.log('📊 User metadata:', JSON.stringify(user.user_metadata, null, 2))

    // Extract name information from Google OAuth metadata
    let firstName = '';
    let lastName = '';
    let fullName = '';

    // Google OAuth provides different field names
    if (user.user_metadata) {
      const metadata = user.user_metadata;
      
      // Try different Google OAuth field names
      if (metadata.given_name && metadata.family_name) {
        // Google OAuth standard fields
        firstName = metadata.given_name;
        lastName = metadata.family_name;
        fullName = `${firstName} ${lastName}`;
      } else if (metadata.full_name) {
        // If only full_name is available, try to split it
        const nameParts = metadata.full_name.trim().split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
        fullName = metadata.full_name;
      } else if (metadata.first_name && metadata.last_name) {
        // Fallback to existing fields
        firstName = metadata.first_name;
        lastName = metadata.last_name;
        fullName = `${firstName} ${lastName}`;
      } else if (metadata.name) {
        // Another common Google field
        const nameParts = metadata.name.trim().split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
        fullName = metadata.name;
      }
    }

    // If we still don't have names, try to extract from email
    if (!firstName && !lastName && user.email) {
      const emailPrefix = user.email.split('@')[0];
      const nameParts = emailPrefix.replace(/[._-]/g, ' ').split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
      fullName = `${firstName} ${lastName}`.trim();
    }

    console.log('✅ Extracted names:', { firstName, lastName, fullName });

    // Update user metadata with properly formatted names
    const updatedMetadata = {
      ...user.user_metadata,
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      name_extracted_from_oauth: true,
      oauth_provider: user.app_metadata?.provider || 'unknown'
    };

    // Update the user's metadata in Supabase Auth
    const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: updatedMetadata
      }
    );

    if (updateError) {
      console.error('❌ Error updating user metadata:', updateError);
      throw updateError;
    }

    console.log('✅ Updated user metadata successfully');

    // Create or update user profile in user_profiles table
    const { error: profileError } = await supabaseClient
      .from('user_profiles')
      .upsert({
        user_id: user.id,
        email: user.email,
        first_name: firstName,
        last_name: lastName,
        display_name: fullName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (profileError) {
      console.error('❌ Error creating/updating user profile:', profileError);
      // Don't throw here, the auth update was successful
    } else {
      console.log('✅ User profile created/updated successfully');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User profile processed successfully',
        extractedNames: { firstName, lastName, fullName }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ Error in create-user-profile function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
