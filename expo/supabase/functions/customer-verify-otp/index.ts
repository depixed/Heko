import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Check for authorization header
    const authHeader = req.headers.get('authorization')
    const apiKey = req.headers.get('apikey')
    
    if (!authHeader && !apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    const { phone, otp } = await req.json()

    if (!phone || !otp) {
      return new Response(
        JSON.stringify({ success: false, error: 'Phone and OTP are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Format phone number (same logic as send-otp)
    let formattedPhone = phone;
    if (phone.startsWith('+')) {
      formattedPhone = phone.substring(1);
    }
    if (!formattedPhone.startsWith('91')) {
      formattedPhone = `91${formattedPhone}`;
    }
    const mobileNumber = formattedPhone.slice(-10);

    // Validate Indian mobile number
    if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid Indian mobile number format' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get MSG91 credentials
    const authKey = Deno.env.get('MSG91_AUTH_KEY')

    if (!authKey) {
      console.error('Missing MSG91 credentials')
      return new Response(
        JSON.stringify({ success: false, error: 'SMS service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify OTP using MSG91 API
    const msg91Url = 'https://control.msg91.com/api/v5/otp/verify';
    
    const msg91Response = await fetch(msg91Url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mobile: mobileNumber,
        otp: otp.toString(),
        authkey: authKey,
      }),
    })

    const msg91Result = await msg91Response.json()

    if (!msg91Response.ok || msg91Result.type !== 'success') {
      console.error('MSG91 Verify OTP error:', msg91Result)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: msg91Result.message || 'Invalid or expired OTP' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`OTP verified for ${mobileNumber}, type: ${msg91Result.type}`)

    // Store phone in E.164 format for database
    const phoneE164 = `+91${mobileNumber}`

    // Check if user exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone', phoneE164)
      .single()

    if (profileError || !profile) {
      // New user - need to complete signup
      return new Response(
        JSON.stringify({
          success: true,
          isNewUser: true,
          phone: phoneE164
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Existing user - create session and return user data
    const sessionToken = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30) // 30 days expiry

    const { error: sessionError } = await supabase
      .from('customer_sessions')
      .insert({
        user_id: profile.id,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString()
      })

    if (sessionError) {
      console.error('Error creating session:', sessionError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        isNewUser: false,
        sessionToken,
        user: {
          id: profile.id,
          name: profile.name,
          phone: profile.phone,
          email: profile.email,
          referral_code: profile.referral_code,
          referred_by: profile.referred_by,
          virtual_wallet: profile.virtual_wallet,
          actual_wallet: profile.actual_wallet,
          created_at: profile.created_at
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
