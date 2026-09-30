import React, { useState } from 'react';
import {
  AlertCircle,
  Building,
  CheckCircle2,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Shield,
  Smartphone,
  User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../common/Badge';
import { PWAInstallButton } from '../common/PWAInstallButton';

export const EmployeeProfile: React.FC = () => {
  const { user, token, logout } = useAuth();
  const emp = user as any;

  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinMessage, setPinMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const handlePinChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinMessage(null);

    if (newPin.length < 4) {
      setPinMessage({ type: 'error', text: 'New PIN must be at least 4 digits' });
      return;
    }

    if (newPin !== confirmPin) {
      setPinMessage({ type: 'error', text: 'New PIN and Confirm PIN do not match' });
      return;
    }

    setPinLoading(true);
    try {
      const res = await fetch('/api/employee/update-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPin, newPin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPinMessage({ type: 'error', text: data.error || 'Failed to update PIN' });
      } else {
        setPinMessage({ type: 'success', text: 'PIN updated successfully!' });
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
      }
    } catch (err: any) {
      setPinMessage({ type: 'error', text: err.message || 'Network error' });
    } finally {
      setPinLoading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-xl mx-auto pb-24">
      {/* Profile Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-md">
            {emp?.name ? emp.name.charAt(0) : 'E'}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{emp?.name}</h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Employee ID: <strong className="text-slate-800">{emp?.employeeId}</strong>
            </p>
            <div className="mt-2">
              <StatusBadge status={emp?.status || 'Active'} size="sm" />
            </div>
          </div>
        </div>

        {/* Profile Details List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5 text-xs">
          <div className="flex items-start gap-2.5">
            <Building className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="text-slate-400 block uppercase font-semibold text-[10px]">
                Department
              </span>
              <span className="font-semibold text-slate-800">{emp?.department || '-'}</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="text-slate-400 block uppercase font-semibold text-[10px]">
                Designation
              </span>
              <span className="font-semibold text-slate-800">{emp?.designation || '-'}</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Mail className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="text-slate-400 block uppercase font-semibold text-[10px]">
                Email Address
              </span>
              <span className="font-semibold text-slate-800">{emp?.email || '-'}</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Phone className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="text-slate-400 block uppercase font-semibold text-[10px]">
                Mobile Number
              </span>
              <span className="font-semibold text-slate-800">{emp?.mobile || '-'}</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <User className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="text-slate-400 block uppercase font-semibold text-[10px]">
                Joining Date
              </span>
              <span className="font-semibold text-slate-800 font-mono">
                {emp?.joiningDate || '-'}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="text-slate-400 block uppercase font-semibold text-[10px]">
                Assigned Office
              </span>
              <span className="font-semibold text-slate-800">Campus HQ (Noida)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Change PIN Form */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h3 className="font-bold text-base text-slate-900 flex items-center gap-2 mb-1">
          <KeyRound className="w-5 h-5 text-blue-600" />
          Change PIN / Password
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Update the security PIN used to log in on this device.
        </p>

        {pinMessage && (
          <div
            className={`p-3 rounded-xl mb-4 text-xs flex items-center gap-2 border ${
              pinMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-rose-50 text-rose-800 border-rose-300'
            }`}
          >
            {pinMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{pinMessage.text}</span>
          </div>
        )}

        <form onSubmit={handlePinChange} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Current PIN</label>
            <input
              type="password"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value)}
              placeholder="Enter current PIN"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">New PIN</label>
              <input
                type="password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="Enter new PIN"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Confirm PIN</label>
              <input
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="Re-enter new PIN"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={pinLoading}
            className="w-full mt-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-sm transition"
          >
            {pinLoading ? 'Updating...' : 'Update PIN'}
          </button>
        </form>
      </div>

      {/* App Installation & Logout */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-blue-600" />
          <div>
            <p className="text-xs font-bold text-slate-800">Install AttendFlow as Mobile App</p>
            <p className="text-[11px] text-slate-500">Android PWA standalone experience</p>
          </div>
        </div>
        <PWAInstallButton />
      </div>

      <div className="text-center pt-2">
        <button
          onClick={logout}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs border border-rose-200 transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out from Employee Account</span>
        </button>
      </div>
    </div>
  );
};
