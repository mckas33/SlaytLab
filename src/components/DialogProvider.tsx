import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';

type DialogKind = 'alert' | 'confirm';
type DialogTone = 'default' | 'danger';

interface DialogState {
  kind: DialogKind;
  title: string;
  message: string;
  tone: DialogTone;
  confirmLabel: string;
  cancelLabel: string;
}

interface DialogContextValue {
  showAlert: (
    message: string,
    title?: string
  ) => Promise<void>;

  showConfirm: (
    message: string,
    options?: {
      title?: string;
      tone?: DialogTone;
      confirmLabel?: string;
      cancelLabel?: string;
    }
  ) => Promise<boolean>;
}

const DialogContext =
  createContext<DialogContextValue | null>(null);

export function useDialog(): DialogContextValue {
  const context = useContext(DialogContext);

  if (!context) {
    throw new Error(
      'useDialog, DialogProvider içinde kullanılmalı.'
    );
  }

  return context;
}

export function DialogProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [dialog, setDialog] =
    useState<DialogState | null>(null);

  const resolverRef = useRef<
    ((value: boolean) => void) | null
  >(null);

  const close = useCallback(
    (result: boolean) => {
      setDialog(null);

      resolverRef.current?.(result);
      resolverRef.current = null;
    },
    []
  );

  const showAlert = useCallback(
    (
      message: string,
      title = 'Bilgi'
    ): Promise<void> => {
      return new Promise<void>((resolve) => {
        resolverRef.current = () => resolve();

        setDialog({
          kind: 'alert',
          title,
          message,
          tone: 'default',
          confirmLabel: 'Tamam',
          cancelLabel: '',
        });
      });
    },
    []
  );

  const showConfirm = useCallback(
    (
      message: string,
      options?: {
        title?: string;
        tone?: DialogTone;
        confirmLabel?: string;
        cancelLabel?: string;
      }
    ): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        resolverRef.current = resolve;

        setDialog({
          kind: 'confirm',
          title:
            options?.title ?? 'Onay gerekiyor',
          message,
          tone:
            options?.tone ?? 'default',
          confirmLabel:
            options?.confirmLabel ?? 'Onayla',
          cancelLabel:
            options?.cancelLabel ?? 'İptal',
        });
      });
    },
    []
  );

  useEffect(() => {
    if (!dialog) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      if (event.key === 'Escape') {
        close(false);
      }
    };

    window.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        'keydown',
        handleKeyDown
      );
    };
  }, [dialog, close]);

  return (
    <DialogContext.Provider
      value={{
        showAlert,
        showConfirm,
      }}
    >
      {children}

      {dialog && (
        <div
          style={styles.backdrop}
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              close(false);
            }
          }}
        >
          <div
            style={styles.card}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            aria-describedby="dialog-message"
          >
            <div style={styles.header}>
              <div
                style={{
                  ...styles.iconWrap,
                  background:
                    dialog.tone === 'danger'
                      ? 'rgba(220, 38, 38, 0.1)'
                      : 'rgba(13, 125, 120, 0.1)',
                  color:
                    dialog.tone === 'danger'
                      ? '#dc2626'
                      : '#0d7d78',
                }}
                aria-hidden="true"
              >
                {dialog.tone === 'danger' ? (
                  <AlertTriangle size={20} />
                ) : (
                  <Info size={20} />
                )}
              </div>

              <button
                type="button"
                style={styles.closeButton}
                onClick={() => close(false)}
                aria-label="Pencereyi kapat"
                title="Kapat"
              >
                <X size={17} />
              </button>
            </div>

            <h3
              id="dialog-title"
              style={styles.title}
            >
              {dialog.title}
            </h3>

            <p
              id="dialog-message"
              style={styles.message}
            >
              {dialog.message}
            </p>

            <div style={styles.actions}>
              {dialog.kind === 'confirm' && (
                <button
                  type="button"
                  style={styles.cancelBtn}
                  onClick={() => close(false)}
                >
                  {dialog.cancelLabel}
                </button>
              )}

              <button
                type="button"
                style={
                  dialog.tone === 'danger'
                    ? styles.dangerBtn
                    : styles.confirmBtn
                }
                onClick={() => close(true)}
                autoFocus
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

const styles: Record<
  string,
  CSSProperties
> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.58)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    zIndex: 2000,
    backdropFilter: 'blur(3px)',
  },

  card: {
    width: '100%',
    maxWidth: '390px',
    background: '#fff',
    border: '1px solid rgba(226, 232, 240, 0.9)',
    borderRadius: '18px',
    padding: '24px',
    boxSizing: 'border-box',
    boxShadow:
      '0 24px 70px rgba(15, 23, 42, 0.28)',
  },

  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
  },

  iconWrap: {
    width: '42px',
    height: '42px',
    flexShrink: 0,
    borderRadius: '11px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeButton: {
    width: '32px',
    height: '32px',
    border: 'none',
    background: 'transparent',
    color: '#94a3b8',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },

  title: {
    margin: '16px 0 8px',
    fontSize: '18px',
    lineHeight: 1.3,
    fontWeight: 750,
    color: '#0f172a',
  },

  message: {
    margin: 0,
    color: '#475569',
    fontSize: '14.5px',
    lineHeight: 1.6,
    whiteSpace: 'pre-line',
  },

  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '22px',
  },

  cancelBtn: {
    border: '1px solid #cbd5e1',
    background: '#fff',
    color: '#334155',
    borderRadius: '9px',
    padding: '9px 15px',
    cursor: 'pointer',
    fontWeight: 650,
    fontSize: '14px',
  },

  confirmBtn: {
    border: 'none',
    background: '#0f2647',
    color: '#fff',
    borderRadius: '9px',
    padding: '9px 15px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '14px',
  },

  dangerBtn: {
    border: 'none',
    background: '#dc2626',
    color: '#fff',
    borderRadius: '9px',
    padding: '9px 15px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '14px',
  },
};