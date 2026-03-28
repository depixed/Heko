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

    const { phone, otp, newPassword } = await req.json()

    if (!phone || !otp || !newPassword) {
      return new Response(
        JSON.stringify({ success: false, error: 'Phone, OTP, and new password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Format phone number
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`

    // Verify OTP
    const { data: otpData, error: otpError } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('phone', formattedPhone)
      .eq('otp', otp)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (otpError || !otpData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired OTP' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Mark OTP as verified
    await supabase
      .from('otp_verifications')
      .update({ verified: true })
      .eq('id', otpData.id)

    // Check if user exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone', formattedPhone)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Phone number not registered'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate password (basic validation - frontend should also validate)
    if (newPassword.length < 8) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Password must be at least 8 characters long'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword)

    // Update profile with new password
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        password_hash: passwordHash,
        last_password_change: new Date().toISOString(),
        password_set_at: profile.password_set_at || new Date().toISOString(), // Set if first time
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)

    if (updateError) {
      console.error('Error updating password:', updateError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update password' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Password reset successfully'
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

