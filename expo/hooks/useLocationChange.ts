import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';

interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

interface UseLocationChangeOptions {
  onLocationChange?: (location: LocationCoordinates) => void;
  minDistance?: number; // Minimum distance in meters to trigger change (default: 1000m = 1km)
  updateInterval?: number; // Update interval in milliseconds (default: 30000 = 30s)
  enabled?: boolean;
}

/**
 * Calculates distance between two coordinates in meters using Haversine formula
 */
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

/**
 * Hook to monitor location changes and trigger callback when user moves significantly
 */
export const useLocationChange = ({
  onLocationChange,
  minDistance = 1000, // 1km default
  updateInterval = 30000, // 30 seconds default
  enabled = true,
}: UseLocationChangeOptions = {}) => {
  const lastLocationRef = useRef<LocationCoordinates | null>(null);
  const watchSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const callbackRef = useRef(onLocationChange);

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = onLocationChange;
  }, [onLocationChange]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let mounted = true;

    const startWatching = async () => {
      try {
        // Request permissions
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('[LocationChange] Location permission not granted');
          return;
        }

        // Start watching position
        watchSubscriptionRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: updateInterval,
            distanceInterval: minDistance, // Only update when moved this distance
          },
          (location) => {
            if (!mounted) return;

            const newLocation: LocationCoordinates = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            };

            // Check if location changed significantly
            if (lastLocationRef.current) {
              const distance = calculateDistance(
                lastLocationRef.current.latitude,
                lastLocationRef.current.longitude,
                newLocation.latitude,
                newLocation.longitude
              );

              if (distance >= minDistance) {
                console.log(
                  `[LocationChange] Location changed significantly: ${distance.toFixed(0)}m`
                );
                lastLocationRef.current = newLocation;
                callbackRef.current?.(newLocation);
              }
            } else {
              // First location update
              lastLocationRef.current = newLocation;
              callbackRef.current?.(newLocation);
            }
          }
        );
      } catch (error) {
        console.error('[LocationChange] Error watching location:', error);
      }
    };

    startWatching();

    return () => {
      mounted = false;
      if (watchSubscriptionRef.current) {
        watchSubscriptionRef.current.remove();
      }
    };
  }, [enabled, minDistance, updateInterval]);
};

/**
 * Helper function to check if location has changed significantly
 */
export const hasMovedSignificantly = (
  oldLocation: LocationCoordinates | null,
  newLocation: LocationCoordinates,
  minDistance: number = 1000
): boolean => {
  if (!oldLocation) {
    return true; // First location is always significant
  }

  const distance = calculateDistance(
    oldLocation.latitude,
    oldLocation.longitude,
    newLocation.latitude,
    newLocation.longitude
  );

  return distance >= minDistance;
};

