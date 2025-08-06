import React from 'react';
import { MapPinIcon } from '../constants';
import Button from './common/Button';
import { useTranslation } from '../contexts';

interface LocationPermissionBannerProps {
    onRequestPermission: () => void;
    onDismiss: () => void;
}

const LocationPermissionBanner: React.FC<LocationPermissionBannerProps> = ({ onRequestPermission, onDismiss }) => {
    const { t } = useTranslation();

    return (
        <div className="bg-sky-100 border-l-4 border-sky-500 text-sky-800 p-4 rounded-r-lg mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn" role="alert">
            <div className="flex items-start sm:items-center">
                <MapPinIcon className="w-6 h-6 mr-3 flex-shrink-0" />
                <div>
                    <p className="font-bold">{t('locationPermissionBannerTitle')}</p>
                    <p className="text-sm">{t('locationPermissionBannerBody')}</p>
                </div>
            </div>
            <div className="flex space-x-3 self-end sm:self-center flex-shrink-0">
                <Button onClick={onRequestPermission} variant="primary" size="sm">
                    {t('enableButton')}
                </Button>
                <Button onClick={onDismiss} variant="secondary" size="sm">
                    {t('notNowButton')}
                </Button>
            </div>
        </div>
    );
};

export default LocationPermissionBanner;
