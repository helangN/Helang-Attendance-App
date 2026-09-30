import React, { useEffect, useState } from 'react';
import {
  Building2,
  Clock,
  Globe,
  LogOut,
  MapPin,
  Menu,
  Shield,
  Smartphone,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab }) => {
  const { role, user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [liveTime, setLiveTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setLiveTime(
        new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }).format(now)
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const adminTabs = [
    { id: 'DASHBOARD', label: 'Dashboard' },
    { id: 'EMPLOYEES', label: 'Employees' },
    { id: 'ATTENDANCE', label: 'Attendance' },
    { id: 'REPORTS', label: 'Reports' },
    { id: 'HOLIDAYS', label: 'Holidays' },
    { id: 'SETTINGS', label: 'Settings' },
    { id: 'AUDIT', label: 'Audit Log' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">AttendFlow</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                  {role === 'ADMIN' ? 'Admin Console' : 'Staff Portal'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                GPS Geofence Attendance • Google Sheets Powered
              </p>
            </div>
          </div>

          {/* Admin Desktop Navigation Links */}
          {role === 'ADMIN' && (
            <nav className="hidden lg:flex items-center gap-1">
              {adminTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    currentTab === tab.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          )}

          {/* Right Header Controls */}
          <div className="flex items-center gap-3">
            {/* Live Clock IST */}
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60 text-xs">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono font-bold text-slate-200">{liveTime}</span>
              <span className="text-[9px] text-slate-400 uppercase">IST</span>
            </div>

            <PWAInstallButton compact />

            {/* User Info & Logout */}
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="text-right">
                <div className="text-xs font-bold text-white leading-tight">{user?.name}</div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {role === 'ADMIN' ? 'Administrator' : (user as any)?.employeeId}
                </div>
              </div>

              <button
                onClick={logout}
                title="Sign out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile menu toggle for admin */}
            {role === 'ADMIN' && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg text-slate-300 hover:bg-slate-800"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile menu drawer for Admin */}
        {role === 'ADMIN' && mobileMenuOpen && (
          <div className="lg:hidden py-3 border-t border-slate-800 space-y-1">
            {adminTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  onSelectTab(tab.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition ${
                  currentTab === tab.id
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            ))}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between px-2">
              <span className="text-xs text-slate-400">{user?.name}</span>
              <button
                onClick={logout}
                className="text-xs text-rose-400 hover:underline font-semibold flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
