import React, { useState, useRef } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { useTranslation } from '../contexts';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import { Cog6ToothIcon, PlusIcon, TrashIcon, ArrowDownTrayIcon, ArrowUpTrayIcon } from '../constants';
import NotificationBanner from '../components/common/NotificationBanner';
import Modal from '../components/common/Modal';

const LOCAL_STORAGE_KEYS = [
  'memorycare_people', 
  'memorycare_journalEntries', 
  'memorycare_activities',
  'memorycare_homeLocation',
  'memorycare_saved_locations',
  'memorycare_family_emails',
  'theme',
  'language'
];

const SettingsPage: React.FC = () => {
    const { t } = useTranslation();

    const [familyEmails, setFamilyEmails] = useLocalStorage<string[]>('memorycare_family_emails', []);
    const [newEmail, setNewEmail] = useState('');
    const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importedData, setImportedData] = useState<any | null>(null);
    const importFileRef = useRef<HTMLInputElement>(null);


    const handleAddEmail = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedEmail = newEmail.trim();
        if (trimmedEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            if (!familyEmails.map(e => e.toLowerCase()).includes(trimmedEmail.toLowerCase())) {
                setFamilyEmails(prev => [...prev, trimmedEmail]);
                setNotification({ message: t('familyEmailAddedSuccess', trimmedEmail), type: 'success' });
                setNewEmail('');
            } else {
                setNotification({ message: t('familyEmailExistsError', trimmedEmail), type: 'error' });
            }
        } else {
            setNotification({ message: t('familyEmailInvalidError'), type: 'error' });
        }
    };

    const handleDeleteEmail = (emailToDelete: string) => {
        if (window.confirm(t('confirmDeleteEmail', emailToDelete))) {
            setFamilyEmails(prev => prev.filter(email => email.toLowerCase() !== emailToDelete.toLowerCase()));
            setNotification({ message: t('familyEmailDeletedInfo', emailToDelete), type: 'info' });
        }
    };
    
    const handleExportData = () => {
        const exportData: { [key: string]: any } = {};
        LOCAL_STORAGE_KEYS.forEach(key => {
            const value = localStorage.getItem(key);
            if (value !== null) {
                try {
                    exportData[key] = JSON.parse(value);
                } catch(e) {
                    console.error(`Could not parse localStorage key "${key}" during export. Storing as is.`, e);
                    exportData[key] = value;
                }
            }
        });
        
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportData, null, 2))}`;
        const link = document.createElement("a");
        link.href = jsonString;
        const date = new Date().toISOString().split('T')[0];
        link.download = `memorycare_backup_${date}.json`;
        link.click();
    };
    
    const handleImportClick = () => {
        importFileRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error("File content is not readable text.");
                
                const data = JSON.parse(text);
                // Simple validation: check if at least one of our keys exists.
                if (Object.keys(data).some(key => LOCAL_STORAGE_KEYS.includes(key))) {
                    setImportedData(data);
                    setIsImportModalOpen(true);
                } else {
                    setNotification({ message: t('importErrorInvalidFile'), type: 'error'});
                }
            } catch (error) {
                setNotification({ message: t('importErrorReadFile'), type: 'error'});
                console.error("Error reading or parsing import file:", error);
            }
        };
        reader.onerror = () => {
             setNotification({ message: t('importErrorReadFile'), type: 'error'});
        }
        reader.readAsText(file);
        event.target.value = ''; // Reset file input
    };

    const handleConfirmOverwrite = () => {
        if (!importedData) return;

        Object.keys(importedData).forEach(key => {
            if (LOCAL_STORAGE_KEYS.includes(key)) {
                localStorage.setItem(key, JSON.stringify(importedData[key]));
            }
        });

        setIsImportModalOpen(false);
        setImportedData(null);
        setNotification({ message: t('importSuccessOverwrite'), type: 'success' });

        // Reload the page to apply all settings from localStorage
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    };

    const handleConfirmMerge = () => {
        if (!importedData) return;

        LOCAL_STORAGE_KEYS.forEach(key => {
            const importedValue = importedData[key];
            if (importedValue === undefined) {
                return; // Key not in backup, skip
            }

            const currentValueJSON = localStorage.getItem(key);
            
            const arrayMergeKeys = ['memorycare_people', 'memorycare_journalEntries', 'memorycare_activities', 'memorycare_saved_locations'];
            const stringArrayMergeKeys = ['memorycare_family_emails'];

            if (arrayMergeKeys.includes(key)) {
                const currentValue = currentValueJSON ? JSON.parse(currentValueJSON) : [];
                if (!Array.isArray(currentValue) || !Array.isArray(importedValue)) {
                    localStorage.setItem(key, JSON.stringify(importedValue)); // Overwrite if types are unexpected
                    return;
                }
                const mergedMap = new Map();
                currentValue.forEach(item => item?.id && mergedMap.set(item.id, item));
                importedValue.forEach(item => item?.id && mergedMap.set(item.id, item));
                localStorage.setItem(key, JSON.stringify(Array.from(mergedMap.values())));
            } else if (stringArrayMergeKeys.includes(key)) {
                const currentValue = currentValueJSON ? JSON.parse(currentValueJSON) : [];
                if (!Array.isArray(currentValue) || !Array.isArray(importedValue)) {
                    localStorage.setItem(key, JSON.stringify(importedValue)); // Overwrite if types are unexpected
                    return;
                }
                const mergedSet = new Set([...currentValue, ...importedValue]);
                localStorage.setItem(key, JSON.stringify(Array.from(mergedSet)));
            } else {
                // For simple values (theme, language, homeLocation), imported value overwrites
                localStorage.setItem(key, JSON.stringify(importedValue));
            }
        });

        setIsImportModalOpen(false);
        setImportedData(null);
        setNotification({ message: t('importSuccessMerge'), type: 'success' });

        setTimeout(() => {
            window.location.reload();
        }, 2000);
    };


    return (
        <div className="animate-fadeIn space-y-10">
            <PageHeader title={t('pageTitleSettings')} subtitle={t('pageSubtitleSettings')} icon={<Cog6ToothIcon className="w-10 h-10" />} />
            
            {notification && <NotificationBanner message={notification.message} type={notification.type} onDismiss={() => setNotification(null)} />}

            {/* Data Management Section */}
            <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-bold text-slate-800 mb-2">{t('dataManagementTitle')}</h3>
                <p className="text-slate-600 mb-6">{t('dataManagementSubtitle')}</p>
                <div className="flex flex-col sm:flex-row gap-4">
                    <Button onClick={handleExportData} size="md" leftIcon={<ArrowDownTrayIcon className="w-5 h-5"/>} variant="secondary">
                        {t('exportDataButton')}
                    </Button>
                    <Button onClick={handleImportClick} size="md" leftIcon={<ArrowUpTrayIcon className="w-5 h-5"/>} variant="primary">
                        {t('importDataButton')}
                    </Button>
                    <input type="file" ref={importFileRef} onChange={handleFileChange} accept=".json" className="hidden" />
                </div>
            </div>

            {/* Family Contacts Section */}
            <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-bold text-slate-800 mb-6">{t('familyContactsSectionTitle')}</h3>
                <form onSubmit={handleAddEmail} className="flex flex-col sm:flex-row items-stretch gap-3 mb-8">
                    <label htmlFor="email-input" className="sr-only">{t('familyEmailInputPlaceholder')}</label>
                    <input
                        id="email-input"
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder={t('familyEmailInputPlaceholder')}
                        className="flex-grow w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base text-slate-900 placeholder:text-slate-400"
                    />
                    <Button type="submit" size="md" leftIcon={<PlusIcon className="w-5 h-5"/>} className="flex-shrink-0">
                        {t('addFamilyEmailButton')}
                    </Button>
                </form>

                {familyEmails.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">{t('noFamilyEmails')}</p>
                ) : (
                    <ul className="space-y-3">
                        {familyEmails.map((email) => (
                            <li key={email} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border">
                                <span className="text-base text-slate-800 break-all mr-4">{email}</span>
                                <Button
                                    onClick={() => handleDeleteEmail(email)}
                                    variant="danger"
                                    size="sm"
                                    aria-label={`Delete ${email}`}
                                    title={`Delete ${email}`}
                                >
                                    <TrashIcon className="w-5 h-5"/>
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            
            <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title={t('importConfirmTitle')}>
                <div className="space-y-6">
                    <p className="text-base text-slate-600">
                        {t('importConfirmMessage')}
                    </p>
                    <div className="flex justify-end space-x-3">
                        <Button variant="secondary" size="md" onClick={() => setIsImportModalOpen(false)}>
                            {t('formCancelButton')}
                        </Button>
                        <Button variant="primary" size="md" onClick={handleConfirmMerge}>
                            {t('mergeDataButton')}
                        </Button>
                        <Button variant="danger" size="md" onClick={handleConfirmOverwrite}>
                            {t('overwriteDataButton')}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default SettingsPage;