import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  setupFirstAdmin: (data: { name: string; email: string; password: string; phone?: string; salonName?: string }) => Promise<void>;
  registerOwner: (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    salonName: string;
    salonAddress?: string;
    gstin?: string;
  }) => Promise<void>;
  acceptInvitation: (data: { token: string; password: string; name?: string }) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('saloonify_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const storedToken = localStorage.getItem('saloonify_token');
    if (storedToken) {
      try {
        const res = await api.getMe();
        if (res.success && res.user) {
          setUser(res.user);
        } else {
          localStorage.removeItem('saloonify_token');
          setToken(null);
          setUser(null);
        }
      } catch {
        localStorage.removeItem('saloonify_token');
        setToken(null);
        setUser(null);
      }
    }
  };

  useEffect(() => {
    async function loadUser() {
      await refreshUser();
      setIsLoading(false);
    }
    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    if (res.success && res.token) {
      localStorage.setItem('saloonify_token', res.token);
      setToken(res.token);
      setUser(res.user);
    }
  };

  const setupFirstAdmin = async (data: { name: string; email: string; password: string; phone?: string; salonName?: string }) => {
    const res = await api.setupFirstAdmin(data);
    if (res.success && res.token) {
      localStorage.setItem('saloonify_token', res.token);
      setToken(res.token);
      setUser(res.user);
    }
  };

  const registerOwner = async (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    salonName: string;
    salonAddress?: string;
    gstin?: string;
  }) => {
    const res = await api.registerOwner(data);
    if (res.success && res.token) {
      localStorage.setItem('saloonify_token', res.token);
      setToken(res.token);
      setUser(res.user);
    }
  };

  const acceptInvitation = async (data: { token: string; password: string; name?: string }) => {
    const res = await api.acceptInvitation(data);
    if (res.success && res.token) {
      localStorage.setItem('saloonify_token', res.token);
      setToken(res.token);
      setUser(res.user);
    }
  };

  const logout = () => {
    localStorage.removeItem('saloonify_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        setupFirstAdmin,
        registerOwner,
        acceptInvitation,
        refreshUser,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
