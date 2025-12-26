import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

interface LocationState {
  city: string | null;
  area: string | null;
  latitude: number | null;
  longitude: number | null;
  isLoading: boolean;
  hasPermission: boolean;
  permissionStatus: Location.PermissionStatus | null;
}

export const [LocationProvider, useLocation] = createContextHook(() => {
  const [locationState, setLocationState] = useState<LocationState>({
    city: null,
    area: null,
    latitude: null,
    longitude: null,
    isLoading: true,
    hasPermission: false,
    permissionStatus: null,
  });

  useEffect(() => {
    let mounted = true;
    let watchSubscription: Location.LocationSubscription | null = null;

    const initializeLocation = async () => {
      try {
        // Request permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (!mounted) return;

        if (status !== 'granted') {
          console.log('[LocationContext] Permission denied');
          setLocationState(prev => ({
            ...prev,
            isLoading: false,
            hasPermission: false,
            permissionStatus: status,
          }));
          return;
        }

        console.log('[LocationContext] Permission granted, getting location');

        // Get current position
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (!mounted) return;

        console.log('[LocationContext] Got location:', location.coords);

        // Reverse geocode to get city and area
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (!mounted) return;

        if (reverseGeocode && reverseGeocode.length > 0) {
          const geocode = reverseGeocode[0];
          const city = geocode.city || geocode.subAdministrativeArea || geocode.region;
          const area = geocode.district || geocode.sublocality || geocode.street;
          
          console.log('[LocationContext] Reverse geocoded:', { city, area });

          setLocationState({
            city: city || null,
            area: area || null,
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            isLoading: false,
            hasPermission: true,
            permissionStatus: status,
          });

          // Watch for location changes (optional - updates when user moves)
          if (Platform.OS !== 'web') {
            watchSubscription = await Location.watchPositionAsync(
              {
                accuracy: Location.Accuracy.Balanced,
                timeInterval: 60000, // Update every minute
                distanceInterval: 500, // Or when moved 500m
              },
              async (newLocation) => {
                if (!mounted) return;

                try {
                  const newGeocode = await Location.reverseGeocodeAsync({
                    latitude: newLocation.coords.latitude,
                    longitude: newLocation.coords.longitude,
                  });

                  if (newGeocode && newGeocode.length > 0 && mounted) {
                    const geocode = newGeocode[0];
                    const city = geocode.city || geocode.subAdministrativeArea || geocode.region;
                    const area = geocode.district || geocode.sublocality || geocode.street;

                    setLocationState(prev => ({
                      ...prev,
                      city: city || prev.city,
                      area: area || prev.area,
                      latitude: newLocation.coords.latitude,
                      longitude: newLocation.coords.longitude,
                    }));
                  }
                } catch (error) {
                  console.warn('[LocationContext] Error updating location:', error);
                }
              }
            );
          }
        } else {
          setLocationState(prev => ({
            ...prev,
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            isLoading: false,
            hasPermission: true,
            permissionStatus: status,
          }));
        }
      } catch (error) {
        console.error('[LocationContext] Error initializing location:', error);
        if (mounted) {
          setLocationState(prev => ({
            ...prev,
            isLoading: false,
          }));
        }
      }
    };

    initializeLocation();

    return () => {
      mounted = false;
      if (watchSubscription) {
        watchSubscription.remove();
      }
    };
  }, []);

  const requestPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationState(prev => ({
        ...prev,
        hasPermission: status === 'granted',
        permissionStatus: status,
      }));
      return status === 'granted';
    } catch (error) {
      console.error('[LocationContext] Error requesting permission:', error);
      return false;
    }
  };

  return {
    ...locationState,
    requestPermission,
  };
});

