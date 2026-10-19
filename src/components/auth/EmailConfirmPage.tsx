import { AlertTriangle, MailCheck } from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import AuthLayout from './AuthLayout';

export default function EmailConfirmPage() {
  const {
    emailConfirmStatus,
    emailConfirmMessage,
    dismissEmailConfirm,
    isEmailVerified,
  } = useAuth();

  const isSuccess =
    emailConfirmStatus === 'success' ||
    (emailConfirmStatus === 'none' && isEmailVerified);

  return (
    <AuthLayout>
      <div className="auth-success">
        <div
          className={`auth-success-icon${isSuccess ? '' : ' auth-invalid-icon'}`}
        >
          {isSuccess ? <MailCheck size={26} /> : <AlertTriangle size={26} />}
        </div>

        <h1>{isSuccess ? 'E-posta doğrulandı' : 'Doğrulama başarısız'}</h1>

        <p>
          {isSuccess
            ? 'E-posta adresin başarıyla doğrulandı. SlaytLab’ı kullanmaya devam edebilirsin.'
            : emailConfirmMessage ??
              'Doğrulama bağlantısı geçersiz veya süresi dolmuş.'}
        </p>

        <button
          type="button"
          className="primary-button auth-submit"
          onClick={dismissEmailConfirm}
        >
          {isSuccess ? 'Uygulamaya devam et' : 'Tamam'}
        </button>
      </div>
    </AuthLayout>
  );
}
