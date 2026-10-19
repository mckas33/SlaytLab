import { useRef, useState, type FormEvent } from 'react';
import { AlertCircle, Loader2, Mail, MailCheck } from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import { isValidEmail } from '../../utils/authValidation';

interface Props {
  onBack: () => void;
}

export default function PasswordResetRequestPage({ onBack }: Props) {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [requested, setRequested] = useState(false);
  const submittingRef = useRef(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

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

    submittingRef.current = true;
    setSubmitting(true);
    setError('');

    try {
      const result = await requestPasswordReset(normalizedEmail);

      if (result.error) {
        setError(result.error);
      } else {
        setRequested(true);
      }
    } catch {
      setError('İstek gönderilemedi. Lütfen daha sonra tekrar dene.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (requested) {
    return (
      <div className="auth-success">
        <div className="auth-success-icon">
          <MailCheck size={26} />
        </div>
        <h1>E-postanı kontrol et</h1>
        <p role="status">
          İstek alındı. Bu e-posta adresiyle bir hesap varsa, parola sıfırlama
          bağlantısı gönderilecek.
        </p>
        <button
          type="button"
          className="primary-button auth-submit"
          onClick={onBack}
        >
          Giriş ekranına dön
        </button>
      </div>
    );
  }

  return (
    <>
      <header className="auth-heading">
        <h1>Şifreni sıfırla</h1>
        <p>Parola sıfırlama bağlantısı almak için e-posta adresini gir.</p>
      </header>

      <form className="auth-form" onSubmit={submit} noValidate>
        <div className="auth-field">
          <label htmlFor="reset-request-email">E-posta</label>
          <div className="auth-input-wrap">
            <Mail size={16} className="auth-input-icon" />
            <input
              id="reset-request-email"
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
            <Mail size={16} />
          )}
          {submitting ? 'Gönderiliyor...' : 'Sıfırlama bağlantısı gönder'}
        </button>

        <button
          type="button"
          className="auth-text-link auth-back-link"
          onClick={onBack}
          disabled={submitting}
        >
          Giriş ekranına dön
        </button>
      </form>
    </>
  );
}