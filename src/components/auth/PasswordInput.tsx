import { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

interface Props {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  placeholder?: string;
  disabled?: boolean;
}

export default function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  placeholder,
  disabled,
}: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="auth-input-wrap">
      <Lock size={16} className="auth-input-icon" />

      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        disabled={disabled}
        required
      />

      <button
        type="button"
        className="auth-eye"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Şifreyi gizle' : 'Şifreyi göster'}
        tabIndex={-1}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}