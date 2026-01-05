import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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

    const { phone, password } = await req.json()

    if (!phone || !password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Phone and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Format phone number
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`

    // Check if user exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone', formattedPhone)
      .single()

    if (profileError || !profile) {
      // Phone not registered
      return new Response(
        JSON.stringify({
          success: false,
          phoneNotRegistered: true,
          error: 'This phone number is not registered. Please sign up first.'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user has set a password
    if (!profile.password_hash) {
      // User exists but hasn't set a password yet (existing user from OTP-only era)
      return new Response(
        JSON.stringify({
          success: false,
          needsPassword: true,
          userId: profile.id,
          error: 'This account needs a password. Please use OTP login or set up a password.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, profile.password_hash)

    if (!passwordMatch) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid password. Please try again.'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create session token
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

