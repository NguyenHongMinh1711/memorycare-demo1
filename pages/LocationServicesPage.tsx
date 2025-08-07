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

// --- Constants ---
const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY;

const formInputStyle = "block w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base text-slate-900 placeholder:text-slate-400";

// --- Sub-components ---
const LocationMap = React.memo<{ mapRef: React.RefObject<HTMLDivElement>; isLoading: boolean; hasLocation: boolean; permissionStatus: PermissionState; t: (key: any) => string; }>
(({ mapRef, isLoading, hasLocation, permissionStatus, t }) => (
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
                    {permissionStatus === 'denied' ? t('locationRequiredForMap') : t('enableLocationToBegin')}
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

const NavigationCard = React.memo<{
    destinationInputContainerRef: React.RefObject<HTMLDivElement>;
    isCalculatingRoute: boolean;
    routeDirections: any[] | null;
    selectedDestination: LocationInfo | null;
    onGuideToDestination: () => void;
    onGuideHome: () => void;
    onReadDirections: () => void;
    t: (key: any, ...args: any[]) => string;
}>((props) => {
    const { destinationInputContainerRef, isCalculatingRoute, routeDirections, selectedDestination, onGuideToDestination, onGuideHome, onReadDirections, t } = props;

    return (
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-md space-y-4">
            <h3 className="text-xl font-bold text-slate-800">{t('navigationHelpTitle')}</h3>
            <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="w-full md:flex-1">
                    <label htmlFor="destinationInput" className="block text-sm font-medium text-slate-700 mb-1">{t('destinationLabel')}</label>
                    <div id="destinationInput" ref={destinationInputContainerRef} className="autocomplete-container" />
                </div>
                <div className="flex items-end gap-3 w-full md:w-auto">
                    <Button onClick={onGuideToDestination} disabled={isCalculatingRoute || !selectedDestination} isLoading={isCalculatingRoute && !!selectedDestination} leftIcon={<MapPinIcon className="w-5 h-5" />} size="md" variant="secondary" className="flex-1 md:flex-initial">{t('guideToDestinationButton')}</Button>
                    <Button onClick={onGuideHome} disabled={isCalculatingRoute} leftIcon={<HomeIcon className="w-5 h-5" />} size="md" variant="primary" className="flex-1 md:flex-initial">{t('guideHomeButton')}</Button>
                </div>
            </div>

            {isCalculatingRoute && <p className="text-slate-500">{t('gettingDirections')}</p>}
            {routeDirections && (
                <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-lg font-semibold text-indigo-800">{t('directionsTitle')}</h4>
                        <Button onClick={onReadDirections} variant="ghost" size="sm" leftIcon={<SpeakerWaveIcon className="w-5 h-5" />}>{t('readDirectionsButton')}</Button>
                    </div>
                    <ol className="list-decimal list-inside space-y-1.5 text-slate-700 text-sm md:text-base">
                        {routeDirections.map((step, index) => <li key={index}>{step.instruction.text}</li>)}
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

    // State
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
    const { currentLocation, permissionStatus, isLoading: isLoadingLocation, error: locationError, fetchLocation } = useGeolocation();
    const [homeLocation, setHomeLocation] = useLocalStorage<LocationInfo | null>('memorycare_homeLocation', null);
    const [savedLocations, setSavedLocations] = useLocalStorage<SavedLocation[]>('memorycare_saved_locations', []);
    const [familyEmails] = useLocalStorage<string[]>('memorycare_family_emails', []);
    const [selectedDestination, setSelectedDestination] = useState<LocationInfo | null>(null);
    const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
    const [routeDirections, setRouteDirections] = useState<any[] | null>(null);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [editingLocation, setEditingLocation] = useState<SavedLocation | null>(null);
    const [newLocationName, setNewLocationName] = useState('');
    const [showPermissionBanner, setShowPermissionBanner] = useState(false);

    // Refs
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<maplibregl.Map | null>(null);
    const userMarker = useRef<maplibregl.Marker | null>(null);
    const destinationInputContainerRef = useRef<HTMLDivElement>(null);

    // Effects
    useEffect(() => {
        if (!GEOAPIFY_API_KEY) {
            setNotification({ message: t('mapApiKeyError'), type: 'error' });
        }
    }, [t]);

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
        if (mapRef.current && !mapInstance.current && currentLocation && GEOAPIFY_API_KEY) {
            const style = `https://maps.geoapify.com/v1/styles/osm-bright/style.json?apiKey=${GEOAPIFY_API_KEY}`;
            mapInstance.current = new maplibregl.Map({
                container: mapRef.current,
                style: style,
                center: [currentLocation.longitude, currentLocation.latitude],
                zoom: 12,
            });
        }
        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, [currentLocation]);

    useEffect(() => {
        if (mapInstance.current && currentLocation) {
            const userPos: [number, number] = [currentLocation.longitude, currentLocation.latitude];
            mapInstance.current.flyTo({ center: userPos, zoom: 16 });

            if (!userMarker.current) {
                userMarker.current = new maplibregl.Marker().setLngLat(userPos).addTo(mapInstance.current);
            } else {
                userMarker.current.setLngLat(userPos);
            }
        }
    }, [currentLocation]);

    useEffect(() => {
        if (destinationInputContainerRef.current && GEOAPIFY_API_KEY) {
            const autocomplete = new GeocoderAutocomplete(
                destinationInputContainerRef.current,
                GEOAPIFY_API_KEY,
                {
                    placeholder: t('destinationPlaceholder'),
                    lang: language,
                }
            );
            autocomplete.on('select', (location) => {
                if (location) {
                    const newDestination: LocationInfo = {
                        latitude: location.properties.lat,
                        longitude: location.properties.lon,
                        address: location.properties.formatted,
                    };
                    setSelectedDestination(newDestination);
                    if (currentLocation) {
                        calculateAndDisplayRoute(currentLocation, newDestination);
                    }
                }
            });
            return () => {
                (autocomplete as any).destroy();
            };
        }
    }, [GEOAPIFY_API_KEY, language, t, currentLocation]); // Re-init if lang changes or currentLocation becomes available


    const removeRouteFromMap = useCallback(() => {
        if (mapInstance.current?.isStyleLoaded()) {
            const map = mapInstance.current;
            if (map.getLayer('route')) map.removeLayer('route');
            if (map.getSource('route')) map.removeSource('route');
        }
        setRouteDirections(null);
    }, []);

    const calculateAndDisplayRoute = useCallback(async (origin: LocationInfo, destinationInfo: LocationInfo) => {
        if (!GEOAPIFY_API_KEY) {
            setNotification({ message: t('mapApiKeyError'), type: 'error' });
            return;
        }

        setIsCalculatingRoute(true);
        removeRouteFromMap();
        
        const routingUrl = `https://api.geoapify.com/v1/routing?waypoints=${origin.latitude},${origin.longitude}|${destinationInfo.latitude},${destinationInfo.longitude}&mode=drive&details=instruction_details&lang=${language}&apiKey=${GEOAPIFY_API_KEY}`;
        
        try {
            const response = await fetch(routingUrl);
            const result = await response.json();

            if (result.features?.length > 0) {
                const geometry = result.features[0].geometry;
                const routeSteps = result.features[0].properties.legs[0].steps;

                if (mapInstance.current?.isStyleLoaded()) {
                    mapInstance.current.addSource('route', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry } });
                    mapInstance.current.addLayer({ id: 'route', type: 'line', source: 'route', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#4f46e5', 'line-width': 6, 'line-opacity': 0.9 } });
                    
                    const coordinates = geometry.coordinates[0];
                    const bounds = coordinates.reduce((b: LngLatBounds, coord: [number, number]) => b.extend(coord), new LngLatBounds(coordinates[0], coordinates[0]));
                    mapInstance.current.fitBounds(bounds, { padding: { top: 50, bottom: 150, left: 50, right: 50 } });
                }
                setRouteDirections(routeSteps);
            } else {
                 throw new Error(result.message || t('directionsError'));
            }
        } catch (err: any) {
            setNotification({ message: err.message || t('directionsError'), type: 'error' });
            setRouteDirections(null);
        } finally {
            setIsCalculatingRoute(false);
        }
    }, [removeRouteFromMap, t, language]);
    
    // --- Handlers ---
    const handleRefreshLocation = useCallback(() => fetchLocation(
        () => setNotification({ message: t('locationRefreshedSuccess'), type: 'success' }),
    ), [fetchLocation, t]);
    
    const handleRequestPermission = useCallback(() => {
        setShowPermissionBanner(false);
        handleRefreshLocation();
    }, [handleRefreshLocation]);

    const handleSetHome = useCallback(() => {
        if (currentLocation) {
            setHomeLocation(currentLocation);
            setNotification({ message: t('homeSetSuccess'), type: 'success' });
            if (ttsSupported) speak(t('homeSetSpeech'));
        } else {
            setNotification({ message: t('homeSetError'), type: 'error' });
        }
    }, [currentLocation, setHomeLocation, t, ttsSupported, speak]);
    
    const handleOpenSaveModal = useCallback((loc: SavedLocation | null) => {
        setEditingLocation(loc);
        setNewLocationName(loc ? loc.name : '');
        setIsSaveModalOpen(true);
    }, []);

    const handleSaveOrUpdateLocation = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (!newLocationName.trim()) { setNotification({ message: t('locationNameRequired'), type: 'error' }); return; }

        if (editingLocation) {
            const updated = { ...editingLocation, name: newLocationName.trim() };
            setSavedLocations(prev => prev.map(loc => loc.id === updated.id ? updated : loc));
            setNotification({ message: t('savedLocationUpdatedSuccess', updated.name), type: 'success' });
        } else {
            if (!currentLocation) { setNotification({ message: t('homeSetError'), type: 'error' }); return; }
            const newLoc: SavedLocation = { id: Date.now().toString(), name: newLocationName.trim(), location: currentLocation };
            setSavedLocations(prev => [...prev, newLoc]);
            setNotification({ message: t('locationSavedSuccess', newLoc.name), type: 'success' });
        }
        setIsSaveModalOpen(false);
    }, [newLocationName, editingLocation, currentLocation, setSavedLocations, t]);
    
    const handleDeleteLocation = useCallback((id: string) => {
        const loc = savedLocations.find(l => l.id === id);
        if (loc && window.confirm(t('confirmDeleteLocation', loc.name))) {
            setSavedLocations(prev => prev.filter(l => l.id !== id));
            setNotification({ message: t('locationDeletedInfo'), type: 'info' });
        }
    }, [savedLocations, setSavedLocations, t]);

    const handleGuideHome = useCallback(() => {
        if (!homeLocation) { setNotification({ message: t('guideHomeNotSetInfo'), type: 'info' }); return; }
        if (!currentLocation) { setNotification({ message: t('guideHomeError'), type: 'error' }); return; }
        calculateAndDisplayRoute(currentLocation, homeLocation);
    }, [homeLocation, currentLocation, calculateAndDisplayRoute, t]);

    const handleGuideToDestination = useCallback(() => {
        if (!selectedDestination) { setNotification({ message: t('destinationMissingInfo'), type: 'info' }); return; }
        if (!currentLocation) { setNotification({ message: t('guideHomeError'), type: 'error' }); return; }
        calculateAndDisplayRoute(currentLocation, selectedDestination);
    }, [selectedDestination, currentLocation, calculateAndDisplayRoute, t]);

    const handleReadDirections = useCallback(() => {
        if (ttsSupported && routeDirections) {
            const allStepsText = routeDirections.map((step: any) => step.instruction.text).join('. ');
            speak(`${t('directionsTitle')} ${allStepsText}`);
        }
    }, [ttsSupported, routeDirections, speak, t]);

    const handleNotifyFamily = useCallback(() => {
        if (familyEmails.length === 0) {
            setNotification({ message: t('notifyFamilyNoEmails'), type: 'error' }); return;
        }
        if (!currentLocation) {
            setNotification({ message: t('homeSetError'), type: 'error' }); return;
        }
        const { latitude, longitude } = currentLocation;
        const mailtoLink = `mailto:${familyEmails.join(',')}?subject=${encodeURIComponent(t('notifyFamilyEmailSubject'))}&body=${encodeURIComponent(t('notifyFamilyEmailBody', latitude, longitude, latitude, longitude))}`;
        window.location.href = mailtoLink;
    }, [familyEmails, currentLocation, t]);

    const handleOpenSaveSpotModal = useCallback(() => handleOpenSaveModal(null), [handleOpenSaveModal]);
    
    const handleCloseSaveModal = useCallback(() => setIsSaveModalOpen(false), []);
    
    const handleGuideToSavedPlace = useCallback((place: SavedLocation) => {
        if (!currentLocation) { setNotification({ message: t('guideHomeError'), type: 'error' }); return; }
        calculateAndDisplayRoute(currentLocation, place.location);
    }, [currentLocation, calculateAndDisplayRoute, t]);

    return (
        <div className="space-y-10 animate-fadeIn">
            <PageHeader title={t('pageTitleLocation')} subtitle={t('pageSubtitleLocation')} icon={<MapPinIcon className="w-10 h-10" />} />

            {notification && <NotificationBanner message={notification.message} type={notification.type} onDismiss={() => setNotification(null)} />}
            {ttsError && <NotificationBanner message={`Text-to-speech error: ${ttsError}`} type="error" onDismiss={() => {}} />}
            {showPermissionBanner && <LocationPermissionBanner onRequestPermission={handleRequestPermission} onDismiss={() => setShowPermissionBanner(false)} />}
            
            {permissionStatus === 'denied' && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-800 p-4 rounded-r-lg mb-6 flex items-start gap-3" role="alert">
                    <MapPinIcon className="w-6 h-6 mr-3 flex-shrink-0" />
                    <div>
                        <p className="font-bold">{t('locationPermissionDeniedTitle')}</p>
                        <p className="text-sm">{t('locationPermissionDeniedBody')}</p>
                    </div>
                </div>
            )}
            
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <LocationMap mapRef={mapRef} isLoading={isLoadingLocation} hasLocation={!!currentLocation} permissionStatus={permissionStatus} t={t} />
                <CurrentLocationCard
                    currentLocation={currentLocation}
                    isLoading={isLoadingLocation}
                    homeLocation={homeLocation}
                    onRefresh={handleRefreshLocation}
                    onSetHome={handleSetHome}
                    onSaveSpot={handleOpenSaveSpotModal}
                    t={t}
                />
            </div>
            
            <NavigationCard
                destinationInputContainerRef={destinationInputContainerRef}
                isCalculatingRoute={isCalculatingRoute}
                routeDirections={routeDirections}
                selectedDestination={selectedDestination}
                onGuideHome={handleGuideHome}
                onGuideToDestination={handleGuideToDestination}
                onReadDirections={handleReadDirections}
                t={t}
            />
            
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
                                    <Button onClick={() => handleGuideToSavedPlace(place)} disabled={!currentLocation || isCalculatingRoute} size="sm" variant="ghost">{t('guideHereButton')}</Button>
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
