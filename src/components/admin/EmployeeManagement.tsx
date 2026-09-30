import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Edit2,
  KeyRound,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  User,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Employee } from '../../types';
import { StatusBadge } from '../common/Badge';

export const EmployeeManagement: React.FC = () => {
  const { token } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetPinModalOpen, setIsResetPinModalOpen] = useState(false);

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Form Data
  const initialForm: Partial<Employee> = {
    employeeId: '',
    name: '',
    mobile: '',
    email: '',
    department: 'Engineering',
    designation: '',
    joiningDate: new Date().toISOString().split('T')[0],
    pin: '1234',
    status: 'Active',
  };
  const [formData, setFormData] = useState<Partial<Employee>>(initialForm);
  const [resetPinValue, setResetPinValue] = useState('1234');

  const fetchEmployees = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/employees', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setEmployees(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [token]);

  // Handle Add Employee
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setModalSubmitting(true);

    try {
      const res = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to add employee');
      } else {
        setFormSuccess(`Employee ${data.name} (${data.employeeId}) added successfully!`);
        setIsAddModalOpen(false);
        setFormData(initialForm);
        fetchEmployees();
      }
    } catch (err: any) {
      setFormError(err.message || 'Network error');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Handle Edit Employee
  const handleEditEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    setFormError(null);
    setModalSubmitting(true);

    try {
      const res = await fetch(`/api/admin/employees/${selectedEmployee.employeeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to update employee');
      } else {
        setFormSuccess(`Employee ${data.name} updated successfully!`);
        setIsEditModalOpen(false);
        fetchEmployees();
      }
    } catch (err: any) {
      setFormError(err.message || 'Network error');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Handle Status Toggle (Activate / Deactivate)
  const handleToggleStatus = async (emp: Employee) => {
    const nextStatus = emp.status === 'Active' ? 'Inactive' : 'Active';
    const confirmMsg =
      nextStatus === 'Inactive'
        ? `Are you sure you want to deactivate ${emp.name}? They will be blocked from logging in.`
        : `Activate ${emp.name}?`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/admin/employees/${emp.employeeId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        fetchEmployees();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Handle Reset PIN
  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    setModalSubmitting(true);
    try {
      const res = await fetch(`/api/admin/employees/${selectedEmployee.employeeId}/reset-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPin: resetPinValue }),
      });
      const data = await res.json();
      if (res.ok) {
        setFormSuccess(data.message);
        setIsResetPinModalOpen(false);
        fetchEmployees();
      }
    } catch (err) {
      console.error('Failed to reset pin:', err);
    } finally {
      setModalSubmitting(false);
    }
  };

  // Departments list
  const departments = Array.from(new Set(employees.map((e) => e.department).filter(Boolean)));

  // Filtered employees
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept =
      departmentFilter === 'ALL' || emp.department.toLowerCase() === departmentFilter.toLowerCase();

    const matchesStatus = statusFilter === 'ALL' || emp.status === statusFilter;

    return matchesSearch && matchesDept && matchesStatus;
  });

  return (
    <div className="space-y-5 pb-24">
      {/* Top Banner and Add Action */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Staff Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage company employees, permissions, active statuses, and security credentials.
          </p>
        </div>

        <button
          onClick={() => {
            setFormData(initialForm);
            setFormError(null);
            setIsAddModalOpen(true);
          }}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-blue-500/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>ADD EMPLOYEE</span>
        </button>
      </div>

      {/* Global Success / Feedback */}
      {formSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{formSuccess}</span>
          </div>
          <button onClick={() => setFormSuccess(null)} className="text-xs font-bold text-emerald-700">
            ✕
          </button>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, ID or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="ALL">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive Only</option>
          </select>
        </div>

        <button
          onClick={fetchEmployees}
          className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-50 border border-slate-200"
          title="Refresh List"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-xs">Loading employees...</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <User className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No employees match criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white font-semibold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Employee ID</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-3">Contact</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">Designation</th>
                  <th className="py-3 px-3">Joining Date</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.employeeId} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {emp.employeeId}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{emp.name}</td>
                    <td className="py-3 px-3 space-y-0.5">
                      <div className="text-slate-800">{emp.email}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{emp.mobile || '-'}</div>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800">{emp.department}</td>
                    <td className="py-3 px-3 text-slate-600">{emp.designation}</td>
                    <td className="py-3 px-3 font-mono text-slate-600">{emp.joiningDate}</td>
                    <td className="py-3 px-3">
                      <StatusBadge status={emp.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {/* EDIT Button */}
                      <button
                        onClick={() => {
                          setSelectedEmployee(emp);
                          setFormData({ ...emp });
                          setFormError(null);
                          setIsEditModalOpen(true);
                        }}
                        className="px-2.5 py-1 font-semibold text-slate-700 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 border border-slate-200 rounded-md transition"
                        title="Edit Details"
                      >
                        Edit
                      </button>

                      {/* RESET PIN Button */}
                      <button
                        onClick={() => {
                          setSelectedEmployee(emp);
                          setResetPinValue('1234');
                          setIsResetPinModalOpen(true);
                        }}
                        className="px-2.5 py-1 font-semibold text-slate-700 hover:text-indigo-700 bg-slate-100 hover:bg-indigo-50 border border-slate-200 rounded-md transition"
                        title="Reset PIN"
                      >
                        PIN
                      </button>

                      {/* ACTIVATE / DEACTIVATE Button */}
                      <button
                        onClick={() => handleToggleStatus(emp)}
                        className={`px-2.5 py-1 font-semibold rounded-md border transition ${
                          emp.status === 'Active'
                            ? 'text-rose-700 hover:bg-rose-50 border-rose-200 bg-rose-50/50'
                            : 'text-emerald-700 hover:bg-emerald-50 border-emerald-200 bg-emerald-50/50'
                        }`}
                        title={emp.status === 'Active' ? 'Deactivate Account' : 'Activate Account'}
                      >
                        {emp.status === 'Active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD EMPLOYEE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-up">
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-400" />
                Add New Employee
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="p-5 space-y-3.5 text-xs text-slate-700">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Employee ID *</label>
                  <input
                    type="text"
                    required
                    value={formData.employeeId}
                    onChange={(e) =>
                      setFormData({ ...formData, employeeId: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g. EMP107"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Rajesh Kumar"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="rajesh@company.com"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Mobile Number</label>
                  <input
                    type="text"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Department *</label>
                  <input
                    type="text"
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="Engineering / Sales / HR"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Designation</label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    placeholder="Software Engineer"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Joining Date</label>
                  <input
                    type="date"
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Initial PIN</label>
                  <input
                    type="text"
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                    placeholder="1234"
                    maxLength={8}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
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
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm"
                >
                  {modalSubmitting ? 'Saving...' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT EMPLOYEE MODAL */}
      {isEditModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-up">
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-400" />
                Edit Employee ({selectedEmployee.employeeId})
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditEmployee} className="p-5 space-y-3.5 text-xs text-slate-700">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Employee ID</label>
                  <input
                    type="text"
                    disabled
                    value={formData.employeeId}
                    className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg font-mono font-bold text-slate-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Mobile Number</label>
                  <input
                    type="text"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Designation</label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Joining Date</label>
                  <input
                    type="date"
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
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
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm"
                >
                  {modalSubmitting ? 'Saving...' : 'Update Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PIN MODAL */}
      {isResetPinModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-up">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-blue-400" />
                Reset Security PIN
              </h3>
              <button
                onClick={() => setIsResetPinModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPin} className="p-5 space-y-4 text-xs text-slate-700">
              <p>
                Reset authentication PIN for <strong>{selectedEmployee.name}</strong> (
                {selectedEmployee.employeeId}):
              </p>

              <div>
                <label className="block font-semibold mb-1 text-slate-600">New PIN</label>
                <input
                  type="text"
                  required
                  value={resetPinValue}
                  onChange={(e) => setResetPinValue(e.target.value)}
                  maxLength={10}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm tracking-widest text-center font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsResetPinModalOpen(false)}
                  className="px-3.5 py-2 border border-slate-200 rounded-lg font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm"
                >
                  {modalSubmitting ? 'Resetting...' : 'Set New PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
