import { useState, type FormEvent } from 'react';
import { AlertCircle, Loader2, Mail, MailCheck, UserPlus } from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import PasswordInput from './PasswordInput';

const MIN_PASSWORD_LENGTH = 8;

interface Props {
  onGoToLogin: () => void;
}

export default function RegisterPage({ onGoToLogin }: Props) {
  const { signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmedEmail, setConfirmedEmail] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submitting) return;

    if (!email.trim()) {
      setError('E-posta adresi gerekli.');
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalı.`);
      return;
    }

    if (password !== confirm) {
      setError('Şifreler eşleşmiyor.');
      return;
    }

    setSubmitting(true);
    setError('');

    const result = await signUp(email, password);

    if (result.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    if (result.needsEmailConfirmation) {
      setConfirmedEmail(email.trim());
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
          <strong>{confirmedEmail}</strong> adresine bir doğrulama bağlantısı
          gönderdik. Bağlantıya tıkladıktan sonra giriş yapabilirsin.
        </p>

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
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="ornek@gmail.com"
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
            onChange={setPassword}
            autoComplete="new-password"
            placeholder={`En az ${MIN_PASSWORD_LENGTH} karakter`}
            disabled={submitting}
          />
        </div>

        <div className="auth-field">
          <label htmlFor="register-confirm">Şifre (tekrar)</label>

          <PasswordInput
            id="register-confirm"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            placeholder="Şifreni tekrar gir"
            disabled={submitting}
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