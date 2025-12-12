/**
 * Geolocation utilities for calculating distances and finding nearest vendors
 */

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 Latitude of first point
 * @param lng1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lng2 Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateHaversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

/**
 * Vendor with distance information
 */
export interface VendorWithDistance {
  id: string;
  name: string;
  business_name: string;
  distance: number;
  effectiveRadius: number;
}

/**
 * Find the nearest eligible vendor for a given address
 * @param addressLat Customer address latitude
 * @param addressLng Customer address longitude
 * @param vendors Array of vendors with location data
 * @param systemServiceRadius Fallback service radius if vendor doesn't have one
 * @returns Nearest vendor with distance, or null if no eligible vendor found
 */
export function findNearestVendor(
  addressLat: number,
  addressLng: number,
  vendors: Array<{
    id: string;
    name: string;
    business_name?: string;
    latitude: number;
    longitude: number;
    service_radius?: number | null;
    is_active?: boolean;
    status?: string;
  }>,
  systemServiceRadius: number = 5.0
): VendorWithDistance | null {
  const eligibleVendors: VendorWithDistance[] = [];
  
  for (const vendor of vendors) {
    // Check if vendor is active
    const isActive = vendor.is_active !== false && vendor.status !== 'inactive';
    if (!isActive) continue;
    
    // Check if vendor has location data
    if (!vendor.latitude || !vendor.longitude) continue;
    
    // Calculate distance
    const distance = calculateHaversineDistance(
      addressLat,
      addressLng,
      vendor.latitude,
      vendor.longitude
    );
    
    // Use vendor's service radius or fallback to system default
    const effectiveRadius = vendor.service_radius || systemServiceRadius;
    
    // Check if vendor is within service radius
    if (distance <= effectiveRadius) {
      eligibleVendors.push({
        id: vendor.id,
        name: vendor.name,
        business_name: vendor.business_name || vendor.name,
        distance,
        effectiveRadius,
      });
    }
  }
  
  if (eligibleVendors.length === 0) {
    return null;
  }
  
  // Sort by distance and return nearest
  eligibleVendors.sort((a, b) => a.distance - b.distance);
  return eligibleVendors[0];
}

/**
 * Check if a vendor is eligible to serve an address
 * @param vendor Vendor with location data
 * @param addressLat Customer address latitude
 * @param addressLng Customer address longitude
 * @param systemServiceRadius Fallback service radius
 * @returns true if vendor can serve the address
 */
export function isVendorEligible(
  vendor: {
    latitude?: number | null;
    longitude?: number | null;
    service_radius?: number | null;
    is_active?: boolean;
    status?: string;
  },
  addressLat: number,
  addressLng: number,
  systemServiceRadius: number = 5.0
): boolean {
  // Check if vendor is active
  const isActive = vendor.is_active !== false && vendor.status !== 'inactive';
  if (!isActive) return false;
  
  // Check if vendor has location data
  if (!vendor.latitude || !vendor.longitude) return false;
  
  // Calculate distance
  const distance = calculateHaversineDistance(
    addressLat,
    addressLng,
    vendor.latitude,
    vendor.longitude
  );
  
  // Check if within service radius
  const effectiveRadius = vendor.service_radius || systemServiceRadius;
  return distance <= effectiveRadius;
}
