import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get query params
    const url = new URL(req.url);
    const lat = parseFloat(url.searchParams.get('lat') || '0');
    const lng = parseFloat(url.searchParams.get('lng') || '0');
    const appVersion = url.searchParams.get('app_version') || '1.0.0';
    const city = url.searchParams.get('city') || '';
    // Fixed: Use 'is_logged_in' to match client code
    const isLoggedIn = url.searchParams.get('is_logged_in') === 'true';
    const userId = url.searchParams.get('user_id') || null;

    console.log('Fetching banners with params:', { lat, lng, appVersion, city, isLoggedIn, userId });

    const now = new Date().toISOString();

    // Build query - fetch all active banners, then filter by date in JavaScript
    // This is more reliable than trying to use complex OR conditions in Supabase query builder
    let query = supabase
      .from('banners')
      .select('*')
      .eq('active', true)
      .order('priority', { ascending: false })
      .order('display_order', { ascending: true });

    const { data: banners, error } = await query;

    if (error) {
      console.error('Error fetching banners:', error);
      throw error;
    }

    console.log(`Found ${banners?.length || 0} active banners before filtering`);

    // Filter banners by date range (more reliable than SQL OR conditions)
    // A banner is valid if:
    // - start_date is null OR start_date <= now (banner has started)
    // - end_date is null OR end_date >= now (banner hasn't ended)
    const nowDate = new Date(now);
    const dateFilteredBanners = (banners || []).filter(banner => {
      const startDate = banner.start_date ? new Date(banner.start_date) : null;
      const endDate = banner.end_date ? new Date(banner.end_date) : null;
      
      // Check if banner has started
      const hasStarted = !startDate || startDate <= nowDate;
      
      // Check if banner hasn't ended
      const hasntEnded = !endDate || endDate >= nowDate;
      
      const isValid = hasStarted && hasntEnded;
      
      if (!isValid) {
        console.log(`Banner ${banner.id} filtered by date:`, {
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
          now: nowDate.toISOString(),
          hasStarted,
          hasntEnded,
        });
      }
      
      return isValid;
    });

    console.log(`${dateFilteredBanners.length} banners after date filtering`);

    // Helper: Compare semantic versions
    const compareVersions = (v1: string, v2: string): number => {
      const parts1 = v1.split('.').map(Number);
      const parts2 = v2.split('.').map(Number);
      for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;
        if (p1 > p2) return 1;
        if (p1 < p2) return -1;
      }
      return 0;
    };

    // Helper: Calculate distance between two points (Haversine formula)
    const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    // Get user segments if logged in
    let userSegments: string[] = [];
    if (isLoggedIn && userId) {
      // Query user's order count to determine segments
      const { data: orders } = await supabase
        .from('orders')
        .select('id, created_at')
        .eq('user_id', userId);

      const orderCount = orders?.length || 0;
      const recentOrders = orders?.filter(o => {
        const createdAt = new Date(o.created_at);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return createdAt > thirtyDaysAgo;
      }).length || 0;

      if (orderCount === 0) userSegments.push('new_user');
      if (recentOrders < 3) userSegments.push('low_orders_30d');
      if (orderCount >= 10) userSegments.push('loyal_customer');
    }

    // Filter banners based on visibility rules (using date-filtered banners)
    const filteredBanners = dateFilteredBanners.filter(banner => {
      const visibility = banner.visibility as any || {};

      // Check app version
      if (visibility.min_app_version && compareVersions(appVersion, visibility.min_app_version) < 0) {
        console.log(`Banner ${banner.id} filtered: app version too old`);
        return false;
      }

      // Check logged in requirement
      if (visibility.logged_in_only && !isLoggedIn) {
        console.log(`Banner ${banner.id} filtered: requires logged in user`);
        return false;
      }

      // Check city filter
      if (visibility.cities && visibility.cities.length > 0) {
        if (!city || !visibility.cities.some((c: string) => c.toLowerCase() === city.toLowerCase())) {
          console.log(`Banner ${banner.id} filtered: city mismatch`);
          return false;
        }
      }

      // Check geo radius (if lat/lng provided and banner has specific location requirements)
      if (visibility.radius_km && lat && lng) {
        // For now, we'll skip geo-checking unless we have vendor locations
        // This would require checking if any vendors within radius can serve
      }

      // Check user segments
      if (visibility.user_segments && visibility.user_segments.length > 0) {
        const hasMatchingSegment = visibility.user_segments.some((seg: string) => 
          userSegments.includes(seg)
        );
        if (!hasMatchingSegment) {
          console.log(`Banner ${banner.id} filtered: user segment mismatch`);
          return false;
        }
      }

      return true;
    });

    console.log(`${filteredBanners.length} banners after filtering`);

    // Format response according to spec
    const response = {
      placement: 'home_hero',
      version: 1,
      banners: filteredBanners.map(banner => ({
        id: banner.id,
        title: banner.title,
        subtitle: banner.subtitle,
        image_url: banner.image,
        priority: banner.priority || 0,
        start_at: banner.start_date,
        end_at: banner.end_date,
        deeplink: banner.deeplink || `heko://${banner.action_type}?${banner.action_value}`,
        action_type: banner.action_type,
        action_value: banner.action_value,
      })),
      ttl_seconds: 900,
    };

    // Generate ETag based on content hash
    const responseBody = JSON.stringify(response);
    const encoder = new TextEncoder();
    const data = encoder.encode(responseBody);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const etag = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);

    // Check If-None-Match header
    const ifNoneMatch = req.headers.get('If-None-Match');
    if (ifNoneMatch === etag) {
      console.log('ETag match - returning 304 Not Modified');
      return new Response(null, {
        status: 304,
        headers: {
          ...corsHeaders,
          'ETag': etag,
          'Cache-Control': 'max-age=900, must-revalidate',
        },
      });
    }

    return new Response(responseBody, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Cache-Control': 'max-age=900, must-revalidate',
        'ETag': etag,
      },
    });
  } catch (error) {
    console.error('Error in get-banners function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

