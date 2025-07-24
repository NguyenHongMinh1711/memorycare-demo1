
import React, { useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon } from '../../constants';

interface NotificationBannerProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onDismiss?: () => void;
  duration?: number; // Duration in ms, 0 for persistent
}

const NotificationBanner: React.FC<NotificationBannerProps> = ({ message, type, onDismiss, duration = 5000 }) => {
  useEffect(() => {
    if (duration > 0 && onDismiss) {
      const timer = setTimeout(() => {
        onDismiss();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onDismiss]);

  const baseStyles = 'p-4 rounded-lg shadow-md flex items-center space-x-3 text-white mb-4';
  const typeStyles = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-sky-500',
  };

  const Icon = {
    success: <CheckCircleIcon className="w-6 h-6" />,
    error: <XCircleIcon className="w-6 h-6" />,
    info: <InformationCircleIcon className="w-6 h-6" />,
  }[type];

  return (
    <div className={`${baseStyles} ${typeStyles[type]}`}>
      {Icon}
      <span>{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="ml-auto text-white hover:text-opacity-80">
          &times;
        </button>
      )}
    </div>
  );
};

export default NotificationBanner;
