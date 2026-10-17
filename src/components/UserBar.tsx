import { useState } from 'react';
import {
  AlertTriangle,
  Check,
  Loader2,
  LogOut,
  RefreshCw,
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { useSlides } from '../contexts/SlideContext';
import { useDialog } from './DialogProvider';

export default function UserBar() {
  const { user, signOut } = useAuth();
  const { saveStatus, flushPending } = useSlides();
  const { showConfirm } = useDialog();
  const [busy, setBusy] = useState(false);

  const handleSignOut = async () => {
    if (busy) return;

    setBusy(true);

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

    await signOut();
  };

  return (
    <div className="app-userbar">
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
        <span className="app-save-status saving">
          <Loader2 size={13} className="auth-spinner" />
          Kaydediliyor...
        </span>
      ) : (
        <span className="app-save-status saved">
          <Check size={13} />
          Kaydedildi
        </span>
      )}

      <span className="app-userbar-email" title={user?.email ?? undefined}>
        {user?.email}
      </span>

      <button
        type="button"
        className="app-userbar-logout"
        onClick={() => void handleSignOut()}
        disabled={busy}
      >
        <LogOut size={14} />
        Çıkış Yap
      </button>
    </div>
  );
}