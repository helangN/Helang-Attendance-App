import React from 'react';
import { Calendar, FileText, Home, User } from 'lucide-react';

interface EmployeeBottomNavProps {
  currentTab: 'HOME' | 'ATTENDANCE' | 'REPORTS' | 'PROFILE';
  onSelectTab: (tab: 'HOME' | 'ATTENDANCE' | 'REPORTS' | 'PROFILE') => void;
}

export const EmployeeBottomNav: React.FC<EmployeeBottomNavProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const tabs = [
    { id: 'HOME', label: 'HOME', icon: Home },
    { id: 'ATTENDANCE', label: 'ATTENDANCE', icon: Calendar },
    { id: 'REPORTS', label: 'REPORTS', icon: FileText },
    { id: 'PROFILE', label: 'PROFILE', icon: User },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 shadow-2xl backdrop-blur-md pb-safe">
      <div className="max-w-md mx-auto grid grid-cols-4 h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 transition ${
                isActive ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div
                className={`p-1 rounded-xl transition ${
                  isActive ? 'bg-blue-600/20 text-blue-400' : ''
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] tracking-wider uppercase font-semibold leading-none">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
