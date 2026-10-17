import { useState, type FormEvent } from 'react';
import { AlertCircle, Loader2, LogIn, Mail } from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import PasswordInput from './PasswordInput';

export default function LoginPage() {
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submitting) return;

    if (!email.trim() || !password) {
      setError('E-posta ve şifre gerekli.');
      return;
    }

    setSubmitting(true);
    setError('');

    const result = await signIn(email, password);

    if (result.error) {
      setError(result.error);
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
          <label htmlFor="login-password">Şifre</label>

          <PasswordInput
            id="login-password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            placeholder="Şifreni gir"
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
            <LogIn size={16} />
          )}
          {submitting ? 'Giriş yapılıyor...' : 'Giriş Yap'}
        </button>
      </form>
    </>
  );
}