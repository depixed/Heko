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

    const { userId, referralCode } = await req.json()

    if (!userId || !referralCode) {
      return new Response(
        JSON.stringify({ success: false, error: 'User ID and referral code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate referral code format (4 alphanumeric characters)
    const codeRegex = /^[A-Z0-9]{4}$/
    if (!codeRegex.test(referralCode.toUpperCase())) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid referral code format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user already has a referrer
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('referred_by')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('Error fetching current profile:', profileError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to check current referrer status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!currentProfile) {
      return new Response(
        JSON.stringify({ success: false, error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (currentProfile.referred_by) {
      return new Response(
        JSON.stringify({ success: false, error: 'You already have a referrer. Cannot change or add a new one.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Lookup referrer by code
    const { data: referrer, error: referrerError } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('referral_code', referralCode.toUpperCase())
      .single()

    if (referrerError || !referrer) {
      return new Response(
        JSON.stringify({ success: false, error: 'Referral code not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate not self-referral
    if (referrer.id === userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot refer yourself' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update referred_by field
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        referred_by: referrer.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating referred_by:', updateError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to add referrer' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        referrer: {
          id: referrer.id,
          name: referrer.name,
        },
        user: {
          id: updatedProfile.id,
          referred_by: updatedProfile.referred_by,
        },
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

