import React, { useState } from 'react';
import {
  AlertCircle,
  Building2,
  Clock,
  KeyRound,
  Lock,
  MapPin,
  Shield,
  Smartphone,
  User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PWAInstallButton } from '../common/PWAInstallButton';

export const LoginView: React.FC = () => {
  const { loginEmployee, loginAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'EMPLOYEE' | 'ADMIN'>('EMPLOYEE');

  // Employee form state
  const [employeeId, setEmployeeId] = useState('');
  const [pin, setPin] = useState('');

  // Admin form state
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!employeeId.trim() || !pin.trim()) {
      setErrorMessage('Please enter both Employee ID and PIN');
      return;
    }
    setLoading(true);
    const res = await loginEmployee(employeeId.trim(), pin.trim());
    setLoading(false);
    if (!res.success) {
      setErrorMessage(res.error || 'Failed to login');
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!adminUsername.trim() || !adminPassword.trim()) {
      setErrorMessage('Please enter Admin ID/Email and Password');
      return;
    }
    setLoading(true);
    const res = await loginAdmin(adminUsername.trim(), adminPassword.trim());
    setLoading(false);
    if (!res.success) {
      setErrorMessage(res.error || 'Failed to login');
    }
  };

  const fillDemoEmployee = (id: string) => {
    setEmployeeId(id);
    setPin('1234');
    setErrorMessage(null);
  };

  const fillDemoAdmin = () => {
    setAdminUsername('admin@company.com');
    setAdminPassword('admin123');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between">
      {/* Top Header */}
      <header className="px-4 py-4 flex items-center justify-between border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white leading-tight tracking-tight">AttendFlow</h1>
            <p className="text-[11px] text-blue-400 font-medium">GPS Geofenced Attendance</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PWAInstallButton compact />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            {/* Mode Switch Tabs */}
            <div className="flex rounded-xl bg-slate-900/80 p-1 mb-6 border border-slate-700/60">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('EMPLOYEE');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
                  activeTab === 'EMPLOYEE'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                Employee Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('ADMIN');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
                  activeTab === 'ADMIN'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Shield className="w-4 h-4" />
                Admin Portal
              </button>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-950/70 border border-rose-700/60 text-rose-200 text-xs sm:text-sm flex items-start gap-2.5 animate-shake">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}

            {/* Employee Login Form */}
            {activeTab === 'EMPLOYEE' && (
              <form onSubmit={handleEmployeeSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Employee ID
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                      placeholder="e.g. EMP101"
                      className="w-full pl-11 pr-4 py-3 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm tracking-wide font-mono"
                      autoCapitalize="characters"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    PIN / Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      type="password"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="Enter 4-digit PIN"
                      maxLength={12}
                      className="w-full pl-11 pr-4 py-3 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm tracking-widest font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {loading ? (
                      <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'LOGIN'
                    )}
                  </button>
                </div>

                {/* Quick Demo Fill Buttons */}
                <div className="mt-5 pt-4 border-t border-slate-700/60">
                  <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mb-2 text-center">
                    Quick Demo Credentials (PIN: 1234)
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => fillDemoEmployee('EMP101')}
                      className="px-2 py-1.5 bg-slate-900 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-mono text-slate-300 text-center transition"
                    >
                      EMP101
                    </button>
                    <button
                      type="button"
                      onClick={() => fillDemoEmployee('EMP102')}
                      className="px-2 py-1.5 bg-slate-900 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-mono text-slate-300 text-center transition"
                    >
                      EMP102
                    </button>
                    <button
                      type="button"
                      onClick={() => fillDemoEmployee('EMP103')}
                      className="px-2 py-1.5 bg-slate-900 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-mono text-slate-300 text-center transition"
                    >
                      EMP103
                    </button>
                  </div>
                  <div className="mt-2 text-center">
                    <button
                      type="button"
                      onClick={() => fillDemoEmployee('EMP106')}
                      className="text-[11px] text-rose-400 hover:underline inline-flex items-center gap-1"
                    >
                      Test Inactive Account (EMP106)
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Admin Login Form */}
            {activeTab === 'ADMIN' && (
              <form onSubmit={handleAdminSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Admin ID or Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      placeholder="admin@company.com"
                      className="w-full pl-11 pr-4 py-3 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm tracking-wide"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Password / PIN
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-4 py-3 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm tracking-wide"
                      required
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 active:scale-[0.99] text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {loading ? (
                      <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'ADMIN SIGN IN'
                    )}
                  </button>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-700/60 text-center">
                  <button
                    type="button"
                    onClick={fillDemoAdmin}
                    className="text-xs text-blue-400 hover:text-blue-300 underline font-medium"
                  >
                    Fill Default Admin (admin@company.com / admin123)
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Info Badge */}
          <div className="mt-6 text-center space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-full border border-slate-700/50">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Timezone: Asia/Kolkata (IST) | GPS Geofence Enabled</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Employee login does not mark attendance. IN/OUT requires GPS verification.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-500 border-t border-slate-800/80">
        AttendFlow v2.4 • Web &amp; Android PWA • Google Sheets Sync Ready
      </footer>
    </div>
  );
};
