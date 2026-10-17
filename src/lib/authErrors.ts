import type { AuthError } from '@supabase/supabase-js';

export function translateAuthError(error: AuthError): string {
  switch (error.code) {
    case 'invalid_credentials':
      return 'E-posta veya şifre hatalı.';
    case 'email_not_confirmed':
      return 'E-posta adresin henüz doğrulanmamış. Gelen kutunu kontrol et.';
    case 'user_already_exists':
    case 'email_exists':
      return 'Bu e-posta ile zaten bir hesap var.';
    case 'weak_password':
      return 'Şifre çok zayıf. Daha uzun ve karmaşık bir şifre seç.';
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'Çok fazla deneme yapıldı. Bir süre sonra tekrar dene.';
    case 'signup_disabled':
      return 'Yeni kayıtlar şu anda kapalı.';
    case 'email_address_invalid':
      return 'Geçerli bir e-posta adresi gir.';
    default:
      break;
  }

  const message = error.message.toLowerCase();

  if (message.includes('invalid login credentials')) {
    return 'E-posta veya şifre hatalı.';
  }

  if (message.includes('already registered')) {
    return 'Bu e-posta ile zaten bir hesap var.';
  }

  if (message.includes('email not confirmed')) {
    return 'E-posta adresin henüz doğrulanmamış. Gelen kutunu kontrol et.';
  }

  if (message.includes('fetch') || message.includes('network')) {
    return 'Sunucuya bağlanılamadı. İnternet bağlantını kontrol et.';
  }

  return 'Bir hata oluştu. Lütfen tekrar dene.';
}