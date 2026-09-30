import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  Compass,
  FileCode,
  Globe,
  Mail,
  MapPin,
  RefreshCw,
  Save,
  Send,
  Sliders,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AppSettings } from '../../types';
import { EmailPreviewModal } from './EmailPreviewModal';
import { GoogleAppsScriptModal } from './GoogleAppsScriptModal';

export const SettingsSection: React.FC = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingSheets, setSyncingSheets] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Modals
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [emailModalData, setEmailModalData] = useState<any>(null);

  const fetchSettings = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSettings(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [token]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
        setFeedback({ type: 'success', message: 'All system settings saved successfully!' });
      } else {
        setFeedback({ type: 'error', message: 'Failed to update settings.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Network error' });
    } finally {
      setSaving(false);
    }
  };

  // Helper to pick device current GPS coordinates
  const pickCurrentDeviceLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!settings) return;
        setSettings({
          ...settings,
          officeLatitude: Number(pos.coords.latitude.toFixed(6)),
          officeLongitude: Number(pos.coords.longitude.toFixed(6)),
        });
        setFeedback({
          type: 'success',
          message: `Captured current GPS coordinates: Lat ${pos.coords.latitude.toFixed(
            4
          )}, Lng ${pos.coords.longitude.toFixed(4)}`,
        });
      },
      (err) => {
        alert(`Location Error: ${err.message}`);
      },
      { enableHighAccuracy: true }
    );
  };

  // Trigger Daily Email Test
  const handleTriggerDailyEmail = async () => {
    if (!token) return;
    setTestingEmail(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/email/trigger-daily', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setEmailModalData(data);
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to trigger email' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Network error' });
    } finally {
      setTestingEmail(false);
    }
  };

  // Sync to Google Sheets
  const handleSyncGoogleSheets = async () => {
    if (!token || !settings) return;
    if (!settings.googleAppsScriptUrl) {
      setFeedback({
        type: 'error',
        message: 'Please paste your Google Apps Script Web App URL first and click Save Settings.',
      });
      return;
    }

    setSyncingSheets(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/sheets/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: settings.googleAppsScriptUrl }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({
          type: 'success',
          message: `Google Sheets Synced! ${data.syncedCounts?.attendance || 0} attendance rows and ${
            data.syncedCounts?.employees || 0
          } employees updated in your Google Spreadsheet.`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'Failed to sync with Google Sheets',
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Connection failed' });
    } finally {
      setSyncingSheets(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
        <p className="text-xs">Loading configuration settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">System Configuration</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure office geofence coordinates, attendance timing thresholds, email summaries,
            and Google Sheets database sync.
          </p>
        </div>

        <button
          onClick={fetchSettings}
          className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 border border-slate-200"
          title="Reload Settings"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border shadow-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-rose-50 text-rose-900 border-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="font-bold text-slate-500 ml-2">
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* 1. ATTENDANCE TIMINGS */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Clock className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-base text-slate-900">Attendance Timing Rules</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Normal Reporting Time *
              </label>
              <input
                type="text"
                required
                value={settings.normalInTime}
                onChange={(e) => setSettings({ ...settings, normalInTime: e.target.value })}
                placeholder="10:15"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Default: 10:15 AM</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Late Mark Threshold *
              </label>
              <input
                type="text"
                required
                value={settings.lateAfter}
                onChange={(e) => setSettings({ ...settings, lateAfter: e.target.value })}
                placeholder="12:30"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                IN after this time is marked Late (Default: 12:30 PM)
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Half Day IN Threshold *
              </label>
              <input
                type="text"
                required
                value={settings.halfDayAfter}
                onChange={(e) => setSettings({ ...settings, halfDayAfter: e.target.value })}
                placeholder="14:00"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                IN after this time counts as Half Day (Default: 2:00 PM / 14:00)
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Minimum Working Hours *
              </label>
              <input
                type="number"
                required
                min={1}
                max={16}
                value={settings.minWorkingHours}
                onChange={(e) =>
                  setSettings({ ...settings, minWorkingHours: Number(e.target.value) })
                }
                placeholder="6"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Less than this duration = Half Day (Default: 6 Hours)
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Early OUT Threshold *
              </label>
              <input
                type="text"
                required
                value={settings.earlyOutTime}
                onChange={(e) => setSettings({ ...settings, earlyOutTime: e.target.value })}
                placeholder="16:30"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                OUT before this time = Early Out flag (Default: 4:30 PM / 16:30)
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Scheduled Weekly Offs
              </label>
              <select
                value={settings.weeklyOffDays.includes(6) ? 'SUN_SAT' : 'SUN'}
                onChange={(e) => {
                  const val = e.target.value;
                  setSettings({
                    ...settings,
                    weeklyOffDays: val === 'SUN_SAT' ? [0, 6] : [0],
                  });
                }}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
              >
                <option value="SUN">Sunday Only (6-Day Work Week)</option>
                <option value="SUN_SAT">Saturday &amp; Sunday (5-Day Work Week)</option>
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Weekly offs are never marked Absent
              </span>
            </div>
          </div>
        </div>

        {/* 2. OFFICE GPS LOCATION & GEOFENCE */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-base text-slate-900">
                Office Geofence &amp; GPS Location
              </h3>
            </div>
            <button
              type="button"
              onClick={pickCurrentDeviceLocation}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-lg border border-blue-200 flex items-center gap-1.5 transition"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Use Current Device GPS</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="lg:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Office Name *</label>
              <input
                type="text"
                required
                value={settings.officeName}
                onChange={(e) => setSettings({ ...settings, officeName: e.target.value })}
                placeholder="TechCorp Campus, Sector 62, Noida"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Office Latitude *</label>
              <input
                type="number"
                step="any"
                required
                value={settings.officeLatitude}
                onChange={(e) =>
                  setSettings({ ...settings, officeLatitude: parseFloat(e.target.value) })
                }
                placeholder="28.6280"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Office Longitude *</label>
              <input
                type="number"
                step="any"
                required
                value={settings.officeLongitude}
                onChange={(e) =>
                  setSettings({ ...settings, officeLongitude: parseFloat(e.target.value) })
                }
                placeholder="77.3670"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Allowed Radius (meters) *
              </label>
              <input
                type="number"
                min={20}
                max={5000}
                required
                value={settings.allowedRadius}
                onChange={(e) =>
                  setSettings({ ...settings, allowedRadius: parseInt(e.target.value, 10) })
                }
                placeholder="300"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm text-slate-900 font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Standard: 300 meters from center
              </span>
            </div>
          </div>
        </div>

        {/* 3. EMAIL AUTOMATION */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-base text-slate-900">Email Automation</h3>
            </div>
            <button
              type="button"
              onClick={handleTriggerDailyEmail}
              disabled={testingEmail}
              className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded-lg border border-indigo-200 flex items-center gap-1.5 transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{testingEmail ? 'Generating...' : 'Preview Daily Summary Email'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Admin Email *</label>
              <input
                type="email"
                required
                value={settings.adminEmail}
                onChange={(e) => setSettings({ ...settings, adminEmail: e.target.value })}
                placeholder="admin@company.com"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Daily Email Send Time *
              </label>
              <input
                type="text"
                required
                value={settings.dailyEmailTime}
                onChange={(e) => setSettings({ ...settings, dailyEmailTime: e.target.value })}
                placeholder="19:00"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Default: 19:00 (7:00 PM IST)</span>
            </div>

            <div className="flex items-center pt-5">
              <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={settings.employeeEmailNotification}
                  onChange={(e) =>
                    setSettings({ ...settings, employeeEmailNotification: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 rounded-sm"
                />
                <span>Notify Employees on Attendance Event</span>
              </label>
            </div>
          </div>
        </div>

        {/* 4. GOOGLE SHEETS DATABASE CONNECTOR */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Google Sheets Central Database
                </h3>
                <p className="text-[11px] text-slate-500">
                  Direct bidirectional sync with Google Apps Script
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsScriptModalOpen(true)}
              className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs rounded-lg border border-emerald-300 flex items-center gap-1.5 transition"
            >
              <FileCode className="w-3.5 h-3.5 text-emerald-600" />
              <span>Get Code.gs Script</span>
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Google Apps Script Web App URL
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  value={settings.googleAppsScriptUrl || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, googleAppsScriptUrl: e.target.value })
                  }
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-900"
                />
                <button
                  type="button"
                  onClick={handleSyncGoogleSheets}
                  disabled={syncingSheets || !settings.googleAppsScriptUrl}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-1.5 transition whitespace-nowrap cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingSheets ? 'animate-spin' : ''}`} />
                  <span>{syncingSheets ? 'Syncing...' : 'Sync Now to Google Sheets'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Automatically synchronizes Employees, Attendance, Holidays, Settings, and Audit Log
                into your 6 Google Sheets tabs.
              </p>
            </div>
          </div>
        </div>

        {/* SAVE BUTTON */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2 transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'SAVE ALL SETTINGS'}</span>
          </button>
        </div>
      </form>

      {/* Code.gs Modal */}
      <GoogleAppsScriptModal
        isOpen={isScriptModalOpen}
        onClose={() => setIsScriptModalOpen(false)}
      />

      {/* Daily Email Preview Modal */}
      <EmailPreviewModal
        isOpen={Boolean(emailModalData)}
        onClose={() => setEmailModalData(null)}
        emailData={emailModalData}
      />
    </div>
  );
};
