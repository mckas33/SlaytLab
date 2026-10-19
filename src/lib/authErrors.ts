import type { AuthError } from '@supabase/supabase-js';

export function isDuplicateEmailError(error: AuthError): boolean {
  return (
    error.code === 'user_already_exists' ||
    error.code === 'email_exists' ||
    error.message.toLowerCase().includes('already registered')
  );
}

export function translateAuthError(
  error: AuthError,
  context: 'default' | 'email-change' = 'default'
): string {
  const duplicateEmailMessage =
    context === 'email-change'
      ? 'E-posta adresi değiştirilemedi. Farklı bir adres deneyebilirsin.'
      : 'Bu e-posta ile zaten bir hesap var.';

  switch (error.code) {
    case 'invalid_credentials':
      return 'E-posta veya şifre hatalı.';
    case 'email_not_confirmed':
      return 'E-posta adresin henüz doğrulanmamış. Gelen kutunu kontrol et.';
    case 'user_already_exists':
    case 'email_exists':
      return duplicateEmailMessage;
    case 'weak_password':
      return 'Şifre sağlayıcının güvenlik kurallarını karşılamıyor. Daha güçlü bir şifre seç.';
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'Çok fazla deneme yapıldı. Bir süre sonra tekrar dene.';
    case 'signup_disabled':
      return 'Yeni kayıtlar şu anda kapalı.';
    case 'email_address_invalid':
      return 'Geçerli bir e-posta adresi gir.';
    case 'validation_failed':
      return 'Bilgiler doğrulanamadı. E-posta ve şifre kurallarını kontrol et.';
    case 'otp_expired':
    case 'flow_state_expired':
      return 'Bağlantı geçersiz veya süresi dolmuş. Yeni bir sıfırlama bağlantısı iste.';
    case 'bad_code_verifier':
      return 'Bağlantı doğrulanamadı. Yeni bir sıfırlama bağlantısı iste.';
    case 'same_password':
      return 'Yeni şifren mevcut şifrenle aynı olamaz.';
    default:
      break;
  }

  const message = error.message.toLowerCase();

  if (message.includes('invalid login credentials')) {
    return 'E-posta veya şifre hatalı.';
  }

  if (message.includes('already registered')) {
    return duplicateEmailMessage;
  }

  if (message.includes('email not confirmed')) {
    return 'E-posta adresin henüz doğrulanmamış. Gelen kutunu kontrol et.';
  }

  if (message.includes('fetch') || message.includes('network')) {
    return 'Sunucuya bağlanılamadı. İnternet bağlantını kontrol et.';
  }

  return 'Bir hata oluştu. Lütfen tekrar dene.';
}