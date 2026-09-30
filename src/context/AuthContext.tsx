import React, { createContext, useContext, useEffect, useState } from 'react';
import { AdminUser, Employee, UserRole } from '../types';

interface AuthContextType {
  user: Employee | AdminUser | null;
  role: UserRole | null;
  token: string | null;
  isLoading: boolean;
  loginEmployee: (employeeId: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  loginAdmin: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'attendflow_auth_token';
const ROLE_KEY = 'attendflow_auth_role';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [role, setRole] = useState<UserRole | null>(() => (localStorage.getItem(ROLE_KEY) as UserRole) || null);
  const [user, setUser] = useState<Employee | AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = async (authToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) {
        logout();
        return;
      }
      const data = await res.json();
      setRole(data.role);
      setUser(data.user);
    } catch {
      // Offline or network error - keep cached state if available
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCurrentUser(token);
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const loginEmployee = async (employeeId: string, pin: string) => {
    try {
      const res = await fetch('/api/auth/employee/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to login' };
      }
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(ROLE_KEY, 'EMPLOYEE');
      setToken(data.token);
      setRole('EMPLOYEE');
      setUser(data.employee);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network connection failed' };
    }
  };

  const loginAdmin = async (username: string, password: string) => {
    try {
      const res = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to login' };
      }
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(ROLE_KEY, 'ADMIN');
      setToken(data.token);
      setRole('ADMIN');
      setUser(data.admin);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network connection failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    setToken(null);
    setRole(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (token) {
      await fetchCurrentUser(token);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        token,
        isLoading,
        loginEmployee,
        loginAdmin,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
