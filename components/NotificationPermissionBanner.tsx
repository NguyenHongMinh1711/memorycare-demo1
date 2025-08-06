import React, { useState, useEffect } from 'react';
import { InformationCircleIcon } from '../constants';
import Button from './common/Button';
import { useTranslation } from '../contexts';

const NotificationPermissionBanner: React.FC = () => {
    const { t } = useTranslation();
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if ('Notification' in window) {
            setPermissionStatus(Notification.permission);
            // Show banner only if permission is 'default'
            if (Notification.permission === 'default') {
                setIsVisible(true);
            }
        }
    }, []);

    const handleRequestPermission = async () => {
        const result = await Notification.requestPermission();
        setPermissionStatus(result);
        setIsVisible(false); // Hide banner after interaction
    };

    const handleDismiss = () => {
        setIsVisible(false);
    };
    
    // Don't render anything if not visible or permission is not 'default'
    if (!isVisible || permissionStatus !== 'default') {
        return null;
    }

    return (
        <div className="bg-sky-100 border-l-4 border-sky-500 text-sky-800 p-4 rounded-r-lg mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn" role="alert">
            <div className="flex items-start sm:items-center">
                <InformationCircleIcon className="w-6 h-6 mr-3 flex-shrink-0" />
                <div>
                    <p className="font-bold">{t('notificationPermissionBannerTitle')}</p>
                    <p className="text-sm">{t('notificationPermissionBannerBody')}</p>
                </div>
            </div>
            <div className="flex space-x-3 self-end sm:self-center flex-shrink-0">
                <Button onClick={handleRequestPermission} variant="primary" size="sm">
                    {t('enableButton')}
                </Button>
                <Button onClick={handleDismiss} variant="secondary" size="sm">
                    {t('notNowButton')}
                </Button>
            </div>
        </div>
    );
};

export default NotificationPermissionBanner;
