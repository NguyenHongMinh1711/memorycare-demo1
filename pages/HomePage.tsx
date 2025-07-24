import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpenIcon, CalendarIcon, MapPinIcon, HomeIcon } from '../constants';
import PageHeader from '../components/common/PageHeader';
import { useTranslation } from '../contexts';

const HomePage: React.FC = () => {
  const { t } = useTranslation();
  
  const features = [
    {
      path: '/memory-log',
      title: t('featureMemoryLogTitle'),
      description: t('featureMemoryLogDesc'),
      icon: <BookOpenIcon className="w-10 h-10 text-indigo-600" />,
    },
    {
      path: '/activity-planner',
      title: t('featurePlannerTitle'),
      description: t('featurePlannerDesc'),
      icon: <CalendarIcon className="w-10 h-10 text-indigo-600" />,
    },
    {
      path: '/location',
      title: t('featureLocationTitle'),
      description: t('featureLocationDesc'),
      icon: <MapPinIcon className="w-10 h-10 text-indigo-600" />,
    },
  ];

  return (
    <div className="animate-fadeIn">
      <PageHeader title={t('welcomeTitle')} subtitle={t('welcomeSubtitle')} icon={<HomeIcon className="w-10 h-10" />} />
      
      <div className="text-center mb-12 bg-white p-6 rounded-xl shadow-sm">
        <p className="text-lg text-slate-700">
          {t('welcomeMessage')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature) => (
          <Link
            key={feature.path}
            to={feature.path}
            className="group block bg-white p-6 rounded-xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >
            <div className="flex flex-col items-center text-center">
              <div className="p-4 bg-indigo-100 rounded-full mb-5 transition-transform duration-300 group-hover:scale-110">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">{feature.title}</h3>
              <p className="text-slate-600 text-sm">{feature.description}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-16 p-6 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-800">
        <h4 className="text-lg font-semibold mb-2">{t('reminderTitle')}</h4>
        <p>
          {t('reminderText')}
        </p>
      </div>
    </div>
  );
};

export default HomePage;