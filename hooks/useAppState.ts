import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';

type AppStateCallback = (state: AppStateStatus) => void;

/**
 * Hook to monitor app state changes (foreground/background)
 */
export const useAppState = (callback: AppStateCallback) => {
  const callbackRef = useRef<AppStateCallback>(callback);

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      callbackRef.current(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, []);
};

