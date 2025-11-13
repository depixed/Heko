import { Platform } from 'react-native';
import * as Location from 'expo-location';
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAddresses } from '@/contexts/AddressContext';
import { APP_CONFIG } from '@/constants/config';
import type { BannerParams } from '@/lib/bannerService';
import type { User } from '@/types';
import type { Address } from '@/types';

/**
 * Gets user context for personalized banner targeting
 * This is a standalone function that can be called outside React components
 */
export const getUserContext = async (
  user: User | null,
  defaultAddress: Address | null
): Promise<BannerParams> => {

  // Get location from device GPS (if available and permitted)
  let location: Location.LocationObject | null = null;
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
    }
  } catch (error) {
    console.warn('[UserContext] Error getting device location:', error);
  }

  // Use provided default address

  // Determine city
  let city: string | undefined;
  if (user && (user as any).city) {
    city = (user as any).city;
  } else if (defaultAddress?.city) {
    city = defaultAddress.city;
  } else if (location) {
    // Reverse geocode to get city from coordinates
    try {
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      if (reverseGeocode && reverseGeocode.length > 0) {
        city = reverseGeocode[0].city || reverseGeocode[0].subAdministrativeArea;
      }
    } catch (error) {
      console.warn('[UserContext] Error reverse geocoding:', error);
    }
  }

  // Determine coordinates (prefer device GPS, fallback to address)
  let lat: number | undefined;
  let lng: number | undefined;

  if (location) {
    lat = location.coords.latitude;
    lng = location.coords.longitude;
  } else if (defaultAddress?.lat && defaultAddress?.lng) {
    lat = defaultAddress.lat;
    lng = defaultAddress.lng;
  }

  return {
    lat,
    lng,
    appVersion: APP_CONFIG.APP_VERSION,
    city,
    isLoggedIn: !!user,
    userId: user?.id,
  };
};

/**
 * Hook version for use in React components
 */
export const useUserContext = (): BannerParams => {
  const { user } = useAuth();
  const { getDefaultAddress } = useAddresses();
  const [location, setLocation] = React.useState<Location.LocationObject | null>(null);
  const [city, setCity] = React.useState<string | undefined>();

  const defaultAddress = getDefaultAddress();

  React.useEffect(() => {
    let mounted = true;

    const loadContext = async () => {
      // Get device location
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted' && mounted) {
          const currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (mounted) {
            setLocation(currentLocation);

            // Reverse geocode to get city if not available
            if (!city && !defaultAddress?.city && !(user && (user as any).city)) {
              try {
                const reverseGeocode = await Location.reverseGeocodeAsync({
                  latitude: currentLocation.coords.latitude,
                  longitude: currentLocation.coords.longitude,
                });
                if (reverseGeocode && reverseGeocode.length > 0 && mounted) {
                  const determinedCity =
                    reverseGeocode[0].city || reverseGeocode[0].subAdministrativeArea;
                  setCity(determinedCity);
                }
              } catch (error) {
                console.warn('[UserContext] Error reverse geocoding:', error);
              }
            }
          }
        }
      } catch (error) {
        console.warn('[UserContext] Error getting device location:', error);
      }
    };

    loadContext();

    return () => {
      mounted = false;
    };
  }, [user, defaultAddress, city]);

  // Determine coordinates
  let lat: number | undefined;
  let lng: number | undefined;

  if (location) {
    lat = location.coords.latitude;
    lng = location.coords.longitude;
  } else if (defaultAddress?.lat && defaultAddress?.lng) {
    lat = defaultAddress.lat;
    lng = defaultAddress.lng;
  }

  // Determine city (priority: user.city > address.city > reverse geocoded city)
  let finalCity = city;
  if (!finalCity) {
    if (user && (user as any).city) {
      finalCity = (user as any).city;
    } else if (defaultAddress?.city) {
      finalCity = defaultAddress.city;
    }
  }

  return {
    lat,
    lng,
    appVersion: APP_CONFIG.APP_VERSION,
    city: finalCity,
    isLoggedIn: !!user,
    userId: user?.id,
  };
};

