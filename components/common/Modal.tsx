import React, { useEffect, useRef } from 'react';
import { XCircleIcon } from '../../constants';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = `modal-title-${React.useId()}`;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      modalRef.current?.focus(); // Focus the modal itself initially
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);
  
  // Focus trapping
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };
    const currentModalRef = modalRef.current;
    currentModalRef.addEventListener('keydown', handleTabKeyPress);
    return () => currentModalRef?.removeEventListener('keydown', handleTabKeyPress);
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div 
        ref={modalRef}
        tabIndex={-1}
        className={`bg-slate-50 rounded-xl shadow-2xl w-full ${sizeClasses[size]} flex flex-col animate-scaleIn`}
      >
        <div className="flex justify-between items-center p-5 border-b border-slate-200">
          <h2 id={titleId} className="text-xl font-semibold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-indigo-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-full" aria-label="Close modal">
            <XCircleIcon className="w-8 h-8" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto bg-white rounded-b-xl">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;