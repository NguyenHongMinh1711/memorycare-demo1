import React, { useState, useEffect, useCallback, useRef } from 'react';
import goongJs from '@goongmaps/goong-js';
import GoongSdk from '@goongmaps/goong-sdk';
import GoongDirections from '@goongmaps/goong-sdk/services/directions';
import GoongGeocoding from '@goongmaps/goong-sdk/services/geocoding';
import '@goongmaps/goong-js/dist/goong-js.css';

import { LocationInfo, SavedLocation } from '../types';
import Button from '../components/common/Button';
import { MapPinIcon, HomeIcon, ArrowPathIcon, SpeakerWaveIcon, BookmarkSquareIcon, TrashIcon, PencilIcon } from '../constants';
import useLocalStorage from '../hooks/useLocalStorage';
import useTextToSpeech from '../hooks/useTextToSpeech';
import PageHeader from '../components/common/PageHeader';
import NotificationBanner from '../components/common/NotificationBanner';
import Modal from '../components/common/Modal';
import { useTranslation } from '../contexts';

const GOONG_API_KEY = process.env.GOONG_API_KEY;
const GOONG_MAPTILES_KEY = process.env.GOONG_MAPTILES_KEY;

const LocationServicesPage: React.FC = () => {
  const { t } = useTranslation();

  // State and Refs for location and notifications
  const [currentLocation, setCurrentLocation] = useState<LocationInfo | null>(null);
  const [homeLocation, setHomeLocation] = useLocalStorage<LocationInfo | null>('memorycare_homeLocation', null);
  const [savedLocations, setSavedLocations] = useLocalStorage<SavedLocation[]>('memorycare_saved_locations', []);
  const [familyEmails] = useLocalStorage<string[]>('memorycare_family_emails', []);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const { speak, isSupported: ttsSupported, error: ttsError } = useTextToSpeech();

  // Map-specific state and refs
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<goongJs.Map | null>(null);
  const userMarker = useRef<goongJs.Marker | null>(null);
  const [destination, setDestination] = useState('');
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [routeDirections, setRouteDirections] = useState<any[] | null>(null);

  // Modal State for saving/editing locations
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<SavedLocation | null>(null);
  const [newLocationName, setNewLocationName] = useState('');

  // --- Map and Location Logic ---

  useEffect(() => {
    if (!GOONG_API_KEY || !GOONG_MAPTILES_KEY) {
      setError(t('mapApiKeyError'));
      return;
    }
    
    if (mapRef.current && !mapInstance.current) {
        goongJs.accessToken = GOONG_MAPTILES_KEY;
        mapInstance.current = new goongJs.Map({
            container: mapRef.current,
            style: 'https://tiles.goong.io/assets/goong_map_web.json',
            center: [105.8342, 21.0278], // Default to Hanoi
            zoom: 12,
        });
    }

    // Cleanup map instance on component unmount
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    }
  }, [t]);

  // Fetch Current Location
  const handleFetchLocation = useCallback(() => {
    setIsLoadingLocation(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc: LocationInfo = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        setCurrentLocation(loc);
        setIsLoadingLocation(false);
        if (GOONG_API_KEY) {
            setNotification({ message: t('locationRefreshedSuccess'), type: 'success'});
        }
      },
      (geoError) => {
        const message = t('locationError', geoError.message);
        setError(message);
        setIsLoadingLocation(false);
        setNotification({ message, type: 'error'});
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [t]);

  // Initial location fetch
  useEffect(() => {
    handleFetchLocation();
  }, [handleFetchLocation]);
  
  // Update map when location changes
  useEffect(() => {
    if (mapInstance.current && currentLocation) {
      const userPos: [number, number] = [currentLocation.longitude, currentLocation.latitude];
      mapInstance.current.flyTo({ center: userPos, zoom: 16 });

      if (!userMarker.current) {
        userMarker.current = new goongJs.Marker()
          .setLngLat(userPos)
          .addTo(mapInstance.current);
      } else {
        userMarker.current.setLngLat(userPos);
      }
    }
  }, [currentLocation]);
  
  const removeRouteFromMap = useCallback(() => {
    if (mapInstance.current && mapInstance.current.isStyleLoaded()) {
        const map = mapInstance.current;
        if (map.getLayer('route')) {
            map.removeLayer('route');
        }
        if (map.getSource('route')) {
            map.removeSource('route');
        }
    }
    setRouteDirections(null);
  }, []);

  const calculateAndDisplayRoute = useCallback(async (origin: LocationInfo | null, destinationInfo: LocationInfo | string) => {
    if (!origin) { setNotification({ message: t('guideHomeError'), type: 'error' }); return; }
    if (!GOONG_API_KEY) return;
    
    setIsCalculatingRoute(true);
    removeRouteFromMap();

    const baseClient = GoongSdk({ accessToken: GOONG_API_KEY });
    const geocodingService = GoongGeocoding(baseClient);
    const directionsService = GoongDirections(baseClient);

    let destCoordinates: {latitude: number, longitude: number};

    try {
        if (typeof destinationInfo === 'string') {
            const geocodeResponse = await geocodingService.geocode({ address: destinationInfo }).send();
            if (geocodeResponse.body.results.length === 0) {
                throw new Error(t('geocodeError', destinationInfo));
            }
            const { lat, lng } = geocodeResponse.body.results[0].geometry.location;
            destCoordinates = { latitude: lat, longitude: lng };
        } else {
            destCoordinates = destinationInfo;
        }

        const directionsResponse = await directionsService.getDirections({
            origin: `${origin.latitude},${origin.longitude}`,
            destination: `${destCoordinates.latitude},${destCoordinates.longitude}`,
            vehicle: 'car'
        }).send();
        
        setIsCalculatingRoute(false);
        if (directionsResponse.body.routes.length > 0) {
            const route = directionsResponse.body.routes[0];
            const geometry = route.geometry;
            const steps = route.legs[0].steps;

            if (mapInstance.current && mapInstance.current.isStyleLoaded()) {
                mapInstance.current.addSource('route', {
                    'type': 'geojson',
                    'data': {
                        'type': 'Feature',
                        'properties': {},
                        'geometry': geometry
                    }
                });
                mapInstance.current.addLayer({
                    'id': 'route',
                    'type': 'line',
                    'source': 'route',
                    'layout': { 'line-join': 'round', 'line-cap': 'round' },
                    'paint': { 'line-color': '#4f46e5', 'line-width': 6, 'line-opacity': 0.9 }
                });

                const bounds = new goongJs.LngLatBounds(geometry.coordinates[0], geometry.coordinates[0]);
                for (const coord of geometry.coordinates) {
                  bounds.extend(coord);
                }
                mapInstance.current.fitBounds(bounds, { padding: {top: 50, bottom:150, left: 50, right: 50} });
            }

            if (steps) {
                setRouteDirections(steps);
                const allStepsText = steps.map((step: any) => step.instruction).join('. ');
                if (ttsSupported) speak(`${t('directionsTitle')} ${allStepsText}`);
            }
        } else {
            setNotification({ message: t('directionsError'), type: 'error' });
        }
    } catch (err: any) {
        setIsCalculatingRoute(false);
        setNotification({ message: err.message || t('directionsError'), type: 'error' });
    }
  }, [removeRouteFromMap, speak, t, ttsSupported]);

  // --- User Actions ---
  const handleOpenSaveModal = (locationToEdit: SavedLocation | null) => {
    setEditingLocation(locationToEdit);
    setNewLocationName(locationToEdit ? locationToEdit.name : '');
    setIsSaveModalOpen(true);
  };
  
  const handleCloseSaveModal = () => {
    setIsSaveModalOpen(false);
    setEditingLocation(null);
    setNewLocationName('');
  };

  const handleSetHome = () => {
    if (currentLocation) {
      setHomeLocation(currentLocation);
      setNotification({ message: t('homeSetSuccess'), type: 'success'});
      if(ttsSupported) speak(t('homeSetSpeech'));
    } else {
      setNotification({ message: t('homeSetError'), type: 'error'});
    }
  };
  
  const handleSaveOrUpdateLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocationName.trim()) {
        setNotification({ message: t('locationNameRequired'), type: 'error'});
        return;
    }

    if (editingLocation) { // Update existing location
        const updatedLocation = { ...editingLocation, name: newLocationName.trim() };
        setSavedLocations(prev => prev.map(loc => loc.id === updatedLocation.id ? updatedLocation : loc));
        setNotification({ message: t('savedLocationUpdatedSuccess', updatedLocation.name), type: 'success' });
    } else { // Save new location
        if (!currentLocation) {
            setNotification({ message: t('homeSetError'), type: 'error'}); // Current location needed to save
            return;
        }
        const newSavedLocation: SavedLocation = {
            id: Date.now().toString(),
            name: newLocationName.trim(),
            location: currentLocation,
        };
        setSavedLocations(prev => [...prev, newSavedLocation]);
        setNotification({ message: t('locationSavedSuccess', newSavedLocation.name), type: 'success' });
    }
    handleCloseSaveModal();
  };

  const handleDeleteLocation = (idToDelete: string) => {
    const locationToDelete = savedLocations.find(loc => loc.id === idToDelete);
    if (!locationToDelete) return;
    if (window.confirm(t('confirmDeleteLocation', locationToDelete.name))) {
        setSavedLocations(prev => prev.filter(loc => loc.id !== idToDelete));
        setNotification({ message: t('locationDeletedInfo'), type: 'info'});
    }
  };

  const handleGuideHome = () => {
    if (!homeLocation) { setNotification({ message: t('guideHomeNotSetInfo'), type: 'info' }); return; }
    calculateAndDisplayRoute(currentLocation, homeLocation);
  };
  
  const handleGuideToDestination = () => {
    if (!destination.trim()) { setNotification({ message: t('destinationMissingInfo'), type: 'info' }); return; }
    calculateAndDisplayRoute(currentLocation, destination);
  };

  const handleNotifyFamily = () => {
    if (familyEmails.length === 0) {
      const message = t('notifyFamilyNoEmails');
      setNotification({ message, type: 'error' });
      if (ttsSupported) speak(message);
      return;
    }
    if (!currentLocation) {
        const message = t('homeSetError');
        setNotification({ message, type: 'error' });
        return;
    }

    const emailList = familyEmails.join(',');
    const subject = t('notifyFamilyEmailSubject');
    const { latitude, longitude } = currentLocation;
    const body = t('notifyFamilyEmailBody', latitude, longitude, latitude, longitude);

    const mailtoLink = `mailto:${emailList}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
  };
  
  const formInputStyle = "block w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base text-slate-900 placeholder:text-slate-400";


  return (
    <div className="space-y-10 animate-fadeIn">
      <PageHeader title={t('pageTitleLocation')} subtitle={t('pageSubtitleLocation')} icon={<MapPinIcon className="w-10 h-10" />} />

      {notification && <NotificationBanner message={notification.message} type={notification.type} onDismiss={() => setNotification(null)} />}
      {error && <NotificationBanner message={error} type="error" onDismiss={() => setError(null)} duration={0} />}
      {ttsError && <NotificationBanner message={`Text-to-speech error: ${ttsError}`} type="error" onDismiss={() => {}} />}
      
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div ref={mapRef} className="w-full h-64 md:h-96 bg-slate-200 flex items-center justify-center text-slate-500" role="application" aria-label="Interactive Map">
            {isLoadingLocation && !error && <span>{t('findingLocation')}</span>}
            {error && <span className="p-4 text-center">{error}</span>}
        </div>
         <div className="p-4 md:p-6">
            <h3 className="text-lg font-bold text-slate-800">{t('currentLocationTitle')}</h3>
            {isLoadingLocation && <p className="text-slate-500">{t('findingLocation')}</p>}
            {currentLocation && (
              <div className="text-sm text-slate-700 font-mono">
                <span>{t('latitude')}: {currentLocation.latitude.toFixed(5)}</span>
                <span className="ml-4">{t('longitude')}: {currentLocation.longitude.toFixed(5)}</span>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              <Button onClick={handleFetchLocation} isLoading={isLoadingLocation} leftIcon={<ArrowPathIcon className="w-5 h-5"/>} size="md">{t('refreshLocationButton')}</Button>
              <Button onClick={handleSetHome} disabled={!currentLocation || isLoadingLocation} leftIcon={<HomeIcon className="w-5 h-5"/>} size="md" variant="secondary">{t('setHomeButton')}</Button>
              <Button onClick={() => handleOpenSaveModal(null)} disabled={!currentLocation || isLoadingLocation} leftIcon={<BookmarkSquareIcon className="w-5 h-5"/>} size="md" variant="primary">{t('saveLocationButton')}</Button>
            </div>
            {homeLocation && <p className="text-xs text-slate-500 mt-3">{t('homeSetLocationInfo', homeLocation.latitude.toFixed(4), homeLocation.longitude.toFixed(4))}</p>}
         </div>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-xl shadow-md space-y-4">
        <h3 className="text-xl font-bold text-slate-800">{t('navigationHelpTitle')}</h3>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:flex-1">
            <label htmlFor="destinationInput" className="block text-sm font-medium text-slate-700 mb-1">{t('destinationLabel')}</label>
            <input type="text" id="destinationInput" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder={t('destinationPlaceholder')} className={formInputStyle} aria-label={t('destinationLabel')} />
          </div>
          <div className="flex items-end gap-3 w-full md:w-auto">
            <Button onClick={handleGuideToDestination} disabled={!currentLocation || isCalculatingRoute || !destination.trim()} isLoading={isCalculatingRoute && !!destination.trim()} leftIcon={<MapPinIcon className="w-5 h-5"/>} size="md" variant="secondary" className="flex-1 md:flex-initial">{t('guideToDestinationButton')}</Button>
            <Button onClick={handleGuideHome} disabled={!homeLocation || !currentLocation || isCalculatingRoute} isLoading={isCalculatingRoute && !destination.trim()} leftIcon={<HomeIcon className="w-5 h-5"/>} size="md" variant="primary" className="flex-1 md:flex-initial">{t('guideHomeButton')}</Button>
          </div>
        </div>

        {isCalculatingRoute && <p className="text-slate-500">{t('gettingDirections')}</p>}
        {routeDirections && (
          <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
            <div className="flex justify-between items-center mb-2">
                <h4 className="text-lg font-semibold text-indigo-800">{t('directionsTitle')}</h4>
                <Button onClick={() => { const allStepsText = routeDirections.map((step: any) => step.instruction).join('. '); if (ttsSupported) speak(allStepsText); }} variant="ghost" size="sm" leftIcon={<SpeakerWaveIcon className="w-5 h-5"/>}>{t('readDirectionsButton')}</Button>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-700 text-sm md:text-base">
              {routeDirections.map((step, index) => <li key={index} dangerouslySetInnerHTML={{ __html: step.instruction }}></li>)}
            </ol>
          </div>
        )}
      </div>

      <div className="bg-white p-4 md:p-6 rounded-xl shadow-md space-y-4">
        <h3 className="text-xl font-bold text-slate-800">{t('savedPlacesSectionTitle')}</h3>
        {savedLocations.length === 0 ? (
          <p className="text-slate-500 text-center py-4">{t('noSavedPlaces')}</p>
        ) : (
          <div className="space-y-3">
            {savedLocations.map(place => (
              <div key={place.id} className="bg-slate-50 p-3 rounded-lg flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0 sm:space-x-4">
                <div className="flex items-center space-x-3 self-start sm:self-center">
                  <BookmarkSquareIcon className="w-6 h-6 text-indigo-600 flex-shrink-0" />
                  <span className="font-medium text-slate-800 break-all">{place.name}</span>
                </div>
                <div className="flex space-x-2 flex-shrink-0 self-end sm:self-center">
                  <Button onClick={() => calculateAndDisplayRoute(currentLocation, place.location)} disabled={!currentLocation || isCalculatingRoute} size="sm" variant="ghost">{t('guideHereButton')}</Button>
                  <Button onClick={() => handleOpenSaveModal(place)} variant="secondary" size="sm" aria-label={`Edit ${place.name}`}><PencilIcon className="w-5 h-5" /></Button>
                  <Button onClick={() => handleDeleteLocation(place.id)} variant="danger" size="sm" aria-label={`Delete ${place.name}`}><TrashIcon className="w-5 h-5" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-md">
         <h3 className="text-xl font-bold text-slate-800 mb-4">{t('safetyActionsTitle')}</h3>
         <Button onClick={handleNotifyFamily} size="md" variant="danger">{t('notifyFamilyButton')}</Button>
      </div>

      <Modal isOpen={isSaveModalOpen} onClose={handleCloseSaveModal} title={editingLocation ? t('modalEditLocationTitle') : t('modalSaveLocationTitle')}>
        <form onSubmit={handleSaveOrUpdateLocation} className="space-y-4">
          <div>
            <label htmlFor="locationName" className="block text-sm font-medium text-slate-700">{t('formLocationNameLabel')}</label>
            <input type="text" id="locationName" value={newLocationName} onChange={(e) => setNewLocationName(e.target.value)} required placeholder={t('formLocationNamePlaceholder')} className={formInputStyle} />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={handleCloseSaveModal} size="md">{t('formCancelButton')}</Button>
            <Button type="submit" variant="primary" size="md">{editingLocation ? t('formUpdateLocationButton') : t('formSaveLocationButton')}</Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default LocationServicesPage;
