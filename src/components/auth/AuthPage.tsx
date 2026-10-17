import { useState } from 'react';

import AuthLayout from './AuthLayout';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';

type AuthMode = 'login' | 'register';

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');

  return (
    <AuthLayout>
      <div className="auth-tabs" role="tablist" aria-label="Kimlik doğrulama">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'login'}
          className={mode === 'login' ? 'active' : ''}
          onClick={() => setMode('login')}
        >
          Giriş Yap
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={mode === 'register'}
          className={mode === 'register' ? 'active' : ''}
          onClick={() => setMode('register')}
        >
          Kayıt Ol
        </button>
      </div>

      {mode === 'login' ? (
        <LoginPage />
      ) : (
        <RegisterPage onGoToLogin={() => setMode('login')} />
      )}
    </AuthLayout>
  );
}