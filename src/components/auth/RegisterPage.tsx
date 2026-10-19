import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Loader2,
  Mail,
  MailCheck,
  RefreshCw,
  UserPlus,
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import {
  getPasswordError,
  getPasswordRequirements,
  isValidEmail,
} from '../../utils/authValidation';
import PasswordInput from './PasswordInput';

interface Props {
  onGoToLogin: () => void;
}

export default function RegisterPage({ onGoToLogin }: Props) {
  const { signUp, resendSignupConfirmation } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmedEmail, setConfirmedEmail] = useState<string | null>(null);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [resendHasError, setResendHasError] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const submittingRef = useRef(false);
  const resendRef = useRef(false);
  const passwordsMatch = password === confirm;

  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = window.setTimeout(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const resendConfirmation = async () => {
    if (!confirmedEmail || resendRef.current || resendCooldown > 0) return;

    resendRef.current = true;
    setResending(true);
    setResendMessage('');

    try {
      const result = await resendSignupConfirmation(confirmedEmail);
      setResendHasError(Boolean(result.error));
      setResendMessage(
        result.error ??
          'İstek alındı. E-posta adresin için doğrulama bağlantısı gönderildiyse gelen kutunu kontrol et.'
      );
      setResendCooldown(30);
    } catch {
      setResendHasError(true);
      setResendMessage('E-posta gönderilemedi. Lütfen daha sonra tekrar dene.');
      setResendCooldown(30);
    } finally {
      resendRef.current = false;
      setResending(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasAttemptedSubmit(true);

    if (submittingRef.current) return;

    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setError('E-posta adresi gerekli.');
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setError('Geçerli bir e-posta adresi gir.');
      return;
    }

    if (getPasswordError(password)) {
      const unmet = getPasswordRequirements(password).filter(
        (requirement) => !requirement.valid
      );

      setError(
        unmet.length === 1
          ? unmet[0].error
          : `Şifre şu kuralları karşılamalı: ${unmet
              .map((requirement) => requirement.label)
              .join('; ')}.`
      );
      return;
    }

    if (!passwordsMatch) {
      setError('Şifreler eşleşmiyor.');
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setError('');

    try {
      const result = await signUp(normalizedEmail, password);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.needsEmailConfirmation) {
        setConfirmedEmail(normalizedEmail);
        setResendCooldown(30);
      }
    } catch {
      setError('Kayıt sırasında bir hata oluştu. Lütfen tekrar dene.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (confirmedEmail) {
    return (
      <div className="auth-success">
        <div className="auth-success-icon">
          <MailCheck size={26} />
        </div>

        <h1>E-postanı doğrula</h1>

        <p>
          Kayıt isteğin alındı. E-posta adresin için bir doğrulama bağlantısı
          gönderildiyse gelen kutunu kontrol et. Hesabın varsa giriş yapabilir
          veya parolanı sıfırlayabilirsin.
        </p>

        <button
          type="button"
          className="secondary-button auth-resend-button"
          onClick={() => void resendConfirmation()}
          disabled={resending || resendCooldown > 0}
        >
          {resending ? (
            <Loader2 size={15} className="auth-spinner" />
          ) : (
            <RefreshCw size={15} />
          )}
          {resending
            ? 'Gönderiliyor...'
            : resendCooldown > 0
              ? `Yeniden gönder (${resendCooldown} sn)`
              : 'Doğrulama e-postasını yeniden gönder'}
        </button>

        {resendMessage && (
          <p
            className={resendHasError ? 'auth-error-text' : 'auth-status-text'}
            role={resendHasError ? 'alert' : 'status'}
          >
            {resendMessage}
          </p>
        )}

        <button
          type="button"
          className="primary-button auth-submit"
          onClick={onGoToLogin}
        >
          Giriş ekranına dön
        </button>
      </div>
    );
  }

  return (
    <>
      <header className="auth-heading">
        <h1>Hesap oluştur</h1>
        <p>Slaytların ve soruların hesabına bağlı olarak güvenle saklanır.</p>
      </header>

      <form className="auth-form" onSubmit={submit} noValidate>
        <div className="auth-field">
          <label htmlFor="register-email">E-posta</label>

          <div className="auth-input-wrap">
            <Mail size={16} className="auth-input-icon" />

            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError('');
              }}
              autoComplete="email"
              placeholder="e-posta@ornek.com"
              disabled={submitting}
              autoFocus
              required
            />
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="register-password">Şifre</label>

          <PasswordInput
            id="register-password"
            value={password}
            onChange={(value) => {
              setPassword(value);
              setError('');
            }}
            autoComplete="new-password"
            placeholder="Güçlü bir şifre oluştur"
            disabled={submitting}
          />
        </div>

        <div className="auth-field">
          <label htmlFor="register-confirm">Şifre (tekrar)</label>

          <PasswordInput
            id="register-confirm"
            value={confirm}
            onChange={(value) => {
              setConfirm(value);
              setError('');
            }}
            autoComplete="new-password"
            placeholder="Şifreni tekrar gir"
            disabled={submitting}
            aria-invalid={hasAttemptedSubmit && confirm.length > 0 && !passwordsMatch}
          />
        </div>

        {error && (
          <div className="auth-error" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          className="primary-button auth-submit"
          disabled={submitting}
        >
          {submitting ? (
            <Loader2 size={16} className="auth-spinner" />
          ) : (
            <UserPlus size={16} />
          )}
          {submitting ? 'Hesap oluşturuluyor...' : 'Kayıt Ol'}
        </button>
      </form>
    </>
  );
}