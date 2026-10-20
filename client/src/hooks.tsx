import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api, ApiError, type User } from './api';

export function useApi<T>(url: string, revision = 0) {
  const [data, setData] = useState<T>();
  const [meta, setMeta] = useState<import('./api').Meta>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api<T>(url)
      .then((r) => {
        if (active) {
          setData(r.data);
          setMeta(r.meta);
        }
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Unable to load data.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [url, revision]);
  return { data, meta, loading, error };
}
const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  authError: string;
  retry: () => void;
}>({ user: null, loading: true, setUser: () => {}, authError: '', retry: () => {} });
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true);
    api<User>('/auth/me')
      .then((r) => {
        if (live) {
          setUser(r.data);
          setAuthError('');
        }
      })
      .catch((e) => {
        if (live && (!(e instanceof ApiError) || e.status !== 401)) setAuthError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [revision]);
  return (
    <AuthContext.Provider
      value={{ user, loading, setUser, authError, retry: () => setRevision((v) => v + 1) }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
const ToastContext = createContext<(message: string, error?: boolean) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; error?: boolean; time: number }>();
  const show = useCallback(
    (message: string, error = false) => setToast({ message, error, time: Date.now() }),
    [],
  );
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(undefined), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div className={`toast ${toast.error ? 'toast-error' : ''}`} role="status">
          {toast.message}
          <button onClick={() => setToast(undefined)} aria-label="Dismiss notification">
            ×
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);
