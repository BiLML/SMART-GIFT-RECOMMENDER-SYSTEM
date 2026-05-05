import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getProfile, type UserProfile } from '@/api/auth';

export type UserRole = 'reader' | 'staff' | 'admin';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole | null;
  token: string | null;
  setAuth: (token: string, user: UserProfile) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('lumina_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      getProfile()
        .then((profile) => {
          setUser(profile);
        })
        .catch(() => {
          localStorage.removeItem('lumina_token');
          localStorage.removeItem('lumina_user');
          setToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const setAuth = (newToken: string, newUser: UserProfile) => {
    localStorage.setItem('lumina_token', newToken);
    localStorage.setItem('lumina_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('lumina_token');
    localStorage.removeItem('lumina_user');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const profile = await getProfile();
      setUser(profile);
      localStorage.setItem('lumina_user', JSON.stringify(profile));
    } catch (e) {
      logout();
    }
  };

  const role: UserRole | null = user?.role as UserRole | null;

  return (
    <AuthContext.Provider value={{ user, role, token, setAuth, logout, refreshUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
