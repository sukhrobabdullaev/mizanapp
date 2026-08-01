/** Auth context: session bootstrap, login/register/logout, session expiry. */

import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { api, setSessionExpiredHandler } from '../lib/api';
import { clearTokens, getAccessToken, saveTokens } from '../lib/tokens';
import type { RegisterResponse, TokenPair } from '../types/api';

interface AuthState {
  isReady: boolean;
  isSignedIn: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (username: string, password: string, firstName?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isReady, setReady] = useState(false);
  const [isSignedIn, setSignedIn] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;
    void getAccessToken().then((token) => {
      if (active) {
        setSignedIn(!!token);
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const signOut = useCallback(async () => {
    await clearTokens();
    queryClient.clear();
    setSignedIn(false);
  }, [queryClient]);

  useEffect(() => {
    // The axios interceptor calls this when a refresh token is dead.
    setSessionExpiredHandler(() => {
      queryClient.clear();
      setSignedIn(false);
    });
  }, [queryClient]);

  const signIn = useCallback(async (username: string, password: string) => {
    const { data } = await api.post<TokenPair>('/auth/login/', { username, password });
    await saveTokens(data);
    setSignedIn(true);
  }, []);

  const signUp = useCallback(
    async (username: string, password: string, firstName?: string) => {
      const { data } = await api.post<RegisterResponse>('/auth/register/', {
        username,
        password,
        ...(firstName ? { first_name: firstName } : {}),
      });
      await saveTokens({ access: data.access, refresh: data.refresh });
      setSignedIn(true);
    },
    [],
  );

  const value = useMemo(
    () => ({ isReady, isSignedIn, signIn, signUp, signOut }),
    [isReady, isSignedIn, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
