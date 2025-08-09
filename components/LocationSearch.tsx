import React, { useEffect, useRef } from 'react';
import { GeocoderAutocomplete } from '@geoapify/geocoder-autocomplete';
import { LocationInfo } from '../types';
import { useTranslation } from '../contexts';

const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY || import.meta.env.VITE_GEOAPIFY_API_KEY;

interface LocationSearchProps {
    currentLocation: LocationInfo;
    onDestinationSelect: (location: LocationInfo | null) => void;
    language: 'en' | 'vi';
}

const LocationSearch: React.FC<LocationSearchProps> = ({ currentLocation, onDestinationSelect, language }) => {
    const { t } = useTranslation();
    const geocoderContainerRef = useRef<HTMLDivElement>(null);
    const geocoderRef = useRef<any>(null);

    useEffect(() => {
        // Guard conditions: Only proceed if we have everything we need.
        if (!GEOAPIFY_API_KEY || !geocoderContainerRef.current || !currentLocation) {
            return;
        }

        // Cleanup previous instance if it exists, just in case.
        if (geocoderRef.current) {
            geocoderRef.current.destroy();
            geocoderRef.current = null;
        }

        try {
            const supportedLanguages = ['bg', 'ca', 'cs', 'da', 'de', 'el', 'en-GB', 'en', 'es', 'et', 'fi', 'fr', 'hi', 'hu', 'it', 'ja', 'nb-NO', 'nl', 'pl', 'pt-BR', 'pt', 'ro', 'ru', 'sk', 'sl', 'sv', 'tr', 'uk'];
            const supportedLang = supportedLanguages.includes(language) ? language : 'en';

            const autocompleteOptions = {
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
                geocoderContainerRef.current,
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
            console.error("Geocoder initialization error:", error);
        }

        // Cleanup function for when the component is unmounted
        return () => {
            if (geocoderRef.current) {
                geocoderRef.current.destroy();
                geocoderRef.current = null;
            }
        };
    }, [GEOAPIFY_API_KEY, currentLocation, language, onDestinationSelect, t]); // Effect depends on these props

    return <div ref={geocoderContainerRef} />;
};

export default LocationSearch;
