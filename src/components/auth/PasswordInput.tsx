import { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

interface Props {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  placeholder?: string;
  disabled?: boolean;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

export default function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  placeholder,
  disabled,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
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
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
      />

      <button
        type="button"
        className="auth-eye"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Şifreyi gizle' : 'Şifreyi göster'}
        aria-pressed={visible}
        disabled={disabled}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}