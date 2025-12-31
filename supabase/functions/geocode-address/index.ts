import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address } = await req.json();

    if (!address || address.trim().length < 5) {
      return new Response(
        JSON.stringify({ error: 'Address is required and must be at least 5 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('GOOGLE_GEOCODING_API_KEY');
    if (!apiKey) {
      console.error('GOOGLE_GEOCODING_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Geocoding service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Geocoding address: ${address}`);

    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    console.log('Geocoding response status:', data.status);

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      const formattedAddress = data.results[0].formatted_address;

      console.log(`Geocoded successfully: ${location.lat}, ${location.lng}`);

      return new Response(
        JSON.stringify({
          latitude: location.lat,
          longitude: location.lng,
          formatted_address: formattedAddress,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (data.status === 'ZERO_RESULTS') {
      return new Response(
        JSON.stringify({ error: 'No results found for this address' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error('Geocoding API error:', data.status, data.error_message);
      return new Response(
        JSON.stringify({ error: `Geocoding failed: ${data.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in geocode-address function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
