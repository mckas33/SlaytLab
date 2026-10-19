import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  BadgeAlert,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  RefreshCw,
  Shield,
  Trash2,
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { useSlides } from '../contexts/SlideContext';
import {
  getPasswordRequirements,
  isValidEmail,
} from '../utils/authValidation';
import PasswordInput from './auth/PasswordInput';
import { useDialog } from './DialogProvider';
import { useToast } from './ToastProvider';

interface Props {
  onBack: () => void;
}

export default function ProfilePage({ onBack }: Props) {
  const {
    user,
    isEmailVerified,
    resendSignupConfirmation,
    changePassword,
    changeEmail,
    deleteAccount,
    signOutCurrent,
    signOutAll,
  } = useAuth();
  const { flushPending } = useSlides();
  const { showConfirm } = useDialog();
  const { showToast } = useToast();

  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState('');
  const [resendError, setResendError] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');
  const [emailError, setEmailError] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [passwordAttempted, setPasswordAttempted] = useState(false);

  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [signOutBusy, setSignOutBusy] = useState(false);

  const passwordsMatch = nextPassword === confirmPassword;

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const handleResend = async () => {
    if (!user?.email || resending || resendCooldown > 0) return;
    setResending(true);
    setResendMessage('');

    try {
      const result = await resendSignupConfirmation(user.email);
      setResendError(Boolean(result.error));
      setResendMessage(
        result.error ??
          'İstek alındı. E-posta adresin için doğrulama bağlantısı gönderildiyse gelen kutunu kontrol et.'
      );
      setResendCooldown(30);
    } catch {
      setResendError(true);
      setResendMessage('E-posta gönderilemedi. Lütfen daha sonra tekrar dene.');
      setResendCooldown(30);
    } finally {
      setResending(false);
    }
  };

  const handleChangeEmail = async (event: FormEvent) => {
    event.preventDefault();
    if (emailBusy) return;

    const normalized = newEmail.trim().toLowerCase();
    if (!isValidEmail(normalized)) {
      setEmailError(true);
      setEmailMessage('Geçerli bir e-posta adresi gir.');
      return;
    }

    setEmailBusy(true);
    setEmailMessage('');

    try {
      const result = await changeEmail(normalized);
      setEmailError(Boolean(result.error));
      setEmailMessage(
        result.error ??
          'E-posta değişikliği isteği alındı. Adresin doğrulama tamamlandıktan sonra değişir. Gelen kutunu kontrol et.'
      );
      if (!result.error) {
        setNewEmail('');
        showToast('E-posta değişikliği isteği alındı.', 'success');
      }
    } catch {
      setEmailError(true);
      setEmailMessage('E-posta değiştirilemedi.');
    } finally {
      setEmailBusy(false);
    }
  };

  const handleChangePassword = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordAttempted(true);
    if (passwordBusy) return;

    const unmetRequirements = getPasswordRequirements(nextPassword).filter(
      (requirement) => !requirement.valid
    );
    if (unmetRequirements.length) {
      setPasswordError(true);
      setPasswordMessage(
        unmetRequirements.length === 1
          ? unmetRequirements[0].error
          : `Şifre şu kuralları karşılamalı: ${unmetRequirements
              .map((requirement) => requirement.label)
              .join('; ')}.`
      );
      return;
    }

    if (!passwordsMatch) {
      setPasswordError(true);
      setPasswordMessage('Şifreler eşleşmiyor.');
      return;
    }

    setPasswordBusy(true);
    setPasswordMessage('');

    try {
      const result = await changePassword(currentPassword, nextPassword);
      setPasswordError(Boolean(result.error));
      setPasswordMessage(result.error ?? 'Şifren güncellendi.');
      if (!result.error) {
        setCurrentPassword('');
        setNextPassword('');
        setConfirmPassword('');
        setPasswordAttempted(false);
        showToast('Şifre güncellendi.', 'success');
      }
    } catch {
      setPasswordError(true);
      setPasswordMessage('Şifre güncellenemedi.');
    } finally {
      setPasswordBusy(false);
    }
  };

  const handleSignOut = async (everywhere: boolean) => {
    if (signOutBusy) return;
    setSignOutBusy(true);

    const saved = await flushPending();
    if (!saved) {
      const proceed = await showConfirm(
        'Bazı değişiklikler kaydedilemedi. Yine de çıkış yapılırsa bu değişiklikler kaybolur.',
        {
          title: 'Kaydedilmemiş değişiklikler',
          tone: 'danger',
          confirmLabel: 'Yine de çık',
        }
      );
      if (!proceed) {
        setSignOutBusy(false);
        return;
      }
    }

    const result = everywhere
      ? await signOutAll()
      : await signOutCurrent();
    if (result.error) {
      showToast(result.error, 'error');
      setSignOutBusy(false);
    }
  };

  const handleDelete = async (event: FormEvent) => {
    event.preventDefault();
    if (deleteBusy) return;
    if (deleteConfirmation !== 'Onaylıyorum') {
      setDeleteError('Devam etmek için “Onaylıyorum” yazmalısın.');
      return;
    }

    const confirmed = await showConfirm(
      'Hesabın, slaytların, görsellerin ve soruların kalıcı olarak silinecek. Bu işlem geri alınamaz.',
      {
        title: 'Hesabı sil',
        tone: 'danger',
        confirmLabel: 'Hesabı sil',
      }
    );

    if (!confirmed) return;

    setDeleteBusy(true);
    setDeleteError('');

    try {
      await flushPending();
      const result = await deleteAccount(deletePassword);
      if (result.error) {
        setDeleteError(result.error);
        setDeleteBusy(false);
        return;
      }
      showToast('Hesabın silindi.', 'success');
    } catch {
      setDeleteError('Hesap silinemedi.');
      setDeleteBusy(false);
    }
  };

  return (
    <div className="profile-page">
      <header className="profile-header">
        <div>
          <span className="editor-eyebrow">HESAP</span>
          <h1>Profil ve ayarlar</h1>
          <p>E-posta, güvenlik ve hesap yönetimi.</p>
        </div>

        <button type="button" className="secondary-button" onClick={onBack}>
          <ArrowLeft size={16} />
          Geri
        </button>
      </header>

      <div className="profile-grid">
        <section className="profile-card">
          <header className="profile-card-header">
            <Mail size={18} />
            <div>
              <h2>Hesap bilgileri</h2>
              <p>Kayıtlı e-posta ve doğrulama durumu.</p>
            </div>
          </header>

          <div className="profile-email-row">
            <div>
              <span className="profile-label">E-posta</span>
              <strong className="profile-email">{user?.email ?? '—'}</strong>
            </div>

            <span
              className={`profile-verify-badge ${isEmailVerified ? 'is-verified' : 'is-pending'}`}
            >
              {isEmailVerified ? (
                <>
                  <BadgeCheck size={14} />
                  Doğrulanmış
                </>
              ) : (
                <>
                  <BadgeAlert size={14} />
                  Doğrulanmamış
                </>
              )}
            </span>
          </div>

          {!isEmailVerified && (
            <div className="profile-inline-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => void handleResend()}
                disabled={resending || resendCooldown > 0}
              >
                {resending ? (
                  <Loader2 size={15} className="auth-spinner" />
                ) : (
                  <RefreshCw size={15} />
                )}
                {resendCooldown > 0
                  ? `Yeniden gönder (${resendCooldown} sn)`
                  : 'Doğrulama e-postasını yeniden gönder'}
              </button>

              {resendMessage && (
                <p
                  className={resendError ? 'auth-error-text' : 'auth-status-text'}
                  role={resendError ? 'alert' : 'status'}
                >
                  {resendMessage}
                </p>
              )}
            </div>
          )}

          <form className="profile-form" onSubmit={handleChangeEmail}>
            <div className="auth-field">
              <label htmlFor="profile-new-email">E-posta değiştir</label>
              <div className="auth-input-wrap">
                <Mail size={16} className="auth-input-icon" />
                <input
                  id="profile-new-email"
                  type="email"
                  value={newEmail}
                  onChange={(event) => {
                    setNewEmail(event.target.value);
                    setEmailMessage('');
                  }}
                  placeholder="yeni@ornek.com"
                  disabled={emailBusy}
                  autoComplete="email"
                />
              </div>
              <p className="profile-hint">
                Yeni adres, doğrulanana kadar birincil e-posta olmaz.
              </p>
            </div>

            {emailMessage && (
              <p
                className={emailError ? 'auth-error-text' : 'auth-status-text'}
                role={emailError ? 'alert' : 'status'}
              >
                {emailMessage}
              </p>
            )}

            <button
              type="submit"
              className="primary-button profile-centered-button"
              disabled={emailBusy || !newEmail.trim()}
            >
              {emailBusy ? (
                <Loader2 size={15} className="auth-spinner" />
              ) : (
                <Mail size={15} />
              )}
              Doğrulama gönder
            </button>
          </form>
        </section>

        <section className="profile-card">
          <header className="profile-card-header">
            <Shield size={18} />
            <div>
              <h2>Güvenlik</h2>
              <p>Hesap şifreni güncelle.</p>
            </div>
          </header>

          <form className="profile-form" onSubmit={handleChangePassword}>
            <div className="auth-field">
              <label htmlFor="profile-current-password">Mevcut şifre</label>
              <PasswordInput
                id="profile-current-password"
                value={currentPassword}
                onChange={setCurrentPassword}
                autoComplete="current-password"
                placeholder="Şifreni gir"
                disabled={passwordBusy}
              />
            </div>

            <div className="auth-field">
              <label htmlFor="profile-new-password">Yeni şifre</label>
              <PasswordInput
                id="profile-new-password"
                value={nextPassword}
                onChange={setNextPassword}
                autoComplete="new-password"
                placeholder="Şifreni gir"
                disabled={passwordBusy}
              />
            </div>

            <div className="auth-field">
              <label htmlFor="profile-confirm-password">Yeni şifre (tekrar)</label>
              <PasswordInput
                id="profile-confirm-password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
                placeholder="Şifreni tekrar gir"
                disabled={passwordBusy}
                aria-invalid={
                  passwordAttempted &&
                  confirmPassword.length > 0 &&
                  !passwordsMatch
                }
              />
            </div>

            {passwordMessage && (
              <div
                className={passwordError ? 'auth-error' : 'profile-success'}
                role={passwordError ? 'alert' : 'status'}
              >
                {passwordError && <AlertCircle size={16} />}
                <span>{passwordMessage}</span>
              </div>
            )}

            <button
              type="submit"
              className="primary-button"
              disabled={passwordBusy}
            >
              {passwordBusy ? (
                <Loader2 size={15} className="auth-spinner" />
              ) : (
                <KeyRound size={15} />
              )}
              Şifreyi güncelle
            </button>
          </form>

        </section>

        <section className="profile-card">
          <header className="profile-card-header">
            <LogOut size={18} />
            <div>
              <h2>Oturumu kapat</h2>
              <p>Bu cihazdan veya tüm cihazlardan çıkış yap.</p>
            </div>
          </header>

          <div className="profile-inline-actions profile-centered-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => void handleSignOut(false)}
              disabled={signOutBusy}
            >
              <LogOut size={15} />
              Bu oturumdan çık
            </button>

            <button
              type="button"
              className="primary-button"
              onClick={() => void handleSignOut(true)}
              disabled={signOutBusy}
            >
              <LogOut size={15} />
              Tüm oturumlardan çık
            </button>
          </div>
        </section>

        <section className="profile-card profile-card-danger">
          <header className="profile-card-header">
            <Trash2 size={18} />
            <div>
              <h2>Hesabı sil</h2>
              <p>Hesabını ve ilişkili tüm içerikleri kalıcı olarak sil.</p>
            </div>
          </header>

          <form className="profile-form" onSubmit={handleDelete}>
            <p className="profile-danger-note">
              Hesabı sildiğinde sana ait tüm slaytlar, görseller, bölgeler ve
              sorular kalıcı olarak kaldırılır. Bu işlem geri alınamaz.
            </p>

            <div className="auth-field">
              <label htmlFor="profile-delete-password">
                Onay için şifreni gir
              </label>
              <PasswordInput
                id="profile-delete-password"
                value={deletePassword}
                onChange={setDeletePassword}
                autoComplete="current-password"
                placeholder="Şifreni gir"
                disabled={deleteBusy}
              />
            </div>

            <div className="auth-field">
              <label htmlFor="profile-delete-confirmation">
                Onaylamak için “Onaylıyorum” yaz
              </label>
              <div className="auth-input-wrap">
                <BadgeCheck size={16} className="auth-input-icon" />
                <input
                  id="profile-delete-confirmation"
                  type="text"
                  className="auth-text-input"
                  value={deleteConfirmation}
                  onChange={(event) => {
                    setDeleteConfirmation(event.target.value);
                    setDeleteError('');
                  }}
                  placeholder={'Tam olarak gösterildiği gibi yazmalısın: "Onaylıyorum"'}
                  autoComplete="off"
                  disabled={deleteBusy}
                />
              </div>
            </div>

            {deleteError && (
              <div className="auth-error" role="alert">
                <AlertCircle size={16} />
                <span>{deleteError}</span>
              </div>
            )}

            <button
              type="submit"
              className="danger-button"
              disabled={
                deleteBusy ||
                !deletePassword ||
                deleteConfirmation !== 'Onaylıyorum'
              }
            >
              {deleteBusy ? (
                <Loader2 size={15} className="auth-spinner" />
              ) : (
                <Trash2 size={15} />
              )}
              Hesabı sil
            </button>
          </form>
        </section>
      </div>

      <footer className="home-footer">
        <strong>© 2026 SlaytLab</strong>
        <span>Tüm hakları saklıdır.</span>
      </footer>
    </div>
  );
}
