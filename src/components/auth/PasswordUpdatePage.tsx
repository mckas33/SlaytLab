import { useRef, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  KeyRound,
  Loader2,
  MailCheck,
} from 'lucide-react';

import {
  useAuth,
  type AuthActionResult,
} from '../../contexts/AuthContext';
import {
  getPasswordError,
  getPasswordRequirements,
} from '../../utils/authValidation';
import AuthLayout from './AuthLayout';
import PasswordInput from './PasswordInput';

export default function PasswordUpdatePage() {
  const {
    session,
    passwordRecoveryStatus,
    updatePassword,
    leavePasswordRecovery,
  } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const submittingRef = useRef(false);
  const passwordsMatch = password === confirm;
  const hasValidRecovery =
    passwordRecoveryStatus === 'ready' && Boolean(session);

  const finishRecovery = async () => {
    setLeaving(true);
    setError('');

    try {
      const result: AuthActionResult = await leavePasswordRecovery();
      if (result.error) setError(result.error);
    } catch {
      setError('Oturum kapatılamadı. Lütfen tekrar dene.');
    } finally {
      setLeaving(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasAttemptedSubmit(true);

    if (submittingRef.current) return;

    if (!hasValidRecovery) {
      setError('Sıfırlama bağlantısı geçersiz veya süresi dolmuş. Yeni bir bağlantı iste.');
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

    if (password !== confirm) {
      setError('Şifreler eşleşmiyor.');
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setError('');

    try {
      const result = await updatePassword(password);

      if (result.error) {
        setError(result.error);
      } else {
        setCompleted(true);
      }
    } catch {
      setError('Şifre güncellenemedi. Lütfen tekrar dene.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (completed) {
    return (
      <AuthLayout>
        <div className="auth-success">
          <div className="auth-success-icon">
            <MailCheck size={26} />
          </div>
          <h1>Şifren güncellendi</h1>
          <p>Yeni şifrenle giriş yapabilirsin.</p>
          {error && <p className="auth-error-text" role="alert">{error}</p>}
          <button
            type="button"
            className="primary-button auth-submit"
            onClick={() => void finishRecovery()}
            disabled={leaving}
          >
            {leaving ? 'Oturum kapatılıyor...' : 'Giriş ekranına dön'}
          </button>
        </div>
      </AuthLayout>
    );
  }

  if (!hasValidRecovery) {
    return (
      <AuthLayout>
        <div className="auth-success">
          <div className="auth-success-icon auth-invalid-icon">
            <AlertCircle size={26} />
          </div>
          <h1>Bağlantı kullanılamıyor</h1>
          <p>
            Parola sıfırlama bağlantısı geçersiz veya süresi dolmuş olabilir.
            Giriş ekranından yeni bir bağlantı isteyebilirsin.
          </p>
          {error && <p className="auth-error-text" role="alert">{error}</p>}
          <button
            type="button"
            className="primary-button auth-submit"
            onClick={() => void finishRecovery()}
            disabled={leaving}
          >
            {leaving ? 'Yönlendiriliyor...' : 'Giriş ekranına dön'}
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <header className="auth-heading">
        <h1>Yeni şifre belirle</h1>
        <p>Hesabın için yeni bir şifre oluştur.</p>
      </header>

      <form className="auth-form" onSubmit={submit} noValidate>
        <div className="auth-field">
          <label htmlFor="reset-password">Yeni şifre</label>
          <PasswordInput
            id="reset-password"
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
          <label htmlFor="reset-password-confirm">Yeni şifre (tekrar)</label>
          <PasswordInput
            id="reset-password-confirm"
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
            <KeyRound size={16} />
          )}
          {submitting ? 'Şifre güncelleniyor...' : 'Yeni şifreyi kaydet'}
        </button>
      </form>
    </AuthLayout>
  );
}