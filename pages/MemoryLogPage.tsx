import React, { useState, useCallback, useMemo, useEffect } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { Person, JournalEntry } from '../types';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import { PlusIcon, TrashIcon, MicrophoneIcon, SpeakerWaveIcon, BookOpenIcon, UserCircleIcon, PencilIcon } from '../constants';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import useTextToSpeech from '../hooks/useTextToSpeech';
import PageHeader from '../components/common/PageHeader';
import NotificationBanner from '../components/common/NotificationBanner';
import { useTranslation } from '../contexts';
import { generateTagsForJournal } from '../services/geminiService';
import AIAssistant from '../components/AIAssistant';

const PersonCard: React.FC<{ person: Person; onDelete: (id: string) => void; onSpeak: (text: string) => void; onEdit: (person: Person) => void; }> = ({ person, onDelete, onSpeak, onEdit }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col sm:flex-row items-center sm:space-x-6 space-y-4 sm:space-y-0">
      <img src={person.photoUrl || `https://i.pravatar.cc/150?u=${person.id}`} alt={person.name} className="w-28 h-28 rounded-full object-cover border-4 border-indigo-100" />
      <div className="flex-1 text-center sm:text-left">
        <h3 className="text-xl font-bold text-slate-800">{person.name}</h3>
        <p className="text-slate-600">{person.relationship}</p>
        <p className="text-slate-500 mt-2 text-sm">{person.keyInfo}</p>
        {person.voiceNoteUrl && (
          <audio controls src={person.voiceNoteUrl} className="mt-2 w-full max-w-xs">
            Your browser does not support the audio element.
          </audio>
        )}
      </div>
      <div className="flex space-x-2 sm:flex-col sm:space-x-0 sm:space-y-2">
        <Button onClick={() => onSpeak(t('personRecallSpeech', person.name, person.relationship, person.keyInfo))} variant="ghost" size="sm" leftIcon={<SpeakerWaveIcon className="w-5 h-5"/>} aria-label={t('recallButton')}>
          <span className="hidden sm:inline">{t('recallButton')}</span>
        </Button>
         <Button onClick={() => onEdit(person)} variant="secondary" size="sm" leftIcon={<PencilIcon className="w-5 h-5"/>} aria-label={t('editButton')}>
           <span className="hidden sm:inline">{t('editButton')}</span>
        </Button>
        <Button onClick={() => onDelete(person.id)} variant="danger" size="sm" leftIcon={<TrashIcon className="w-5 h-5"/>} aria-label={t('deleteButton')}>
           <span className="hidden sm:inline">{t('deleteButton')}</span>
        </Button>
      </div>
    </div>
  );
};

interface AddPersonFormProps {
    onSave: (person: Omit<Person, 'id'> & { id?: string }) => void;
    onClose: () => void;
    existingPerson: Person | null;
}

const AddPersonForm: React.FC<AddPersonFormProps> = ({ onSave, onClose, existingPerson }) => {
  const [name, setName] = useState(existingPerson?.name || '');
  const [relationship, setRelationship] = useState(existingPerson?.relationship || '');
  const [photoUrl, setPhotoUrl] = useState(existingPerson?.photoUrl || '');
  const [keyInfo, setKeyInfo] = useState(existingPerson?.keyInfo || '');
  const { t } = useTranslation();
  const isEditMode = !!existingPerson;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !relationship) {
        alert(t('formRequiredAlert'));
        return;
    }
    onSave({ id: existingPerson?.id, name, relationship, photoUrl, keyInfo });
    onClose();
  };
  
  const formInputStyle = "mt-1 block w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base text-slate-900 placeholder:text-slate-400";


  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-700">{t('formNameLabel')}</label>
        <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required className={formInputStyle} />
      </div>
      <div>
        <label htmlFor="relationship" className="block text-sm font-medium text-slate-700">{t('formRelationshipLabel')}</label>
        <input type="text" id="relationship" value={relationship} onChange={(e) => setRelationship(e.target.value)} required className={formInputStyle} />
      </div>
      <div>
        <label htmlFor="photoUrl" className="block text-sm font-medium text-slate-700">{t('formPhotoUrlLabel')}</label>
        <input type="url" id="photoUrl" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://i.pravatar.cc/150" className={formInputStyle} />
      </div>
      <div>
        <label htmlFor="keyInfo" className="block text-sm font-medium text-slate-700">{t('formKeyInfoLabel')}</label>
        <textarea id="keyInfo" value={keyInfo} onChange={(e) => setKeyInfo(e.target.value)} rows={3} className={formInputStyle}></textarea>
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="secondary" onClick={onClose} size="md">{t('formCancelButton')}</Button>
        <Button type="submit" variant="primary" size="md">{isEditMode ? t('formUpdateButton') : t('formAddButton')}</Button>
      </div>
    </form>
  );
};


const MemoryLogPage: React.FC = () => {
  const { t, language } = useTranslation();
  
  const [people, setPeople] = useLocalStorage<Person[]>('memorycare_people', []);
  const [journalEntries, setJournalEntries] = useLocalStorage<JournalEntry[]>('memorycare_journalEntries', []);
  
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);

  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [journalText, setJournalText] = useState('');

  const { isListening, transcript, startListening, stopListening, error: speechError, isSupported: speechSupported, resetTranscript } = useSpeechRecognition();
  const { speak, isSpeaking, error: ttsError, isSupported: ttsSupported } = useTextToSpeech();
  
  useEffect(() => {
    setJournalText(transcript);
  }, [transcript]);

  const handleOpenPersonModal = (person: Person | null) => {
    setEditingPerson(person);
    setIsPersonModalOpen(true);
  };
  
  const handleClosePersonModal = () => {
    setIsPersonModalOpen(false);
    setEditingPerson(null);
  };

  const handleSavePerson = (personData: Omit<Person, 'id'> & { id?: string }) => {
    const isEditing = !!personData.id;
    if (isEditing) {
        const updatedPerson = { ...personData, id: personData.id! };
        setPeople(prev => prev.map(p => p.id === updatedPerson.id ? updatedPerson : p));
        setNotification({ message: t('personUpdatedSuccess', updatedPerson.name), type: 'success'});
    } else {
        const newPerson: Person = { ...personData, id: Date.now().toString() };
        setPeople((prev) => [...prev, newPerson]);
        setNotification({ message: t('personAddedSuccess', newPerson.name), type: 'success'});
    }
  };

  const handleDeletePerson = (id: string) => {
    if (window.confirm(t('confirmDeletePerson'))) {
      setPeople((prev) => prev.filter(p => p.id !== id));
      setNotification({ message: t('personDeletedInfo'), type: 'info'});
    }
  };

  const handleAddJournalEntry = useCallback(async () => {
    if (journalText.trim()) {
      const newEntry: JournalEntry = { id: Date.now().toString(), timestamp: Date.now(), text: journalText.trim() };
      setJournalEntries((prev) => [newEntry, ...prev]); // Add to beginning
      setJournalText('');
      resetTranscript();
      setNotification({ message: t('journalSavedSuccess'), type: 'success'});

      // Generate tags with AI
      const tags = await generateTagsForJournal(newEntry.text, language);
      if (tags.length > 0) {
        setJournalEntries(prev => prev.map(entry => 
            entry.id === newEntry.id ? { ...entry, tags } : entry
        ));
      }

    } else {
        setNotification({ message: t('journalNoSpeechInfo'), type: 'info'});
    }
  }, [journalText, setJournalEntries, resetTranscript, t, language]);

  const handleDeleteJournalEntry = (id: string) => {
     if (window.confirm(t('confirmDeleteJournal'))) {
        setJournalEntries((prev) => prev.filter(entry => entry.id !== id));
        setNotification({ message: t('journalDeletedInfo'), type: 'info'});
     }
  };
  
  const handleSpeak = useCallback((textToSpeak: string) => {
    if (ttsSupported) {
      speak(textToSpeak, {
        onLanguageUnavailable: () => {
            setNotification({ message: t('ttsLanguageUnavailableError'), type: 'error'});
        }
      });
    } else {
      setNotification({ message: t('ttsNotSupportedError'), type: 'error'});
    }
  }, [ttsSupported, speak, t, setNotification]);


  const aiSystemInstruction = useMemo(() => {
    const peopleContext = people.length > 0 
        ? `Here is a list of important people: ${JSON.stringify(people.map(p => ({name: p.name, relationship: p.relationship, keyInfo: p.keyInfo})))}. Answer questions about them based only on this information.`
        : "There are no people saved in the memory log yet.";
    return `You are a friendly and patient assistant for a person with memory care needs. Your primary role is to help them recall information about people they know. ${peopleContext} If asked about someone not on the list, say you don't have information about them. Keep your answers simple, clear, and comforting.`;
  }, [people]);

  return (
    <div className="space-y-10 animate-fadeIn">
      <PageHeader title={t('pageTitleMemoryLog')} subtitle={t('pageSubtitleMemoryLog')} icon={<BookOpenIcon className="w-10 h-10" />} />

      {notification && <NotificationBanner message={notification.message} type={notification.type} onDismiss={() => setNotification(null)} />}
      {speechError && <NotificationBanner message={`Speech recognition error: ${speechError}`} type="error" onDismiss={() => { /* Manually clear error if needed */ }} />}
      {ttsError && <NotificationBanner message={`Text-to-speech error: ${ttsError}`} type="error" onDismiss={() => { /* Manually clear error if needed */ }} />}

      {/* People Section */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-slate-800 flex items-center"><UserCircleIcon className="w-8 h-8 mr-3 text-indigo-500"/>{t('peopleSectionTitle')}</h2>
          <Button onClick={() => handleOpenPersonModal(null)} leftIcon={<PlusIcon className="w-5 h-5"/>} size="md">{t('addPersonButton')}</Button>
        </div>
        {people.length === 0 ? (
          <div className="text-center py-10 px-4 bg-white rounded-xl shadow-sm">
            <UserCircleIcon className="w-16 h-16 mx-auto text-slate-300" />
            <p className="text-slate-500 text-lg mt-4">{t('noPeopleYet')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {people.map(person => (
              <PersonCard key={person.id} person={person} onDelete={handleDeletePerson} onSpeak={handleSpeak} onEdit={() => handleOpenPersonModal(person)} />
            ))}
          </div>
        )}
      </section>

      {/* Daily Journal Section */}
      <section>
        <h2 className="text-2xl font-semibold text-slate-800 mb-6">{t('journalSectionTitle')}</h2>
        <div className="bg-white p-6 rounded-xl shadow-md">
          <p className="text-slate-600 mb-4">{t('journalDescription')}</p>
          {!speechSupported && <p className="text-red-500">{t('speechNotSupported')}</p>}
          {speechSupported && (
            <div className="space-y-4">
              <textarea
                value={journalText}
                onChange={(e) => setJournalText(e.target.value)}
                placeholder={isListening ? t('listeningPlaceholder') : t('recordedThoughtsPlaceholder')}
                rows={4}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base text-slate-900 placeholder:text-slate-400"
                readOnly={isListening}
              />
              <div className="flex items-center flex-wrap gap-3">
                <Button
                  onClick={isListening ? stopListening : startListening}
                  variant={isListening ? "danger" : "primary"}
                  leftIcon={<MicrophoneIcon className="w-5 h-5"/>}
                  disabled={!speechSupported || isSpeaking}
                  size="md"
                >
                  {isListening ? t('stopRecordingButton') : t('startRecordingButton')}
                </Button>
                <Button onClick={handleAddJournalEntry} disabled={!journalText.trim() || isListening} size="md" variant="success">{t('saveEntryButton')}</Button>
              </div>
            </div>
          )}
        </div>

        {journalEntries.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xl font-semibold text-slate-700 mb-4">{t('pastEntriesTitle')}</h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 -mr-2">
              {journalEntries.map(entry => (
                <div key={entry.id} className="bg-white p-4 rounded-lg shadow-sm border">
                  <p className="text-xs text-slate-500 mb-2">{new Date(entry.timestamp).toLocaleString()}</p>
                  <p className="text-slate-800">{entry.text}</p>
                   {entry.tags && entry.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {entry.tags.map((tag, i) => (
                        <span key={i} className="px-2.5 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex space-x-2 border-t pt-3">
                    <Button onClick={() => handleSpeak(entry.text)} variant="ghost" size="sm" leftIcon={<SpeakerWaveIcon className="w-4 h-4"/>}>{t('readAloudButton')}</Button>
                    <Button onClick={() => handleDeleteJournalEntry(entry.id)} variant="danger" size="sm" leftIcon={<TrashIcon className="w-4 h-4"/>}>{t('deleteButton')}</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <Modal isOpen={isPersonModalOpen} onClose={handleClosePersonModal} title={editingPerson ? t('modalEditPersonTitle', editingPerson.name) : t('modalAddPersonTitle')}>
        <AddPersonForm onSave={handleSavePerson} onClose={handleClosePersonModal} existingPerson={editingPerson} />
      </Modal>

      <AIAssistant systemInstruction={aiSystemInstruction} />
    </div>
  );
};

export default MemoryLogPage;