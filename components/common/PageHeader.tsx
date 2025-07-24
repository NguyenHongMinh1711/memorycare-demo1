import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, icon }) => {
  return (
    <div className="mb-8 pb-4 border-b border-slate-200">
      <div className="flex items-center space-x-4">
        {icon && <div className="text-indigo-600 bg-indigo-100 p-3 rounded-xl">{icon}</div>}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-slate-600 text-base md:text-lg">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
};

export default PageHeader;