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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    const { phone } = await req.json()

    if (!phone) {
      return new Response(
        JSON.stringify({ success: false, error: 'Phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    
    // Store OTP in database with 10 minute expiry
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 10)

    const { error } = await supabase
      .from('otp_verifications')
      .insert({
        phone,
        otp,
        expires_at: expiresAt.toISOString(),
        verified: false
      })

    if (error) {
      console.error('Error storing OTP:', error)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to generate OTP' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // TODO: In production, integrate with SMS provider (Twilio, AWS SNS, etc.)
    // await sendSMS(phone, `Your HEKO verification code is: ${otp}`)

    console.log(`OTP for ${phone}: ${otp}`)

    // In development, return OTP in response
    // REMOVE THIS IN PRODUCTION
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'OTP sent successfully',
        otp: otp // Remove this in production
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
