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

import {
  authCallbackError,
  isEmailConfirmReturn,
  isImplicitAuthCallback,
  isPasswordRecoveryCallback,
  isPasswordResetReturn,
  isSupabaseConfigured,
  supabase,
} from '../lib/supabase';
import {
  getEmailConfirmRedirectUrl,
  getPasswordResetRedirectUrl,
} from '../lib/siteUrl';
import { isDuplicateEmailError, translateAuthError } from '../lib/authErrors';
import { getPasswordError, isValidEmail } from '../utils/authValidation';

export interface AuthActionResult {
  error: string | null;
  needsEmailConfirmation: boolean;
}

export type PasswordRecoveryStatus = 'none' | 'ready' | 'invalid';
export type EmailConfirmStatus = 'none' | 'success' | 'error';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  passwordRecoveryStatus: PasswordRecoveryStatus;
  emailConfirmStatus: EmailConfirmStatus;
  emailConfirmMessage: string | null;
  isEmailVerified: boolean;
  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signUp: (email: string, password: string) => Promise<AuthActionResult>;
  resendSignupConfirmation: (email: string) => Promise<AuthActionResult>;
  requestPasswordReset: (email: string) => Promise<AuthActionResult>;
  updatePassword: (password: string) => Promise<AuthActionResult>;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<AuthActionResult>;
  changeEmail: (newEmail: string) => Promise<AuthActionResult>;
  deleteAccount: (password: string) => Promise<AuthActionResult>;
  leavePasswordRecovery: () => Promise<AuthActionResult>;
  dismissEmailConfirm: () => void;
  signOut: () => Promise<AuthActionResult>;
  signOutCurrent: () => Promise<AuthActionResult>;
  signOutAll: () => Promise<AuthActionResult>;
}

const NETWORK_ERROR = 'Sunucuya bağlanılamadı. İnternet bağlantını kontrol et.';
const RECOVERY_SESSION_KEY = 'slaytlab:password-recovery';

const hasStoredRecoverySession = (): boolean => {
  try {
    return window.sessionStorage.getItem(RECOVERY_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
};

const setStoredRecoverySession = (active: boolean): void => {
  try {
    if (active) {
      window.sessionStorage.setItem(RECOVERY_SESSION_KEY, 'true');
    } else {
      window.sessionStorage.removeItem(RECOVERY_SESSION_KEY);
    }
  } catch {
  }
};

const cleanAuthFlowParams = (): void => {
  const cleanUrl = new URL(window.location.href);
  cleanUrl.searchParams.delete('flow');
  cleanUrl.searchParams.delete('error');
  cleanUrl.searchParams.delete('error_code');
  cleanUrl.searchParams.delete('error_description');
  window.history.replaceState(
    null,
    '',
    `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`
  );
};

const cleanAuthTokenFragment = (): void => {
  const url = new URL(window.location.href);
  const fragment = new URLSearchParams(url.hash.slice(1));
  const tokenParams = [
    'access_token',
    'refresh_token',
    'provider_token',
    'provider_refresh_token',
    'id_token',
  ];

  if (!tokenParams.some((param) => fragment.has(param))) return;

  window.history.replaceState(
    window.history.state,
    '',
    `${url.pathname}${url.search}`
  );
};

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
  const [passwordRecoveryStatus, setPasswordRecoveryStatus] =
    useState<PasswordRecoveryStatus>('none');
  const [emailConfirmStatus, setEmailConfirmStatus] =
    useState<EmailConfirmStatus>(() => {
      if (authCallbackError && isEmailConfirmReturn) return 'error';
      return 'none';
    });
  const [emailConfirmMessage, setEmailConfirmMessage] = useState<string | null>(
    () =>
      authCallbackError && isEmailConfirmReturn
        ? 'Doğrulama bağlantısı geçersiz veya süresi dolmuş. Yeni bir doğrulama e-postası iste.'
        : null
  );

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let active = true;
    const hasStoredRecovery = hasStoredRecoverySession();
    const expectsPasswordRecovery =
      isPasswordResetReturn || hasStoredRecovery;

    if (expectsPasswordRecovery) {
      setPasswordRecoveryStatus('invalid');
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);

      if (event === 'PASSWORD_RECOVERY') {
        setStoredRecoverySession(true);
        setPasswordRecoveryStatus('ready');
      } else if (event === 'SIGNED_OUT') {
        setStoredRecoverySession(false);
        setPasswordRecoveryStatus('none');
      } else if (
        isEmailConfirmReturn &&
        (event === 'SIGNED_IN' || event === 'USER_UPDATED') &&
        nextSession?.user.email_confirmed_at
      ) {
        setEmailConfirmStatus('success');
        setEmailConfirmMessage(null);
      }

      setLoading(false);
    });

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);

        if (
          data.session &&
          (isPasswordRecoveryCallback || hasStoredRecovery)
        ) {
          setStoredRecoverySession(true);
          setPasswordRecoveryStatus('ready');
        } else if (expectsPasswordRecovery) {
          setPasswordRecoveryStatus('invalid');
        }

        if (isEmailConfirmReturn) {
          if (authCallbackError) {
            setEmailConfirmStatus('error');
            setEmailConfirmMessage(
              'Doğrulama bağlantısı geçersiz veya süresi dolmuş. Yeni bir doğrulama e-postası iste.'
            );
          } else if (data.session?.user.email_confirmed_at) {
            setEmailConfirmStatus('success');
            setEmailConfirmMessage(null);
          } else if (data.session) {
            setEmailConfirmStatus('success');
            setEmailConfirmMessage(null);
          } else {
            setEmailConfirmStatus('error');
            setEmailConfirmMessage(
              'Doğrulama tamamlanamadı. Bağlantı süresi dolmuş olabilir.'
            );
          }
        }

        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      })
      .finally(() => {
        if (active && isImplicitAuthCallback) {
          cleanAuthTokenFragment();
          window.location.reload();
        } else if (active) {
          cleanAuthTokenFragment();
        }
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthActionResult> => {
      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail || !password) {
        return {
          error: 'E-posta ve şifre gerekli.',
          needsEmailConfirmation: false,
        };
      }

      if (!isValidEmail(normalizedEmail)) {
        return {
          error: 'Geçerli bir e-posta adresi gir.',
          needsEmailConfirmation: false,
        };
      }

      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
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
      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail) {
        return {
          error: 'E-posta adresi gerekli.',
          needsEmailConfirmation: false,
        };
      }

      if (!isValidEmail(normalizedEmail)) {
        return {
          error: 'Geçerli bir e-posta adresi gir.',
          needsEmailConfirmation: false,
        };
      }

      const passwordError = getPasswordError(password);

      if (passwordError) {
        return { error: passwordError, needsEmailConfirmation: false };
      }

      try {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { emailRedirectTo: getEmailConfirmRedirectUrl() },
        });

        if (error) {
          if (isDuplicateEmailError(error)) {
            return { error: null, needsEmailConfirmation: true };
          }

          return {
            error: translateAuthError(error),
            needsEmailConfirmation: false,
          };
        }

        if (
          data.user &&
          data.user.identities &&
          data.user.identities.length === 0
        ) {
          return { error: null, needsEmailConfirmation: true };
        }

        return { error: null, needsEmailConfirmation: data.session === null };
      } catch {
        return { error: NETWORK_ERROR, needsEmailConfirmation: false };
      }
    },
    []
  );

  const resendSignupConfirmation = useCallback(
    async (email: string): Promise<AuthActionResult> => {
      const normalizedEmail = email.trim().toLowerCase();

      if (!isValidEmail(normalizedEmail)) {
        return {
          error: 'Geçerli bir e-posta adresi gir.',
          needsEmailConfirmation: false,
        };
      }

      if (
        session?.user.email_confirmed_at &&
        session.user.email?.toLowerCase() === normalizedEmail
      ) {
        return {
          error: 'Bu e-posta adresi zaten doğrulanmış.',
          needsEmailConfirmation: false,
        };
      }

      try {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: normalizedEmail,
          options: { emailRedirectTo: getEmailConfirmRedirectUrl() },
        });

        if (error) {
          if (
            isDuplicateEmailError(error) ||
            error.code === 'user_not_found' ||
            error.message.toLowerCase().includes('user not found')
          ) {
            return { error: null, needsEmailConfirmation: true };
          }

          return {
            error: translateAuthError(error),
            needsEmailConfirmation: false,
          };
        }

        return { error: null, needsEmailConfirmation: true };
      } catch {
        return { error: NETWORK_ERROR, needsEmailConfirmation: false };
      }
    },
    [session]
  );

  const requestPasswordReset = useCallback(
    async (email: string): Promise<AuthActionResult> => {
      const normalizedEmail = email.trim().toLowerCase();

      if (!isValidEmail(normalizedEmail)) {
        return {
          error: 'Geçerli bir e-posta adresi gir.',
          needsEmailConfirmation: false,
        };
      }

      try {
        const { error } = await supabase.auth.resetPasswordForEmail(
          normalizedEmail,
          { redirectTo: getPasswordResetRedirectUrl() }
        );

        if (error?.code === 'user_not_found') {
          return { error: null, needsEmailConfirmation: false };
        }

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

  const updatePassword = useCallback(
    async (password: string): Promise<AuthActionResult> => {
      if (passwordRecoveryStatus !== 'ready' || !session) {
        return {
          error:
            'Sıfırlama bağlantısı geçersiz veya süresi dolmuş. Yeni bir bağlantı iste.',
          needsEmailConfirmation: false,
        };
      }

      const passwordError = getPasswordError(password);

      if (passwordError) {
        return { error: passwordError, needsEmailConfirmation: false };
      }

      try {
        const { error } = await supabase.auth.updateUser({ password });

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
    [passwordRecoveryStatus, session]
  );

  const changePassword = useCallback(
    async (
      currentPassword: string,
      newPassword: string
    ): Promise<AuthActionResult> => {
      const email = session?.user.email;

      if (!email) {
        return {
          error: 'Oturum bulunamadı. Yeniden giriş yap.',
          needsEmailConfirmation: false,
        };
      }

      if (!currentPassword) {
        return {
          error: 'Mevcut şifreni gir.',
          needsEmailConfirmation: false,
        };
      }

      const passwordError = getPasswordError(newPassword);

      if (passwordError) {
        return { error: passwordError, needsEmailConfirmation: false };
      }

      if (currentPassword === newPassword) {
        return {
          error: 'Yeni şifren mevcut şifrenle aynı olamaz.',
          needsEmailConfirmation: false,
        };
      }

      try {
        const { error: reauthError } = await supabase.auth.signInWithPassword({
          email,
          password: currentPassword,
        });

        if (reauthError) {
          return {
            error: 'Mevcut şifre hatalı.',
            needsEmailConfirmation: false,
          };
        }

        const { error } = await supabase.auth.updateUser({
          password: newPassword,
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
    [session]
  );

  const changeEmail = useCallback(
    async (newEmail: string): Promise<AuthActionResult> => {
      const normalizedEmail = newEmail.trim().toLowerCase();
      const current = session?.user.email?.toLowerCase();

      if (!session) {
        return {
          error: 'Oturum bulunamadı. Yeniden giriş yap.',
          needsEmailConfirmation: false,
        };
      }

      if (!isValidEmail(normalizedEmail)) {
        return {
          error: 'Geçerli bir e-posta adresi gir.',
          needsEmailConfirmation: false,
        };
      }

      if (normalizedEmail === current) {
        return {
          error: 'Yeni e-posta mevcut adresinle aynı.',
          needsEmailConfirmation: false,
        };
      }

      try {
        const { error } = await supabase.auth.updateUser(
          { email: normalizedEmail },
          { emailRedirectTo: getEmailConfirmRedirectUrl() }
        );

        if (error) {
          return {
            error: translateAuthError(error, 'email-change'),
            needsEmailConfirmation: false,
          };
        }

        return { error: null, needsEmailConfirmation: true };
      } catch {
        return { error: NETWORK_ERROR, needsEmailConfirmation: false };
      }
    },
    [session]
  );

  const deleteAccount = useCallback(
    async (password: string): Promise<AuthActionResult> => {
      const email = session?.user.email;

      if (!email || !session) {
        return {
          error: 'Oturum bulunamadı. Yeniden giriş yap.',
          needsEmailConfirmation: false,
        };
      }

      if (!password) {
        return {
          error: 'Hesabı silmek için şifreni gir.',
          needsEmailConfirmation: false,
        };
      }

      try {
        const { error: reauthError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (reauthError) {
          return {
            error: 'Şifre hatalı. Hesap silinmedi.',
            needsEmailConfirmation: false,
          };
        }

        const { error: rpcError } = await supabase.rpc('delete_own_account');

        if (rpcError) {
          return {
            error:
              'Hesap kimliği silinemedi. Supabase’de delete_own_account fonksiyonunun kurulu olduğundan emin ol. Ayrıntı: ' +
              rpcError.message,
            needsEmailConfirmation: false,
          };
        }

        setStoredRecoverySession(false);
        setPasswordRecoveryStatus('none');
        await supabase.auth.signOut({ scope: 'local' });

        return { error: null, needsEmailConfirmation: false };
      } catch {
        return { error: NETWORK_ERROR, needsEmailConfirmation: false };
      }
    },
    [session]
  );

  const leavePasswordRecovery = useCallback(async (): Promise<AuthActionResult> => {
    if (passwordRecoveryStatus === 'ready') {
      try {
        const { error } = await supabase.auth.signOut({ scope: 'local' });

        if (error) {
          return {
            error: translateAuthError(error),
            needsEmailConfirmation: false,
          };
        }
      } catch {
        return { error: NETWORK_ERROR, needsEmailConfirmation: false };
      }
    }

    setPasswordRecoveryStatus('none');
    setStoredRecoverySession(false);
    cleanAuthFlowParams();

    return { error: null, needsEmailConfirmation: false };
  }, [passwordRecoveryStatus]);

  const dismissEmailConfirm = useCallback(() => {
    setEmailConfirmStatus('none');
    setEmailConfirmMessage(null);
    cleanAuthFlowParams();
  }, []);

  const signOutWithScope = useCallback(
    async (scope: 'local' | 'global'): Promise<AuthActionResult> => {
      try {
        const { error } = await supabase.auth.signOut({ scope });

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

  const signOut = useCallback(() => signOutWithScope('local'), [
    signOutWithScope,
  ]);

  const signOutCurrent = signOut;

  const signOutAll = useCallback(() => signOutWithScope('global'), [
    signOutWithScope,
  ]);

  const isEmailVerified = Boolean(session?.user.email_confirmed_at);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      passwordRecoveryStatus,
      emailConfirmStatus,
      emailConfirmMessage,
      isEmailVerified,
      signIn,
      signUp,
      resendSignupConfirmation,
      requestPasswordReset,
      updatePassword,
      changePassword,
      changeEmail,
      deleteAccount,
      leavePasswordRecovery,
      dismissEmailConfirm,
      signOut,
      signOutCurrent,
      signOutAll,
    }),
    [
      session,
      loading,
      passwordRecoveryStatus,
      emailConfirmStatus,
      emailConfirmMessage,
      isEmailVerified,
      signIn,
      signUp,
      resendSignupConfirmation,
      requestPasswordReset,
      updatePassword,
      changePassword,
      changeEmail,
      deleteAccount,
      leavePasswordRecovery,
      dismissEmailConfirm,
      signOut,
      signOutCurrent,
      signOutAll,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
