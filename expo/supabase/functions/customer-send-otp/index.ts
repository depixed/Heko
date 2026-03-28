import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone } = await req.json();
    
    if (!phone) {
      return new Response(
        JSON.stringify({ success: false, error: 'Phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format phone number for MSG91 (Indian numbers: 10 digits starting with 6-9)
    let formattedPhone = phone;
    
    // Remove + if present
    if (phone.startsWith('+')) {
      formattedPhone = phone.substring(1);
    }
    
    // If starts with 91, keep it; otherwise add 91
    if (!formattedPhone.startsWith('91')) {
      formattedPhone = `91${formattedPhone}`;
    }
    
    // Extract last 10 digits for validation
    const mobileNumber = formattedPhone.slice(-10);
    
    // Validate Indian mobile number (starts with 6-9, 10 digits)
    if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid Indian mobile number. Must be 10 digits starting with 6-9.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get MSG91 credentials
    const authKey = Deno.env.get('MSG91_AUTH_KEY');
    const templateId = Deno.env.get('MSG91_TEMPLATE_ID'); // Optional
    const senderId = Deno.env.get('MSG91_SENDER_ID'); // Optional (6 characters)

    if (!authKey) {
      console.error('Missing MSG91 credentials');
      return new Response(
        JSON.stringify({ success: false, error: 'SMS service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // MSG91 API requires full phone number with country code (91XXXXXXXXXX)
    // Use the formatted phone with country code, not just 10 digits
    const fullPhoneNumber = formattedPhone; // e.g., "919876543210"

    console.log('Sending OTP via MSG91:', {
      mobile: fullPhoneNumber,
      authKey: authKey ? `${authKey.substring(0, 10)}...` : 'missing',
      templateId: templateId || 'not set',
      senderId: senderId || 'not set',
    });

    // MSG91 API endpoint - Try multiple formats
    // Format 1: authkey in URL (most common)
    let msg91Url = `https://control.msg91.com/api/v5/otp?authkey=${encodeURIComponent(authKey)}`;
    
    // Prepare request body - MSG91 accepts JSON with mobile number
    // MSG91 requires full phone number with country code (91XXXXXXXXXX)
    const requestBody: Record<string, string> = {
      mobile: fullPhoneNumber, // Full number with country code: "919876543210"
      authkey: authKey, // Also include in body (some MSG91 endpoints require this)
    };

    // Add optional parameters
    if (templateId) {
      requestBody.template_id = templateId;
    }
    if (senderId) {
      requestBody.sender = senderId;
    }

    console.log('MSG91 API Request:', {
      url: msg91Url.replace(authKey, '***'),
      method: 'POST',
      body: { ...requestBody, authkey: '***' },
    });

    // Send OTP via MSG91 - Try with authkey in both URL and body
    let response = await fetch(msg91Url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    // If first attempt fails, try alternative format (authkey only in body)
    if (!response.ok) {
      console.log('First attempt failed, trying alternative format...');
      msg91Url = 'https://control.msg91.com/api/v5/otp';
      response = await fetch(msg91Url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
    }

    const responseText = await response.text();
    console.log('MSG91 API Response Status:', response.status);
    console.log('MSG91 API Response:', responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse MSG91 response:', parseError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Invalid response from MSG91: ${responseText.substring(0, 200)}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // MSG91 API can return different response formats
    // Check for success indicators
    const isSuccess = result.type === 'success' || 
                     result.message === 'OTP sent successfully' ||
                     result.request_id ||
                     (response.ok && !result.error);

    // Check for specific error conditions
    if (result.error || result.message?.toLowerCase().includes('blocked') || result.message?.toLowerCase().includes('country')) {
      console.error('MSG91 Send OTP error - Possible country code block:', {
        status: response.status,
        response: result,
        fullResponse: responseText,
      });
      
      // Provide helpful error message for country code blocking
      let errorMessage = result.message || result.error || 'Failed to send OTP';
      if (errorMessage.toLowerCase().includes('blocked') || errorMessage.toLowerCase().includes('country')) {
        errorMessage = 'Country code is blocked in MSG91 account. Please unblock country code 91 (India) in MSG91 dashboard → Settings → Limit Communication.';
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage,
          details: result,
          help: 'Check MSG91 dashboard → Settings → Limit Communication to unblock country code 91'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isSuccess) {
      console.error('MSG91 Send OTP error:', {
        status: response.status,
        response: result,
        fullResponse: responseText,
      });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.message || result.error || 'Failed to send OTP',
          details: result
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`OTP sent successfully to ${fullPhoneNumber}`, {
      requestId: result.request_id,
      type: result.type,
      message: result.message,
    });
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'OTP sent successfully',
        requestId: result.request_id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in customer-send-otp:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
