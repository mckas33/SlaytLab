import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const initialUrl =
  typeof window === 'undefined' ? null : new URL(window.location.href);
const initialHashParams = new URLSearchParams(
  initialUrl?.hash.slice(1) ?? ''
);

export const isPasswordResetReturn =
  initialUrl?.searchParams.get('flow') === 'password-reset';
export const isEmailConfirmReturn =
  initialUrl?.searchParams.get('flow') === 'email-confirm';

export const isImplicitAuthCallback = Boolean(
  initialHashParams.has('access_token') &&
    initialHashParams.has('refresh_token')
);

export const isPasswordRecoveryCallback = Boolean(
  isPasswordResetReturn &&
    (initialUrl?.searchParams.has('code') ||
      initialHashParams.get('type') === 'recovery')
);

export const authCallbackError =
  initialUrl?.searchParams.get('error_description') ??
  initialUrl?.searchParams.get('error') ??
  initialHashParams.get('error_description') ??
  initialHashParams.get('error') ??
  null;

export const isSupabaseConfigured =
  typeof supabaseUrl === 'string' &&
  supabaseUrl.trim().length > 0 &&
  typeof supabaseAnonKey === 'string' &&
  supabaseAnonKey.trim().length > 0;

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl.trim() : 'http://localhost:54321',
  isSupabaseConfigured
    ? supabaseAnonKey.trim()
    : 'supabase-anon-key-not-configured',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Keep previously-issued implicit links working while new auth flows use PKCE.
      flowType: isImplicitAuthCallback ? 'implicit' : 'pkce',
    },
  }
);
