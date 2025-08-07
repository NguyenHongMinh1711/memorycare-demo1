import { useState, useEffect, useCallback } from 'react';
import { LocationInfo } from '../types';

interface GeolocationState {
  permissionStatus: PermissionState;
  currentLocation: LocationInfo | null;
  isLoading: boolean;
  error: GeolocationPositionError | null;
}

/**
 * A custom hook to manage geolocation, including permissions and fetching the user's current location.
 * This version is improved for robustness and state consistency.
 */
export const useGeolocation = () => {
  const [state, setState] = useState<GeolocationState>({
    permissionStatus: 'prompt',
    currentLocation: null,
    isLoading: true, // Start as loading until permission is determined
    error: null,
  });

  const fetchLocation = useCallback(
    (
      onSuccess?: (loc: LocationInfo) => void,
      onError?: (err: GeolocationPositionError) => void
    ) => {
      setState((s) => ({ ...s, isLoading: true, error: null }));

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: LocationInfo = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setState((s) => ({ ...s, currentLocation: loc, isLoading: false, error: null }));
          onSuccess?.(loc);
        },
        (geoError) => {
          setState((s) => ({ ...s, error: geoError, isLoading: false }));
          onError?.(geoError);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    },
    []
  );

  useEffect(() => {
    if (!navigator.permissions) {
      // Fallback for older browsers. Assumes permission needs to be prompted.
      // Can't know for sure, but it's a safe bet. Stop loading.
      setState((s) => ({ ...s, permissionStatus: 'prompt', isLoading: false }));
      return;
    }

    let permissionStatusRef: PermissionStatus;
    
    const handlePermissionChange = () => {
        const newStatus = permissionStatusRef.state;
        if (newStatus === 'granted') {
            setState(s => ({ ...s, permissionStatus: newStatus }));
            fetchLocation();
        } else {
            // If denied or prompt, stop loading and clear location data.
            setState(s => ({ ...s, permissionStatus: newStatus, isLoading: false, currentLocation: null }));
        }
    };

    navigator.permissions.query({ name: 'geolocation' }).then((status) => {
        permissionStatusRef = status;
        const initialStatus = status.state;
        
        if (initialStatus === 'granted') {
            setState(s => ({ ...s, permissionStatus: initialStatus }));
            fetchLocation();
        } else {
            // Not granted initially, so we stop loading.
            setState(s => ({ ...s, permissionStatus: initialStatus, isLoading: false }));
        }
        
        status.onchange = handlePermissionChange;
    }).catch(() => {
        // If query fails, assume 'prompt' and stop loading.
        setState((s) => ({ ...s, permissionStatus: 'prompt', isLoading: false }));
    });
    
    return () => {
      if (permissionStatusRef) {
        permissionStatusRef.onchange = null;
      }
    };
  }, [fetchLocation]);

  return { ...state, fetchLocation };
};
