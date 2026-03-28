import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || '' } },
    });

    const url = new URL(req.url);
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');

    // Get banner analytics
    const { data: banners, error: bannersError } = await supabase
      .from('banners')
      .select('id, title, image, active, created_at');

    if (bannersError) throw bannersError;

    // Build date filter
    let impressionsQuery = supabase.from('banner_impressions').select('banner_id, created_at');
    let clicksQuery = supabase.from('banner_clicks').select('banner_id, created_at');

    if (startDate) {
      impressionsQuery = impressionsQuery.gte('created_at', startDate);
      clicksQuery = clicksQuery.gte('created_at', startDate);
    }
    if (endDate) {
      impressionsQuery = impressionsQuery.lte('created_at', endDate);
      clicksQuery = clicksQuery.lte('created_at', endDate);
    }

    const { data: impressions, error: impressionsError } = await impressionsQuery;
    const { data: clicks, error: clicksError } = await clicksQuery;

    if (impressionsError) throw impressionsError;
    if (clicksError) throw clicksError;

    // Aggregate data
    const analytics = banners.map(banner => {
      const bannerImpressions = impressions?.filter(i => i.banner_id === banner.id) || [];
      const bannerClicks = clicks?.filter(c => c.banner_id === banner.id) || [];
      
      const impressionCount = bannerImpressions.length;
      const clickCount = bannerClicks.length;
      const ctr = impressionCount > 0 ? (clickCount / impressionCount) * 100 : 0;

      return {
        ...banner,
        impressions: impressionCount,
        clicks: clickCount,
        ctr: Number(ctr.toFixed(2)),
      };
    });

    // Sort by impressions descending
    analytics.sort((a, b) => b.impressions - a.impressions);

    return new Response(
      JSON.stringify({ analytics }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

