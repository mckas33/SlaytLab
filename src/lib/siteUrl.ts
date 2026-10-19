/**
 * Uygulama kök URL'si — e-posta yönlendirmeleri için tek kaynak.
 * Production'da VITE_SITE_URL ile sabitle; yoksa window.location.origin kullanılır.
 */
export function getSiteUrl(): string {
  const configured = import.meta.env.VITE_SITE_URL;

  if (typeof configured === 'string' && configured.trim().length > 0) {
    return configured.trim().replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return '';
}

export function getEmailConfirmRedirectUrl(): string {
  const url = new URL(getSiteUrl());
  url.searchParams.set('flow', 'email-confirm');
  return url.toString();
}

export function getPasswordResetRedirectUrl(): string {
  const url = new URL(getSiteUrl());
  url.searchParams.set('flow', 'password-reset');
  return url.toString();
}
