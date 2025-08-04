import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import useLocalStorage from '../hooks/useLocalStorage';
import { Activity, Person } from '../types';
import PageHeader from '../components/common/PageHeader';
import { useTranslation } from '../contexts';
import { HomeIcon, CalendarIcon, UserCircleIcon, BookOpenIcon, MapPinIcon } from '../constants';
import Button from '../components/common/Button';

const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const [activities] = useLocalStorage<Activity[]>('memorycare_activities', []);
  const [people] = useLocalStorage<Person[]>('memorycare_people', []);
  const [personInFocus, setPersonInFocus] = useState<Person | null>(null);

  const todaysActivities = useMemo(() => {
    return [...activities].sort((a, b) => a.time.localeCompare(b.time));
  }, [activities]);

  useEffect(() => {
    if (people.length > 0) {
      const randomIndex = Math.floor(Math.random() * people.length);
      setPersonInFocus(people[randomIndex]);
    } else {
      setPersonInFocus(null);
    }
  }, [people]);

  const features = [
    {
      path: '/memory-log',
      title: t('featureMemoryLogTitle'),
      description: t('featureMemoryLogDesc'),
      icon: <BookOpenIcon className="w-8 h-8 text-indigo-600" />,
    },
    {
      path: '/activity-planner',
      title: t('featurePlannerTitle'),
      description: t('featurePlannerDesc'),
      icon: <CalendarIcon className="w-8 h-8 text-indigo-600" />,
    },
    {
      path: '/location',
      title: t('featureLocationTitle'),
      description: t('featureLocationDesc'),
      icon: <MapPinIcon className="w-8 h-8 text-indigo-600" />,
    },
  ];

  return (
    <div className="animate-fadeIn space-y-8">
      <PageHeader title={t('welcomeTitle')} subtitle={t('welcomeSubtitle')} icon={<HomeIcon className="w-10 h-10" />} />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-8">
          <div className="bg-white p-6 rounded-xl shadow-md h-full">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
              <CalendarIcon className="w-6 h-6 mr-3 text-indigo-500" />
              {t('todaysSchedule')}
            </h3>
            {todaysActivities.length > 0 ? (
              <ul className="space-y-3 max-h-96 overflow-y-auto">
                {todaysActivities.map(activity => (
                  <li key={activity.id} className="flex items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="font-bold text-indigo-600 w-20 flex-shrink-0">{activity.time}</span>
                    <span className="text-slate-700">{activity.name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-500 mb-4">{t('noActivitiesToday')}</p>
                <Link to="/activity-planner">
                  <Button variant="primary" size="sm" type="button" tabIndex={-1}>{t('goToPlanner')}</Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
              <UserCircleIcon className="w-6 h-6 mr-3 text-indigo-500" />
              {t('familiarFace')}
            </h3>
            {personInFocus ? (
              <div className="flex flex-col items-center text-center">
                <img src={personInFocus.photoUrl || `https://i.pravatar.cc/150?u=${personInFocus.id}`} alt={personInFocus.name} className="w-32 h-32 rounded-full object-cover border-4 border-indigo-100 mb-4"/>
                <h4 className="text-lg font-semibold text-slate-900">{personInFocus.name}</h4>
                <p className="text-slate-600">{personInFocus.relationship}</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-500 mb-4">{t('noPeopleToAdd')}</p>
                <Link to="/memory-log">
                    <Button variant="primary" size="sm" type="button" tabIndex={-1}>{t('goToMemoryLog')}</Button>
                </Link>
              </div>
            )}
          </div>
          
          <div>
            <h3 className="text-xl font-bold text-slate-800 mb-4">{t('quickActions')}</h3>
            <div className="space-y-4">
              {features.map((feature) => (
                <Link
                  key={feature.path}
                  to={feature.path}
                  className="group flex items-center bg-white p-4 rounded-xl shadow-md hover:shadow-lg hover:bg-indigo-50 transition-all duration-200"
                >
                  <div className="p-3 bg-indigo-100 rounded-lg mr-4">
                    {feature.icon}
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-slate-800">{feature.title}</h4>
                    <p className="text-slate-600 text-sm">{feature.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
