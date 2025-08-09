
import { useState, useEffect, useCallback, useRef } from 'react';
import { LocationInfo } from '../types';

interface GeolocationState {
  permissionStatus: PermissionState;
  currentLocation: LocationInfo | null;
  isLoading: boolean;
  error: GeolocationPositionError | null;
}

export const useGeolocation = () => {
  const [state, setState] = useState<GeolocationState>({
    permissionStatus: 'prompt',
    currentLocation: null,
    isLoading: true,
    error: null,
  });

  const permissionStatusRef = useRef<PermissionStatus | null>(null);
  const isInitializedRef = useRef(false);

  const fetchLocation = useCallback(
    (
      onSuccess?: (loc: LocationInfo) => void,
      onError?: (err: GeolocationPositionError) => void
    ) => {
      if (!navigator.geolocation) {
        const error = {
          code: 2,
          message: 'Geolocation is not supported by this browser.',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3
        } as GeolocationPositionError;
        setState(s => ({ ...s, error, isLoading: false }));
        onError?.(error);
        return;
      }

      setState(s => ({ ...s, isLoading: true, error: null }));

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: LocationInfo = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setState(s => ({ ...s, currentLocation: loc, isLoading: false, error: null }));
          onSuccess?.(loc);
        },
        (geoError) => {
          setState(s => ({ ...s, error: geoError, isLoading: false }));
          onError?.(geoError);
        },
        { 
          enableHighAccuracy: true, 
          timeout: 15000, 
          maximumAge: 300000 // 5 minutes
        }
      );
    },
    []
  );

  const checkPermissionAndFetch = useCallback(async () => {
    if (!navigator.permissions) {
      setState(s => ({ ...s, permissionStatus: 'prompt', isLoading: false }));
      return;
    }

    try {
      const status = await navigator.permissions.query({ name: 'geolocation' });
      permissionStatusRef.current = status;
      
      const handlePermissionChange = () => {
        if (!permissionStatusRef.current) return;
        
        const newStatus = permissionStatusRef.current.state;
        setState(s => ({ ...s, permissionStatus: newStatus }));
        
        if (newStatus === 'granted') {
          fetchLocation();
        } else {
          setState(s => ({ 
            ...s, 
            isLoading: false, 
            currentLocation: null,
            error: null
          }));
        }
      };

      status.onchange = handlePermissionChange;
      
      setState(s => ({ ...s, permissionStatus: status.state }));
      
      if (status.state === 'granted') {
        fetchLocation();
      } else {
        setState(s => ({ ...s, isLoading: false }));
      }
      
    } catch (error) {
      console.warn('Permission query failed:', error);
      setState(s => ({ ...s, permissionStatus: 'prompt', isLoading: false }));
    }
  }, [fetchLocation]);

  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      checkPermissionAndFetch();
    }

    return () => {
      if (permissionStatusRef.current) {
        permissionStatusRef.current.onchange = null;
      }
    };
  }, [checkPermissionAndFetch]);

  return { ...state, fetchLocation };
};
