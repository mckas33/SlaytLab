import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { translateAuthError } from '../lib/authErrors';

export interface AuthActionResult {
  error: string | null;
  needsEmailConfirmation: boolean;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signUp: (email: string, password: string) => Promise<AuthActionResult>;
  signOut: () => Promise<void>;
}

const NETWORK_ERROR = 'Sunucuya bağlanılamadı. İnternet bağlantını kontrol et.';

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth, AuthProvider içinde kullanılmalı.');
  }

  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthActionResult> => {
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          return {
            error: translateAuthError(error),
            needsEmailConfirmation: false,
          };
        }

        return { error: null, needsEmailConfirmation: false };
      } catch {
        return { error: NETWORK_ERROR, needsEmailConfirmation: false };
      }
    },
    []
  );

  const signUp = useCallback(
    async (email: string, password: string): Promise<AuthActionResult> => {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });

        if (error) {
          return {
            error: translateAuthError(error),
            needsEmailConfirmation: false,
          };
        }

        if (data.user && data.user.identities && data.user.identities.length === 0) {
          return {
            error: 'Bu e-posta ile zaten bir hesap var.',
            needsEmailConfirmation: false,
          };
        }

        return { error: null, needsEmailConfirmation: data.session === null };
      } catch {
        return { error: NETWORK_ERROR, needsEmailConfirmation: false };
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Çıkış hatası:', error);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      signIn,
      signUp,
      signOut,
    }),
    [session, loading, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}