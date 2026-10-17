import type { ReactNode } from 'react';
import { Layers3 } from 'lucide-react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-brand">
          <span className="auth-brand-mark">
            <Layers3 size={20} strokeWidth={2.2} />
          </span>

          <div>
            <strong>SlaytLab</strong>
            <span>Eğitim platformu</span>
          </div>
        </div>

        <main className="auth-card">{children}</main>

        <p className="auth-footer">© 2026 SlaytLab</p>
      </div>
    </div>
  );
}