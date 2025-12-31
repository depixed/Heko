import { supabase } from './supabase';

interface GeocodeResult {
  lat: number;
  lng: number;
}

export const geocodingService = {
  /**
   * Geocode an address string to get latitude and longitude
   * Uses Supabase Edge Function to keep API key secure
   * @param address - Full address string to geocode
   * @returns Promise with lat/lng or null if geocoding fails
   */
  async geocodeAddress(address: string): Promise<GeocodeResult | null> {
    try {
      if (!address || address.trim() === '') {
        console.error('[Geocoding] Empty address provided');
        return null;
      }

      console.log('[Geocoding] Geocoding address:', address);

      // Call the edge function
      const { data, error } = await supabase.functions.invoke('geocode-address', {
        body: { address: address.trim() },
      });

      if (error) {
        console.error('[Geocoding] Edge function error:', error);
        return null;
      }

      // Check if we got an error response from the function
      if (!data || data.error) {
        console.error('[Geocoding] Geocoding failed:', data?.error || 'Unknown error');
        return null;
      }

      // Check if we got valid coordinates
      if (!data.latitude || !data.longitude) {
        console.error('[Geocoding] Invalid response from geocoding service');
        return null;
      }

      console.log('[Geocoding] Success:', { lat: data.latitude, lng: data.longitude });

      return {
        lat: data.latitude,
        lng: data.longitude,
      };
    } catch (error) {
      console.error('[Geocoding] Error geocoding address:', error);
      return null;
    }
  },

  /**
   * Build a full address string from address components
   */
  buildAddressString(address: {
    flat: string;
    area?: string;
    landmark?: string;
    city: string;
    state: string;
    pincode: string;
  }): string {
    const parts: string[] = [];

    if (address.flat) parts.push(address.flat);
    if (address.area) parts.push(address.area);
    if (address.landmark) parts.push(address.landmark);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.pincode) parts.push(address.pincode);

    return parts.join(', ');
  },
};

