import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Password validation regex: min 8 chars, 1 uppercase, 1 lowercase, 1 number
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/;

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone validation regex (E.164 format)
const phoneRegex = /^\+?[1-9]\d{1,14}$/;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, name, email, password, referredBy } = await req.json();
    
    // Validate required fields
    if (!phone) {
      return new Response(
        JSON.stringify({ success: false, error: 'Phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!name) {
      return new Response(
        JSON.stringify({ success: false, error: 'Name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Password is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate phone format
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/^0+/, '')}`;
    if (!phoneRegex.test(formattedPhone)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid phone number format', invalidPhone: true }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid email format', invalidEmail: true }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate password policy
    if (!passwordRegex.test(password)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Password must be 8-128 characters with at least 1 uppercase, 1 lowercase, and 1 number',
          invalidPassword: true 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if phone already exists
    const { data: existingPhone } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', formattedPhone)
      .single();

    if (existingPhone) {
      return new Response(
        JSON.stringify({ success: false, error: 'Phone number already registered', phoneExists: true }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if email already exists
    const { data: existingEmail } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (existingEmail) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email already registered', emailExists: true }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password);

    // Generate 4-character alphanumeric referral code
    const referralCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    const profileId = crypto.randomUUID();

    // Create profile with password
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: profileId,
        name: name.trim(),
        phone: formattedPhone,
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        password_set_at: new Date().toISOString(),
        referral_code: referralCode,
        referred_by: referredBy || null,
        status: 'active',
      })
      .select()
      .single();

    if (profileError || !profile) {
      console.error('Error creating profile:', profileError);
      return new Response(
        JSON.stringify({ success: false, error: profileError?.message || 'Failed to create user profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Assign customer role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: profile.id,
        role: 'customer',
      });

    if (roleError) {
      console.error('Error assigning role:', roleError);
    }

    // Generate session token
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await supabase
      .from('customer_sessions')
      .insert({
        user_id: profile.id,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
      });

    // Remove password_hash from response
    const { password_hash, ...userWithoutPassword } = profile;

    console.log('Customer signup successful:', { phone: formattedPhone, email: email.toLowerCase().trim() });

    return new Response(
      JSON.stringify({ 
        success: true,
        sessionToken,
        user: userWithoutPassword
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in customer-signup:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
