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
 */
export const useGeolocation = () => {
  const [state, setState] = useState<GeolocationState>({
    permissionStatus: 'prompt',
    currentLocation: null,
    isLoading: true,
    error: null,
  });

  // A stable function to fetch the location, with optional callbacks for success and error.
  const fetchLocation = useCallback(
    (
      onSuccess?: (loc: LocationInfo) => void,
      onError?: (err: GeolocationPositionError) => void
    ) => {
      setState((prevState) => ({ ...prevState, isLoading: true, error: null }));
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: LocationInfo = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setState((prevState) => ({
            ...prevState,
            currentLocation: loc,
            isLoading: false,
          }));
          onSuccess?.(loc);
        },
        (geoError) => {
          setState((prevState) => ({
            ...prevState,
            error: geoError,
            isLoading: false,
          }));
          onError?.(geoError);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    },
    []
  );

  // Effect to handle permission status changes and initial load.
  useEffect(() => {
    let permissionStatusRef: PermissionStatus;

    const handlePermissionChange = () => {
      setState((prevState) => ({ ...prevState, permissionStatus: permissionStatusRef.state }));
      if (permissionStatusRef.state === 'granted') {
        fetchLocation();
      } else {
        // Stop loading if permission is denied or reset to prompt
        setState((prevState) => ({ ...prevState, isLoading: false }));
      }
    };

    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((status) => {
        permissionStatusRef = status;
        setState((prevState) => ({ ...prevState, permissionStatus: status.state }));
        if (status.state === 'granted') {
          fetchLocation();
        } else {
          // If permission is not granted, we are not loading the location initially.
          setState((prevState) => ({ ...prevState, isLoading: false }));
        }
        status.onchange = handlePermissionChange;
      }).catch(() => {
        // If query fails, assume prompt and stop loading.
        setState((prevState) => ({ ...prevState, permissionStatus: 'prompt', isLoading: false }));
      });
    } else {
      // Fallback for older browsers.
      setState((prevState) => ({ ...prevState, permissionStatus: 'prompt', isLoading: false }));
    }

    // Cleanup function
    return () => {
      if (permissionStatusRef) {
        permissionStatusRef.onchange = null;
      }
    };
  }, [fetchLocation]);

  return { ...state, fetchLocation };
};
