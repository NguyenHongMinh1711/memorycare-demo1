import React from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import MemoryLogPage from '../pages/MemoryLogPage';
import ActivityPlannerPage from '../pages/ActivityPlannerPage';
import LocationServicesPage from '../pages/LocationServicesPage';
import SettingsPage from '../pages/FamilySettingsPage';
import MyStoryPage from '../pages/MyStoryPage'; // Import the new page
import { HomeIcon, BookOpenIcon, CalendarIcon, MapPinIcon, Cog6ToothIcon, PencilIcon } from '../constants';
import { useTranslation } from '../contexts';

const MainLayout: React.FC = () => {
  const location = useLocation();
  const { language, setLanguage, t } = useTranslation();

  const navItems = [
    { path: '/', label: t('navHome'), icon: <HomeIcon className="w-6 h-6" /> },
    { path: '/memory-log', label: t('navMemoryLog'), icon: <BookOpenIcon className="w-6 h-6" /> },
    { path: '/my-story', label: t('navMyStory'), icon: <PencilIcon className="w-6 h-6" /> },
    { path: '/activity-planner', label: t('navPlanner'), icon: <CalendarIcon className="w-6 h-6" /> },
    { path: '/location', label: t('navLocation'), icon: <MapPinIcon className="w-6 h-6" /> },
    { path: '/settings', label: t('navSettings'), icon: <Cog6ToothIcon className="w-6 h-6" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-white text-slate-800 p-4 shadow-md flex justify-between items-center sticky top-0 z-40 h-[72px] border-b">
        <h1 className="text-2xl font-bold text-indigo-600">{t('headerTitle')}</h1>
        <div className="flex items-center space-x-2 md:space-x-4">
          <div className="flex items-center space-x-2">
             <select
                id="language-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'en' | 'vi')}
                className="bg-slate-100 text-slate-800 rounded-md py-2 pl-3 pr-8 border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                aria-label={t('language')}
              >
                <option value="en">English</option>
                <option value="vi">Tiếng Việt</option>
              </select>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <nav className="hidden md:block bg-white w-64 p-4 space-y-2 sticky top-[72px] h-screen-minus-header shadow-sm border-r">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center text-base p-3 rounded-lg transition-colors duration-200 ease-in-out group ${
                  isActive 
                  ? 'bg-indigo-50 text-indigo-700 font-bold' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                {React.cloneElement(item.icon, { className: `w-6 h-6 mr-3 transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}` })}
                {item.label}
              </Link>
            )
          })}
        </nav>

        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto pb-24 md:pb-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/memory-log" element={<MemoryLogPage />} />
            <Route path="/my-story" element={<MyStoryPage />} />
            <Route path="/activity-planner" element={<ActivityPlannerPage />} />
            <Route path="/location" element={<LocationServicesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-1 z-40">
        {navItems.map((item) => {
           const isActive = location.pathname === item.path;
           return (
            <Link
              key={`mobile-${item.path}`}
              to={item.path}
              className={`flex flex-col items-center justify-center text-xs w-16 h-14 rounded-lg transition-colors duration-200 ease-in-out ${
                isActive
                ? 'text-indigo-600'
                : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {React.cloneElement(item.icon, { className: 'w-6 h-6 mb-1' })}
              <span className={`${isActive ? "font-bold" : "font-normal"}`}>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  );
};

export default MainLayout;
