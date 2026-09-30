import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Edit2,
  Info,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Holiday } from '../../types';
import { StatusBadge } from '../common/Badge';

export const HolidaysSection: React.FC = () => {
  const { token } = useAuth();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);

  const [formData, setFormData] = useState<{ date: string; holidayName: string; status: 'Active' | 'Inactive' }>({
    date: new Date().toISOString().split('T')[0],
    holidayName: '',
    status: 'Active',
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchHolidays = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/holidays', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setHolidays(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, [token]);

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/admin/holidays', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to add holiday');
      } else {
        setFeedback(`Holiday '${data.holidayName}' added.`);
        setIsAddOpen(false);
        fetchHolidays();
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    }
  };

  const handleEditHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHoliday) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/holidays/${editingHoliday.date}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setFeedback(`Holiday updated.`);
        setEditingHoliday(null);
        fetchHolidays();
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    }
  };

  const handleDeleteHoliday = async (date: string, name: string) => {
    if (!confirm(`Delete holiday '${name}' on ${date}?`)) return;
    try {
      const res = await fetch(`/api/admin/holidays/${date}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setFeedback(`Holiday deleted.`);
        fetchHolidays();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-24">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Holiday Calendar</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure company holidays. Scheduled holidays are never counted as Absent.
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({
              date: new Date().toISOString().split('T')[0],
              holidayName: '',
              status: 'Active',
            });
            setError(null);
            setIsAddOpen(true);
          }}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>ADD HOLIDAY</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="font-bold text-emerald-700">
            ✕
          </button>
        </div>
      )}

      {/* Notice info */}
      <div className="bg-amber-50 rounded-xl p-3.5 text-xs text-amber-900 border border-amber-200 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Important Rule:</strong> Any date configured as an active Holiday will show as{' '}
          <span className="font-bold text-purple-700">Holiday</span> on the attendance sheet and will
          never penalize employees as <span className="font-bold text-rose-700">Absent</span>.
        </div>
      </div>

      {/* Holidays Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-xs">Loading holidays...</p>
          </div>
        ) : holidays.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No holidays scheduled</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white font-semibold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Day</th>
                  <th className="py-3 px-4">Holiday Name</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {holidays.map((h) => {
                  const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(
                    new Date(h.date)
                  );
                  return (
                    <tr key={h.date} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{h.date}</td>
                      <td className="py-3.5 px-4 text-slate-500 font-medium">{dayName}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{h.holidayName}</td>
                      <td className="py-3.5 px-3">
                        <StatusBadge status={h.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setEditingHoliday(h);
                            setFormData({ ...h });
                            setError(null);
                          }}
                          className="px-2.5 py-1 font-semibold text-slate-700 hover:text-blue-700 bg-slate-100 rounded-md border border-slate-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteHoliday(h.date, h.holidayName)}
                          className="px-2.5 py-1 font-semibold text-rose-700 hover:bg-rose-50 bg-rose-50/50 rounded-md border border-rose-200"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      {(isAddOpen || editingHoliday) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-up">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                {editingHoliday ? 'Edit Holiday' : 'Add Company Holiday'}
              </h3>
              <button
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingHoliday(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={editingHoliday ? handleEditHoliday : handleAddHoliday}
              className="p-5 space-y-3.5 text-xs text-slate-700"
            >
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold mb-1">Date *</label>
                <input
                  type="date"
                  required
                  disabled={Boolean(editingHoliday)}
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Holiday Name *</label>
                <input
                  type="text"
                  required
                  value={formData.holidayName}
                  onChange={(e) => setFormData({ ...formData, holidayName: e.target.value })}
                  placeholder="e.g. Diwali Festival"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' })
                  }
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddOpen(false);
                    setEditingHoliday(null);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm"
                >
                  {editingHoliday ? 'Save Changes' : 'Add Holiday'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
