import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OfflineBanner } from './components/common/OfflineBanner';
import { Navbar } from './components/common/Navbar';
import { LoginView } from './components/auth/LoginView';
import { EmployeeDashboard } from './components/employee/EmployeeDashboard';
import { EmployeeAttendance } from './components/employee/EmployeeAttendance';
import { EmployeeReport } from './components/employee/EmployeeReport';
import { EmployeeProfile } from './components/employee/EmployeeProfile';
import { EmployeeBottomNav } from './components/employee/EmployeeBottomNav';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { EmployeeManagement } from './components/admin/EmployeeManagement';
import { AttendanceManagement } from './components/admin/AttendanceManagement';
import { ReportsSection } from './components/admin/ReportsSection';
import { SettingsSection } from './components/admin/SettingsSection';
import { HolidaysSection } from './components/admin/HolidaysSection';
import { AuditLogSection } from './components/admin/AuditLogSection';
import { MapPin } from 'lucide-react';

function MainApp() {
  const { role, user, isLoading } = useAuth();

  // Employee Navigation Tab
  const [employeeTab, setEmployeeTab] = useState<'HOME' | 'ATTENDANCE' | 'REPORTS' | 'PROFILE'>('HOME');
  const [attendanceInitialFilter, setAttendanceInitialFilter] = useState<string | undefined>(undefined);

  // Admin Navigation Tab
  const [adminTab, setAdminTab] = useState<string>('DASHBOARD');
  const [adminAttendanceFilter, setAdminAttendanceFilter] = useState<any>(undefined);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 mb-4 animate-pulse">
          <MapPin className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">AttendFlow</h2>
        <p className="text-xs text-slate-400 mt-1">Loading secure attendance system...</p>
      </div>
    );
  }

  // Not logged in -> Show Login View
  if (!role || !user) {
    return (
      <>
        <OfflineBanner />
        <LoginView />
      </>
    );
  }

  // EMPLOYEE PORTAL
  if (role === 'EMPLOYEE') {
    return (
      <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
        <OfflineBanner />
        <Navbar currentTab={employeeTab} onSelectTab={(t) => setEmployeeTab(t as any)} />

        <main className="flex-1 p-3.5 sm:p-6 max-w-5xl mx-auto w-full">
          {employeeTab === 'HOME' && (
            <EmployeeDashboard
              onNavigate={(tab, filter) => {
                setEmployeeTab(tab);
                if (filter) setAttendanceInitialFilter(filter);
              }}
            />
          )}

          {employeeTab === 'ATTENDANCE' && (
            <EmployeeAttendance initialFilter={attendanceInitialFilter} />
          )}

          {employeeTab === 'REPORTS' && <EmployeeReport />}

          {employeeTab === 'PROFILE' && <EmployeeProfile />}
        </main>

        {/* Mobile Bottom Navigation */}
        <EmployeeBottomNav currentTab={employeeTab} onSelectTab={setEmployeeTab} />
      </div>
    );
  }

  // ADMIN CONSOLE
  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      <OfflineBanner />
      <Navbar currentTab={adminTab} onSelectTab={setAdminTab} />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {adminTab === 'DASHBOARD' && (
          <AdminDashboard
            onNavigateTab={(tab, filter) => {
              setAdminTab(tab);
              if (filter) setAdminAttendanceFilter(filter);
            }}
            onOpenCorrectionModal={(_id) => {
              setAdminTab('ATTENDANCE');
            }}
          />
        )}

        {adminTab === 'EMPLOYEES' && <EmployeeManagement />}

        {adminTab === 'ATTENDANCE' && (
          <AttendanceManagement initialFilter={adminAttendanceFilter} />
        )}

        {adminTab === 'REPORTS' && <ReportsSection />}

        {adminTab === 'HOLIDAYS' && <HolidaysSection />}

        {adminTab === 'SETTINGS' && <SettingsSection />}

        {adminTab === 'AUDIT' && <AuditLogSection />}
      </main>

      {/* Admin Footer */}
      <footer className="py-4 text-center text-xs text-slate-500 border-t border-slate-200 bg-white">
        AttendFlow Admin Console • Asia/Kolkata (IST) • Production Google Sheets Sync Ready
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
