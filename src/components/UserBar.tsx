import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  BadgeAlert,
  BadgeCheck,
  ChevronDown,
  Layers3,
  Loader2,
  LogOut,
  RefreshCw,
  UserRound,
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { useSlides } from '../contexts/SlideContext';
import { useDialog } from './DialogProvider';
import { useToast } from './ToastProvider';

interface Props {
  onOpenProfile?: () => void;
  onGoHome: () => void;
  isHome: boolean;
}

export default function UserBar({ onOpenProfile, onGoHome, isHome }: Props) {
  const { user, isEmailVerified, signOut } = useAuth();
  const { saveStatus, flushPending } = useSlides();
  const { showConfirm } = useDialog();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const email = user?.email ?? '';
  const initial = email.trim().charAt(0).toUpperCase() || '?';

  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const handleSignOut = async () => {
    if (busy) return;

    setBusy(true);
    setMenuOpen(false);

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
        setBusy(false);
        return;
      }
    }

    const result = await signOut();
    if (result.error) {
      showToast(result.error, 'error');
      setBusy(false);
    }
  };

  return (
    <div className="app-userbar">
      <button
        type="button"
        className="app-brand"
        onClick={onGoHome}
        disabled={isHome}
        aria-label="Ana sayfaya git"
      >
        <span className="app-brand-mark" aria-hidden="true">
          <Layers3 size={17} strokeWidth={2.2} />
        </span>

        <span className="app-brand-text">
          <strong>SlaytLab</strong>
          <span>Eğitim platformu</span>
        </span>
      </button>

      {saveStatus === 'error' ? (
        <button
          type="button"
          className="app-save-status error"
          onClick={() => void flushPending()}
        >
          <AlertTriangle size={13} />
          Kaydedilemedi
          <RefreshCw size={12} />
        </button>
      ) : saveStatus === 'saving' ? (
        <span className="app-save-status saving" role="status">
          <Loader2 size={13} className="auth-spinner" />
          Kaydediliyor...
        </span>
      ) : null}

      <div className="app-user-menu" ref={menuRef}>
        <button
          type="button"
          className="app-user-menu-trigger"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="app-user-avatar" aria-hidden="true">
            {initial}
          </span>

          <span className="app-user-menu-meta">
            <span className="app-userbar-email" title={email}>
              {email}
            </span>
            <span
              className={`app-user-verify ${isEmailVerified ? 'is-verified' : 'is-pending'}`}
            >
              {isEmailVerified ? (
                <>
                  <BadgeCheck size={12} />
                  Doğrulandı
                </>
              ) : (
                <>
                  <BadgeAlert size={12} />
                  Doğrulanmadı
                </>
              )}
            </span>
          </span>

          <ChevronDown size={14} className="app-user-menu-chevron" />
        </button>

        {menuOpen && (
          <div className="app-user-menu-panel" role="menu">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                onOpenProfile?.();
              }}
            >
              <UserRound size={15} />
              Profil ve ayarlar
            </button>

            <button
              type="button"
              role="menuitem"
              className="is-danger"
              onClick={() => void handleSignOut()}
              disabled={busy}
            >
              <LogOut size={15} />
              Çıkış Yap
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
