import React, { useState, useEffect, useCallback } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { Activity } from '../types';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import { PlusIcon, TrashIcon, CalendarIcon, SpeakerWaveIcon, ShareIcon, PencilIcon } from '../constants';
import useTextToSpeech from '../hooks/useTextToSpeech';
import PageHeader from '../components/common/PageHeader';
import NotificationBanner from '../components/common/NotificationBanner';
import { useTranslation } from '../contexts';
import AIAssistant from '../components/AIAssistant';

interface AddActivityFormProps {
    onSave: (activity: Omit<Activity, 'id'> & { id?: string }) => void;
    onClose: () => void;
    existingActivity: Activity | null;
}

const AddActivityForm: React.FC<AddActivityFormProps> = ({ onSave, onClose, existingActivity }) => {
  const [name, setName] = useState(existingActivity?.name || '');
  const [time, setTime] = useState(existingActivity?.time || '');
  const [description, setDescription] = useState(existingActivity?.description || '');
  const [isRecurring, setIsRecurring] = useState(existingActivity?.isRecurring || false);
  const { t } = useTranslation();
  const isEditMode = !!existingActivity;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !time) {
        alert(t('formTimeRequiredAlert'));
        return;
    }
    onSave({ id: existingActivity?.id, name, time, description, isRecurring });
    onClose();
  };
  
  const formInputStyle = "mt-1 block w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base text-slate-900 placeholder:text-slate-400";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="activityName" className="block text-sm font-medium text-slate-700">{t('formActivityNameLabel')}</label>
        <input type="text" id="activityName" value={name} onChange={(e) => setName(e.target.value)} required className={formInputStyle} />
      </div>
      <div>
        <label htmlFor="activityTime" className="block text-sm font-medium text-slate-700">{t('formTimeLabel')}</label>
        <input type="time" id="activityTime" value={time} onChange={(e) => setTime(e.target.value)} required className={formInputStyle} />
      </div>
      <div>
        <label htmlFor="activityDescription" className="block text-sm font-medium text-slate-700">{t('formDescriptionLabel')}</label>
        <textarea id="activityDescription" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={formInputStyle}></textarea>
      </div>
      <div className="flex items-center pt-2">
        <input type="checkbox" id="isRecurring" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="h-5 w-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500" />
        <label htmlFor="isRecurring" className="ml-3 block text-base text-slate-700">{t('formRecurringLabel')}</label>
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="secondary" onClick={onClose} size="md">{t('formCancelButton')}</Button>
        <Button type="submit" variant="primary" size="md">{isEditMode ? t('formUpdateActivityButton') : t('formAddActivityButton')}</Button>
      </div>
    </form>
  );
};

const ActivityItem: React.FC<{ activity: Activity; onDelete: (id: string) => void; onRemind: (activity: Activity) => void; onEdit: (activity: Activity) => void; }> = ({ activity, onDelete, onRemind, onEdit }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
      <div className="flex-1">
        <h4 className="text-lg font-bold text-slate-800">{activity.name}</h4>
        <p className="text-indigo-600 font-semibold">{activity.time}</p>
        {activity.description && <p className="text-slate-500 mt-1 text-sm">{activity.description}</p>}
        {activity.isRecurring && <p className="text-xs text-blue-600 mt-2 font-semibold uppercase tracking-wide">{t('formRecurringLabel')}</p>}
      </div>
      <div className="flex space-x-2 w-full sm:w-auto">
        <Button onClick={() => onRemind(activity)} variant="ghost" size="sm" leftIcon={<SpeakerWaveIcon className="w-5 h-5"/>}>{t('remindButton')}</Button>
        <Button onClick={() => onEdit(activity)} variant="secondary" size="sm" leftIcon={<PencilIcon className="w-5 h-5"/>}>{t('editButton')}</Button>
        <Button onClick={() => onDelete(activity.id)} variant="danger" size="sm" leftIcon={<TrashIcon className="w-5 h-5"/>}>{t('deleteButton')}</Button>
      </div>
    </div>
  );
};

const ActivityPlannerPage: React.FC = () => {
  const { t } = useTranslation();
  
  const [activities, setActivities] = useLocalStorage<Activity[]>('memorycare_activities', []);
  const [familyEmails] = useLocalStorage<string[]>('memorycare_family_emails', []);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const { speak, isSupported: ttsSupported, error: ttsError } = useTextToSpeech();

  const handleOpenModal = (activity: Activity | null) => {
    setEditingActivity(activity);
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingActivity(null);
  };

  const handleSaveActivity = (activityData: Omit<Activity, 'id'> & { id?: string }) => {
    const isEditing = !!activityData.id;
    if (isEditing) {
        const updatedActivity = { ...activityData, id: activityData.id! };
        setActivities(prev => prev.map(a => a.id === updatedActivity.id ? updatedActivity : a).sort((a,b) => a.time.localeCompare(b.time)));
        setNotification({ message: t('activityUpdatedSuccess', updatedActivity.name), type: 'success'});
    } else {
        const newActivity: Activity = { ...activityData, id: Date.now().toString() };
        setActivities((prev) => [...prev, newActivity].sort((a,b) => a.time.localeCompare(b.time)));
        setNotification({ message: t('activityAddedSuccess', newActivity.name), type: 'success'});
    }
  };

  const handleDeleteActivity = (id: string) => {
    if (window.confirm(t('confirmDeleteActivity'))) {
      setActivities((prev) => prev.filter(act => act.id !== id));
      setNotification({ message: t('activityDeletedInfo'), type: 'info'});
    }
  };

  const handleRemind = useCallback((activity: Activity) => {
    const reminderText = t('activityReminderSpeech', activity.name, activity.time, activity.description || '');
    if (ttsSupported) {
      speak(reminderText, {
        onLanguageUnavailable: () => {
          setNotification({ message: t('ttsLanguageUnavailableError'), type: 'error'});
          alert(reminderText); // Fallback to alert if voice is unavailable
        }
      });
      setNotification({ message: t('remindSentInfo', activity.name), type: 'info'});
    } else {
      alert(reminderText);
      setNotification({ message: t('ttsAlertMessage'), type: 'info'});
    }
  }, [ttsSupported, speak, setNotification, t]);

  const handleSharePlan = () => {
    if (familyEmails.length > 0) {
        const emailList = familyEmails.join(',');
        const subject = t('sharePlanEmailSubject');
        const bodyHeader = t('sharePlanEmailBodyHeader');
        const activitiesList = activities.length > 0
          ? activities.map(act => `- ${act.time}: ${act.name} ${act.description ? `(${act.description})` : ''}`).join('\n')
          : t('noActivitiesYet');
        
        const mailtoLink = `mailto:${emailList}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyHeader + activitiesList)}`;
        
        window.location.href = mailtoLink;
    } else {
        const message = t('sharePlanNoEmails');
        setNotification({ message, type: 'error' });
        if (ttsSupported) speak(message);
    }
  };

  // Effect for timed reminders
  useEffect(() => {
    const timeoutIds: number[] = [];

    activities.forEach(activity => {
      const [hours, minutes] = activity.time.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) return;

      const now = new Date();
      const activityTime = new Date(now);
      activityTime.setHours(hours, minutes, 0, 0);

      const delay = activityTime.getTime() - now.getTime();

      if (delay > 0) {
        const timeoutId = window.setTimeout(() => {
          handleRemind(activity);
        }, delay);
        timeoutIds.push(timeoutId);
      }
    });

    return () => {
      timeoutIds.forEach(id => clearTimeout(id));
    };
  }, [activities, handleRemind]);
  
  const aiSystemInstruction = "You are a friendly and patient assistant for a person with memory care needs. Your task is to suggest simple, safe, and engaging activities. Suggest one activity at a time unless asked for a list. Examples include light walks, listening to favorite music, simple puzzles, looking at photo albums, or talking about a happy memory. Keep your tone encouraging and your suggestions concise.";

  return (
    <div className="space-y-10 animate-fadeIn">
      <PageHeader title={t('pageTitlePlanner')} subtitle={t('pageSubtitlePlanner')} icon={<CalendarIcon className="w-10 h-10" />} />
      
      {notification && <NotificationBanner message={notification.message} type={notification.type} onDismiss={() => setNotification(null)} />}
      {ttsError && <NotificationBanner message={`Text-to-speech error: ${ttsError}`} type="error" onDismiss={() => {}} />}


      <div className="flex justify-end mb-6 space-x-3">
        <Button onClick={handleSharePlan} leftIcon={<ShareIcon className="w-5 h-5"/>} size="md" variant="secondary">{t('sharePlanButton')}</Button>
        <Button onClick={() => handleOpenModal(null)} leftIcon={<PlusIcon className="w-5 h-5"/>} size="md">{t('addActivityButton')}</Button>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-10 px-4 bg-white rounded-xl shadow-sm">
          <CalendarIcon className="w-16 h-16 mx-auto text-slate-300" />
          <p className="text-slate-500 text-lg mt-4">{t('noActivitiesYet')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map(activity => (
            <ActivityItem key={activity.id} activity={activity} onDelete={handleDeleteActivity} onRemind={handleRemind} onEdit={() => handleOpenModal(activity)} />
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingActivity ? t('modalEditActivityTitle') : t('modalAddActivityTitle')}>
        <AddActivityForm onSave={handleSaveActivity} onClose={handleCloseModal} existingActivity={editingActivity} />
      </Modal>

      <AIAssistant systemInstruction={aiSystemInstruction} />
    </div>
  );
};

export default ActivityPlannerPage;