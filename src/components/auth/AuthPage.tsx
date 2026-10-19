import { useState } from 'react';

import AuthLayout from './AuthLayout';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import PasswordResetRequestPage from './PasswordResetRequestPage';

type AuthMode = 'login' | 'register' | 'reset-request';

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');

  return (
    <AuthLayout>
      {mode === 'reset-request' ? (
        <PasswordResetRequestPage onBack={() => setMode('login')} />
      ) : (
        <>
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
            <LoginPage onForgotPassword={() => setMode('reset-request')} />
          ) : (
            <RegisterPage onGoToLogin={() => setMode('login')} />
          )}
        </>
      )}
    </AuthLayout>
  );
}