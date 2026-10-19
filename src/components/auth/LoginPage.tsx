import { useRef, useState, type FormEvent } from 'react';
import { AlertCircle, Loader2, LogIn, Mail } from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import { isValidEmail } from '../../utils/authValidation';
import PasswordInput from './PasswordInput';

interface Props {
  onForgotPassword: () => void;
}

export default function LoginPage({ onForgotPassword }: Props) {
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submittingRef.current) return;

    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      setError('E-posta ve şifre gerekli.');
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
      const result = await signIn(normalizedEmail, password);

      if (result.error) {
        setError(result.error);
      }
    } catch {
      setError('Giriş sırasında bir hata oluştu. Lütfen tekrar dene.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <>
      <header className="auth-heading">
        <h1>Tekrar hoş geldin</h1>
        <p>Slaytlarına ve sorularına ulaşmak için hesabına giriş yap.</p>
      </header>

      <form className="auth-form" onSubmit={submit} noValidate>
        <div className="auth-field">
          <label htmlFor="login-email">E-posta</label>

          <div className="auth-input-wrap">
            <Mail size={16} className="auth-input-icon" />

            <input
              id="login-email"
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
          <label htmlFor="login-password">Şifre</label>

          <PasswordInput
            id="login-password"
            value={password}
            onChange={(value) => {
              setPassword(value);
              setError('');
            }}
            autoComplete="current-password"
            placeholder="Şifreni gir"
            disabled={submitting}
          />
        </div>

        <div className="auth-link-row">
          <button
            type="button"
            className="auth-text-link"
            onClick={onForgotPassword}
          >
            Şifremi unuttum?
          </button>
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
            <LogIn size={16} />
          )}
          {submitting ? 'Giriş yapılıyor...' : 'Giriş Yap'}
        </button>
      </form>
    </>
  );
}