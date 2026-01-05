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

    const { userId, password } = await req.json()

    if (!userId || !password) {
      return new Response(
        JSON.stringify({ success: false, error: 'User ID and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'User not found'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate password (basic validation - frontend should also validate)
    if (password.length < 8) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Password must be at least 8 characters long'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password)

    // Update profile with password
    const now = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        password_hash: passwordHash,
        password_set_at: now,
        last_password_change: now,
        updated_at: now
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Error setting password:', updateError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to set password' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Password set successfully'
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

