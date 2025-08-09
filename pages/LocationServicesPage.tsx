import React, { useState, useEffect, useCallback, useRef } from 'react';
import maplibregl, { LngLatBounds } from 'maplibre-gl';
import { GeocoderAutocomplete } from '@geoapify/geocoder-autocomplete';
import 'maplibre-gl/dist/maplibre-gl.css';

import { LocationInfo, SavedLocation } from '../types';
import Button from '../components/common/Button';
import { MapPinIcon, HomeIcon, ArrowPathIcon, SpeakerWaveIcon, BookmarkSquareIcon, TrashIcon, PencilIcon } from '../constants';
import useLocalStorage from '../hooks/useLocalStorage';
import useTextToSpeech from '../hooks/useTextToSpeech';
import PageHeader from '../components/common/PageHeader';
import NotificationBanner from '../components/common/NotificationBanner';
import Modal from '../components/common/Modal';
import { useTranslation } from '../contexts';
import LocationPermissionBanner from '../components/LocationPermissionBanner';
import { useGeolocation } from '../hooks/useGeolocation';
import { translateDirections } from '../services/geminiService';

// --- Constants ---
const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY || import.meta.env.VITE_GEOAPIFY_API_KEY;

const formInputStyle = "block w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base text-slate-900 placeholder:text-slate-400";

// --- Sub-components ---
const LocationMap = React.memo<{
  mapRef: React.RefObject<HTMLDivElement>;
  isLoading: boolean;
  hasLocation: boolean;
  permissionStatus: PermissionState;
  error: GeolocationPositionError | null;
  t: (key: any) => string;
}>
(({ mapRef, isLoading, hasLocation, permissionStatus, error, t }) => (
    <div ref={mapRef} className="w-full h-64 md:h-96 bg-slate-200 flex items-center justify-center text-slate-500" role="application" aria-label="Interactive Map">
        {isLoading && (
            <div className="text-center p-4">
                <svg className="animate-spin h-8 w-8 text-indigo-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="mt-2 text-slate-600">{t('findingLocation')}</p>
            </div>
        )}
        {!hasLocation && !isLoading && (
            <div className="text-center p-4">
                <MapPinIcon className="w-16 h-16 mx-auto text-slate-300" />
                <p className="mt-2 text-slate-600">
                    {error ? `Error: ${error.message}` :
                     permissionStatus === 'denied' ? t('locationRequiredForMap') :
                     t('enableLocationToBegin')}
                </p>
            </div>
        )}
    </div>
));

const CurrentLocationCard = React.memo<{
    currentLocation: LocationInfo | null;
    isLoading: boolean;
    homeLocation: LocationInfo | null;
    onRefresh: () => void;
    onSetHome: () => void;
    onSaveSpot: () => void;
    t: (key: any, ...args: any[]) => string;
}>((props) => {
    const { currentLocation, isLoading, homeLocation, onRefresh, onSetHome, onSaveSpot, t } = props;
    return (
        <div className="p-4 md:p-6">
            <h3 className="text-lg font-bold text-slate-800">{t('currentLocationTitle')}</h3>
            {currentLocation && (
                <div className="text-sm text-slate-700 font-mono">
                    <span>{t('latitude')}: {currentLocation.latitude.toFixed(5)}</span>
                    <span className="ml-4">{t('longitude')}: {currentLocation.longitude.toFixed(5)}</span>
                </div>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
                <Button onClick={onRefresh} isLoading={isLoading} leftIcon={<ArrowPathIcon className="w-5 h-5" />} size="md">{t('refreshLocationButton')}</Button>
                <Button onClick={onSetHome} disabled={!currentLocation || isLoading} leftIcon={<HomeIcon className="w-5 h-5" />} size="md" variant="secondary">{t('setHomeButton')}</Button>
                <Button onClick={onSaveSpot} disabled={!currentLocation || isLoading} leftIcon={<BookmarkSquareIcon className="w-5 h-5" />} size="md" variant="primary">{t('saveLocationButton')}</Button>
            </div>
            {homeLocation && <p className="text-xs text-slate-500 mt-3">{t('homeSetLocationInfo', homeLocation.latitude.toFixed(4), homeLocation.longitude.toFixed(4))}</p>}
        </div>
    );
});

// **REFACTORED COMPONENT**
const NavigationCard = React.memo<{
    currentLocation: LocationInfo | null; // Now receives location as a prop
    isCalculatingRoute: boolean;
    isTranslating: boolean;
    routeDirections: { text: string }[] | null;
    selectedDestination: LocationInfo | null;
    onDestinationSelect: (location: LocationInfo | null) => void;
    onGuideToDestination: () => void;
    onGuideHome: () => void;
    onReadDirections: () => void;
    hasApiKey: boolean;
    t: (key: any, ...args: any[]) => string;
    language: 'en' | 'vi';
}>((props) => {
    const {
        currentLocation,
        isCalculatingRoute,
        isTranslating,
        routeDirections,
        selectedDestination,
        onDestinationSelect,
        onGuideToDestination,
        onGuideHome,
        onReadDirections,
        hasApiKey,
        t,
        language
    } = props;

    const destinationInputContainerRef = useRef<HTMLDivElement>(null);
    const geocoderRef = useRef<any>(null);

    useEffect(() => {
        // Guard conditions
        if (!hasApiKey || !destinationInputContainerRef.current || !currentLocation) {
            return;
        }

        // Cleanup previous instance if it exists
        if (geocoderRef.current) {
            geocoderRef.current.destroy();
            geocoderRef.current = null;
        }

        // Clear the container's inner HTML to prevent duplicates
        destinationInputContainerRef.current.innerHTML = '';

        try {
            const supportedLanguages = ['bg', 'ca', 'cs', 'da', 'de', 'el', 'en-GB', 'en', 'es', 'et', 'fi', 'fr', 'hi', 'hu', 'it', 'ja', 'nb-NO', 'nl', 'pl', 'pt-BR', 'pt', 'ro', 'ru', 'sk', 'sl', 'sv', 'tr', 'uk'];
            const supportedLang = supportedLanguages.includes(language) ? language : 'en';

            const autocompleteOptions: any = {
                placeholder: t('destinationPlaceholder'),
                lang: supportedLang,
                bias: {
                    location: {
                        lon: currentLocation.longitude,
                        lat: currentLocation.latitude
                    }
                },
                filter: {
                    circle: {
                        lon: currentLocation.longitude,
                        lat: currentLocation.latitude,
                        radius_meters: 50000
                    }
                }
            };

            geocoderRef.current = new GeocoderAutocomplete(
                destinationInputContainerRef.current,
                GEOAPIFY_API_KEY,
                autocompleteOptions
            );

            geocoderRef.current.on('select', (location: any) => {
                if (location) {
                    const newDestination: LocationInfo = {
                        latitude: location.properties.lat,
                        longitude: location.properties.lon,
                        address: location.properties.formatted,
                    };
                    onDestinationSelect(newDestination);
                }
            });

            geocoderRef.current.on('input', (value: string) => {
                if (!value) {
                    onDestinationSelect(null);
                }
            });

        } catch (error) {
            console.error('Geocoder initialization error:', error);
        }

        return () => {
            if (geocoderRef.current) {
                geocoderRef.current.destroy();
                geocoderRef.current = null;
            }
        };
    }, [hasApiKey, language, t, currentLocation, onDestinationSelect]); // Effect now depends on currentLocation

    return (
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-md space-y-4">
            <h3 className="text-xl font-bold text-slate-800">{t('navigationHelpTitle')}</h3>
            {!hasApiKey && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-3 rounded-r-lg">
                    <p className="text-sm">API key is missing.</p>
                </div>
            )}
            <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="w-full md:flex-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('destinationLabel')}</label>
                    {currentLocation ? (
                         <div id="destination-input-wrapper" ref={destinationInputContainerRef} />
                    ) : (
                         <div className="w-full px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-500 italic">
                            {t('findingLocation')}
                         </div>
                    )}
                </div>
                <div className="flex items-end gap-3 w-full md:w-auto">
                    <Button onClick={onGuideToDestination} disabled={!hasApiKey || isCalculatingRoute || !selectedDestination} isLoading={isCalculatingRoute && !!selectedDestination} leftIcon={<MapPinIcon className="w-5 h-5" />} size="md" variant="secondary" className="flex-1 md:flex-initial">{t('guideToDestinationButton')}</Button>
                    <Button onClick={onGuideHome} disabled={!hasApiKey || isCalculatingRoute || !currentLocation} leftIcon={<HomeIcon className="w-5 h-5" />} size="md" variant="primary" className="flex-1 md:flex-initial">{t('guideHomeButton')}</Button>
                </div>
            </div>

            {(isCalculatingRoute || isTranslating) && <p className="text-slate-500">{isTranslating ? 'Đang dịch chỉ dẫn...' : t('gettingDirections')}</p>}
            {routeDirections && (
                <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-lg font-semibold text-indigo-800">{t('directionsTitle')}</h4>
                        <Button onClick={onReadDirections} variant="ghost" size="sm" leftIcon={<SpeakerWaveIcon className="w-5 h-5" />}>{t('readDirectionsButton')}</Button>
                    </div>
                    <ol className="list-decimal list-inside space-y-1.5 text-slate-700 text-sm md:text-base">
                        {routeDirections.map((step, index) => <li key={index}>{step.text}</li>)}
                    </ol>
                </div>
            )}
        </div>
    );
});

// --- Main Page Component ---
const LocationServicesPage: React.FC = () => {
    const { t, language } = useTranslation();
    const { speak, isSupported: ttsSupported, error: ttsError } = useTextToSpeech();

    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
    const { currentLocation, permissionStatus, isLoading: isLoadingLocation, error: locationError, fetchLocation } = useGeolocation();
    const [homeLocation, setHomeLocation] = useLocalStorage<LocationInfo | null>('memorycare_homeLocation', null);
    const [savedLocations, setSavedLocations] = useLocalStorage<SavedLocation[]>('memorycare_saved_locations', []);
    const [familyEmails] = useLocalStorage<string[]>('memorycare_family_emails', []);
    const [selectedDestination, setSelectedDestination] = useState<LocationInfo | null>(null);
    const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);
    const [routeDirections, setRouteDirections] = useState<{ text: string }[] | null>(null);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [editingLocation, setEditingLocation] = useState<SavedLocation | null>(null);
    const [newLocationName, setNewLocationName] = useState('');
    const [showPermissionBanner, setShowPermissionBanner] = useState(false);
    const [mapInitError, setMapInitError] = useState<string | null>(null);

    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<maplibregl.Map | null>(null);
    const userMarker = useRef<maplibregl.Marker | null>(null);

    const hasApiKey = Boolean(GEOAPIFY_API_KEY);

    useEffect(() => {
        if (!hasApiKey) {
            setNotification({ message: 'Map API key is not configured. Some features may not work.', type: 'error' });
        }
    }, [hasApiKey]);

    useEffect(() => {
        if (locationError) {
            setNotification({ message: t('locationError', locationError.message), type: 'error' });
        }
    }, [locationError, t]);

    useEffect(() => {
        if (permissionStatus === 'prompt') {
            setShowPermissionBanner(true);
        } else {
            setShowPermissionBanner(false);
        }
    }, [permissionStatus]);

    useEffect(() => {
        if (!mapRef.current || !currentLocation || !hasApiKey || mapInstance.current) {
            return;
        }
        try {
            const style = `https://maps.geoapify.com/v1/styles/osm-bright/style.json?apiKey=${GEOAPIFY_API_KEY}`;
            mapInstance.current = new maplibregl.Map({
                container: mapRef.current,
                style: style,
                center: [currentLocation.longitude, currentLocation.latitude],
                zoom: 12,
            });
            mapInstance.current.on('error', (e) => { console.error('Map error:', e); setMapInitError('Failed to load map.'); });
            mapInstance.current.on('load', () => { setMapInitError(null); });
        } catch (error) {
            console.error('Map initialization error:', error);
            setMapInitError('Failed to initialize map.');
        }
    }, [currentLocation, hasApiKey]);

    useEffect(() => {
        if (!mapInstance.current || !currentLocation) return;
        const userPos: [number, number] = [currentLocation.longitude, currentLocation.latitude];
        try {
            mapInstance.current.flyTo({ center: userPos, zoom: 16 });
            if (!userMarker.current) {
                userMarker.current = new maplibregl.Marker().setLngLat(userPos).addTo(mapInstance.current);
            } else {
                userMarker.current.setLngLat(userPos);
            }
        } catch (error) {
            console.error('Error updating map position:', error);
        }
    }, [currentLocation]);

    const removeRouteFromMap = useCallback(() => {
        if (mapInstance.current?.isStyleLoaded()) {
            const map = mapInstance.current;
            try {
                if (map.getLayer('route')) map.removeLayer('route');
                if (map.getSource('route')) map.removeSource('route');
            } catch (error) {
                console.warn('Error removing route from map:', error);
            }
        }
        setRouteDirections(null);
    }, []);

    const calculateAndDisplayRoute = useCallback(async (origin: LocationInfo, destinationInfo: LocationInfo) => {
        if (!hasApiKey) { setNotification({ message: 'API key required', type: 'error' }); return; }

        setIsCalculatingRoute(true);
        setIsTranslating(false);
        removeRouteFromMap();
        
        const apiLang = 'en';
        const routingUrl = `https://api.geoapify.com/v1/routing?waypoints=${origin.latitude},${origin.longitude}|${destinationInfo.latitude},${destinationInfo.longitude}&mode=drive&details=instruction_details&lang=${apiLang}&apiKey=${GEOAPIFY_API_KEY}`;

        try {
            const response = await fetch(routingUrl);
            if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
            
            const result = await response.json();
            const routeSteps = result.features?.[0]?.properties?.legs?.[0]?.steps;

            if (routeSteps) {
                const geometry = result.features[0].geometry;
                if (geometry && mapInstance.current?.isStyleLoaded()) {
                    mapInstance.current.addSource('route', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry } });
                    mapInstance.current.addLayer({ id: 'route', type: 'line', source: 'route', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#4f46e5', 'line-width': 6 } });
                    const bounds = new maplibregl.LngLatBounds();
                    (geometry.type === 'MultiLineString' ? geometry.coordinates.flat() : geometry.coordinates).forEach((point: any) => bounds.extend(point));
                    mapInstance.current.fitBounds(bounds, { padding: 80 });
                }

                if (language === 'vi') {
                    setIsTranslating(true);
                    const toTranslate = routeSteps.map((s: any) => ({ text: s.instruction.text, distance: s.distance }));
                    const translated = await translateDirections(toTranslate, 'vi');
                    setRouteDirections(translated);
                } else {
                    setRouteDirections(routeSteps.map((s: any) => ({ text: `${s.instruction.text} (${Math.round(s.distance)}m)` })));
                }
            } else { throw new Error('No route found'); }
        } catch (err: any) {
            setNotification({ message: `Route error: ${err.message}`, type: 'error' });
            setRouteDirections(null);
        } finally {
            setIsCalculatingRoute(false);
            setIsTranslating(false);
        }
    }, [removeRouteFromMap, language, hasApiKey, t]);

    const handleDestinationSelect = useCallback((location: LocationInfo | null) => {
        setSelectedDestination(location);
        if (location && currentLocation) {
            calculateAndDisplayRoute(currentLocation, location);
        } else if (!location) {
            removeRouteFromMap();
        }
    }, [currentLocation, calculateAndDisplayRoute, removeRouteFromMap]);

    const handleGuideToDestination = useCallback(() => {
        if (currentLocation && selectedDestination) {
            calculateAndDisplayRoute(currentLocation, selectedDestination);
        }
    }, [currentLocation, selectedDestination, calculateAndDisplayRoute]);

    const handleGuideHome = useCallback(() => {
        if (currentLocation && homeLocation) {
            calculateAndDisplayRoute(currentLocation, homeLocation);
        }
    }, [currentLocation, homeLocation, calculateAndDisplayRoute]);

    const handleRefreshLocation = useCallback(() => fetchLocation(), [fetchLocation]);
    const handleRequestPermission = useCallback(() => setShowPermissionBanner(false), []);
    const handleSetHome = useCallback(() => { if (currentLocation) setHomeLocation(currentLocation); }, [currentLocation, setHomeLocation]);
    const handleOpenSaveModal = useCallback((loc: SavedLocation | null) => { setEditingLocation(loc); setNewLocationName(loc ? loc.name : ''); setIsSaveModalOpen(true); }, []);
    const handleCloseSaveModal = useCallback(() => setIsSaveModalOpen(false), []);
    const handleReadDirections = useCallback(() => { if (ttsSupported && routeDirections) { speak(routeDirections.map(s => s.text).join('. ')); } }, [ttsSupported, routeDirections, speak]);
    const handleGuideToSavedPlace = useCallback((place: SavedLocation) => { if (currentLocation) calculateAndDisplayRoute(currentLocation, place.location); }, [currentLocation, calculateAndDisplayRoute]);

    const handleSaveOrUpdateLocation = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        const name = newLocationName.trim();
        if (!name) return;
        if (editingLocation) {
            setSavedLocations(p => p.map(l => l.id === editingLocation.id ? { ...l, name } : l));
        } else if (currentLocation) {
            const newLoc: SavedLocation = { id: Date.now().toString(), name, location: currentLocation };
            setSavedLocations(p => [...p, newLoc]);
        }
        handleCloseSaveModal();
    }, [newLocationName, editingLocation, currentLocation, setSavedLocations, handleCloseSaveModal]);

    const handleDeleteLocation = useCallback((id: string) => { setSavedLocations(p => p.filter(l => l.id !== id)); }, [setSavedLocations]);
    
    const handleNotifyFamily = useCallback(() => {
        if (!currentLocation) return;
        const mailto = `mailto:${familyEmails.join(',')}?subject=Location Update&body=My current location: https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`;
        window.location.href = mailto;
    }, [familyEmails, currentLocation]);


    return (
        <div className="space-y-10 animate-fadeIn">
            <PageHeader title={t('pageTitleLocation')} subtitle={t('pageSubtitleLocation')} icon={<MapPinIcon className="w-10 h-10" />} />
            {notification && <NotificationBanner message={notification.message} type={notification.type} onDismiss={() => setNotification(null)} />}
            {ttsError && <NotificationBanner message={`TTS Error: ${ttsError}`} type="error" onDismiss={() => {}} />}
            {mapInitError && <NotificationBanner message={mapInitError} type="error" onDismiss={() => setMapInitError(null)} />}
            {showPermissionBanner && <LocationPermissionBanner onRequestPermission={handleRequestPermission} onDismiss={() => setShowPermissionBanner(false)} />}
            {permissionStatus === 'denied' && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-800 p-4 rounded-r-lg" role="alert">
                    <p>{t('locationPermissionDeniedBody')}</p>
                </div>
            )}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <LocationMap mapRef={mapRef} isLoading={isLoadingLocation} hasLocation={!!currentLocation} permissionStatus={permissionStatus} error={locationError} t={t} />
                <CurrentLocationCard currentLocation={currentLocation} isLoading={isLoadingLocation} homeLocation={homeLocation} onRefresh={handleRefreshLocation} onSetHome={handleSetHome} onSaveSpot={() => handleOpenSaveModal(null)} t={t} />
            </div>
            <NavigationCard
                currentLocation={currentLocation}
                isCalculatingRoute={isCalculatingRoute}
                isTranslating={isTranslating}
                routeDirections={routeDirections}
                selectedDestination={selectedDestination}
                onDestinationSelect={handleDestinationSelect}
                onGuideToDestination={handleGuideToDestination}
                onGuideHome={handleGuideHome}
                onReadDirections={handleReadDirections}
                hasApiKey={hasApiKey}
                t={t}
                language={language}
            />
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-md space-y-4">
                <h3 className="text-xl font-bold text-slate-800">{t('savedPlacesSectionTitle')}</h3>
                {savedLocations.length === 0 ? (
                    <p className="text-slate-500 text-center py-4">{t('noSavedPlaces')}</p>
                ) : (
                    <div className="space-y-3">
                        {savedLocations.map(place => (
                            <div key={place.id} className="bg-slate-50 p-3 rounded-lg flex justify-between items-center">
                                <span>{place.name}</span>
                                <div className="flex space-x-2">
                                    <Button onClick={() => handleGuideToSavedPlace(place)} size="sm" variant="ghost">{t('guideHereButton')}</Button>
                                    <Button onClick={() => handleOpenSaveModal(place)} size="sm"><PencilIcon className="w-4 h-4" /></Button>
                                    <Button onClick={() => handleDeleteLocation(place.id)} size="sm" variant="danger"><TrashIcon className="w-4 h-4" /></Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-bold text-slate-800 mb-4">{t('safetyActionsTitle')}</h3>
                <Button onClick={handleNotifyFamily} size="md" variant="danger" disabled={familyEmails.length === 0 || !currentLocation}>{t('notifyFamilyButton')}</Button>
            </div>
            <Modal isOpen={isSaveModalOpen} onClose={handleCloseSaveModal} title={editingLocation ? t('modalEditLocationTitle') : t('modalSaveLocationTitle')}>
                <form onSubmit={handleSaveOrUpdateLocation} className="space-y-4">
                    <input type="text" value={newLocationName} onChange={(e) => setNewLocationName(e.target.value)} required placeholder={t('formLocationNamePlaceholder')} className={formInputStyle} />
                    <div className="flex justify-end space-x-3 pt-4">
                        <Button type="button" variant="secondary" onClick={handleCloseSaveModal}>{t('formCancelButton')}</Button>
                        <Button type="submit">{editingLocation ? t('formUpdateLocationButton') : t('formSaveLocationButton')}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default LocationServicesPage;
