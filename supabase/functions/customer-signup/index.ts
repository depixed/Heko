import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

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

    const { phone, name, email, referredBy } = await req.json()

    if (!phone || !name) {
      return new Response(
        JSON.stringify({ success: false, error: 'Phone and name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate 4-digit alphanumeric referral code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let referralCode = ''
    for (let i = 0; i < 4; i++) {
      referralCode += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    
    // Generate UUID for profile
    const profileId = crypto.randomUUID()

    // Validate referral code if provided
    let referrerId = null
    if (referredBy) {
      const { data: referrer } = await supabase
        .from('profiles')
        .select('id')
        .eq('referral_code', referredBy)
        .single()
      
      if (referrer) {
        referrerId = referrer.id
      }
    }

    // Create profile with explicit ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: profileId,
        phone,
        name,
        email: email || null,
        referral_code: referralCode,
        referred_by: referrerId,
        virtual_wallet: 0,
        actual_wallet: 0,
        status: 'active'
      })
      .select()
      .single()

    if (profileError) {
      console.error('Error creating profile:', profileError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create user_role entry
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: profileId,
        role: 'user'
      })

    if (roleError) {
      console.error('Error creating user role:', roleError)
      // Don't fail the whole operation if role creation fails
    }

    // Create session token
    const sessionToken = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30) // 30 days expiry

    const { error: sessionError } = await supabase
      .from('customer_sessions')
      .insert({
        user_id: profileId,
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

    // Award referral bonus if applicable
    if (referrerId) {
      const REFERRAL_BONUS = 50 // ₹50 bonus
      
      await supabase
        .from('profiles')
        .update({
          virtual_wallet: supabase.rpc('increment_wallet', { amount: REFERRAL_BONUS })
        })
        .eq('id', referrerId)

      // Create wallet transaction for referrer
      await supabase
        .from('wallet_transactions')
        .insert({
          user_id: referrerId,
          amount: REFERRAL_BONUS,
          type: 'credit',
          wallet_type: 'virtual',
          description: `Referral bonus for inviting ${name}`,
          status: 'completed'
        })

      // Create wallet transaction for new user
      await supabase
        .from('wallet_transactions')
        .insert({
          user_id: profileId,
          amount: REFERRAL_BONUS,
          type: 'credit',
          wallet_type: 'virtual',
          description: `Welcome bonus for using referral code ${referredBy}`,
          status: 'completed'
        })

      // Update new user's wallet
      await supabase
        .from('profiles')
        .update({
          virtual_wallet: REFERRAL_BONUS
        })
        .eq('id', profileId)

      profile.virtual_wallet = REFERRAL_BONUS
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
