import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  CheckCircle2,
  Info,
  X,
  XCircle,
} from 'lucide-react';

type ToastTone =
  | 'success'
  | 'error'
  | 'info';

interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
  exiting: boolean;
}

interface ToastContextValue {
  showToast: (
    message: string,
    tone?: ToastTone
  ) => void;
}

const ToastContext =
  createContext<ToastContextValue | null>(null);

const icons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error(
      'useToast ToastProvider içinde kullanılmalı.'
    );
  }

  return context;
}

export function ToastProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [toasts, setToasts] =
    useState<Toast[]>([]);

  const timeoutRefs = useRef(
    new Map<number, number>()
  );

  const removeToast = useCallback(
    (id: number) => {
      setToasts((current) =>
        current.filter(
          (toast) => toast.id !== id
        )
      );

      const timeout =
        timeoutRefs.current.get(id);

      if (timeout !== undefined) {
        window.clearTimeout(timeout);
        timeoutRefs.current.delete(id);
      }
    },
    []
  );

  const dismissToast = useCallback(
    (id: number) => {
      setToasts((current) => {
        const toast = current.find(
          (item) => item.id === id
        );

        if (!toast || toast.exiting) {
          return current;
        }

        return current.map((item) =>
          item.id === id
            ? {
                ...item,
                exiting: true,
              }
            : item
        );
      });

      const existingTimeout =
        timeoutRefs.current.get(id);

      if (existingTimeout !== undefined) {
        window.clearTimeout(existingTimeout);
      }

      const timeout = window.setTimeout(() => {
        removeToast(id);
      }, 360);

      timeoutRefs.current.set(id, timeout);
    },
    [removeToast]
  );

  const showToast = useCallback(
    (
      message: string,
      tone: ToastTone = 'info'
    ) => {
      const id =
        Date.now() +
        Math.random();

      setToasts((current) => [
        ...current,
        {
          id,
          tone,
          message,
          exiting: false,
        },
      ]);

      const timeout =
        window.setTimeout(() => {
          dismissToast(id);
        }, 4200);

      timeoutRefs.current.set(
        id,
        timeout
      );
    },
    [dismissToast]
  );

  return (
    <ToastContext.Provider
      value={{ showToast }}
    >
      {children}

      <div
        className="toast-region"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => {
          const Icon =
            icons[toast.tone];

          return (
            <div
              key={toast.id}
              className={[
                'toast',
                `toast-${toast.tone}`,
                toast.exiting
                  ? 'toast-exiting'
                  : '',
              ]
                .filter(Boolean)
                .join(' ')}
              role={
                toast.tone === 'error'
                  ? 'alert'
                  : 'status'
              }
            >
              <Icon
                size={18}
                aria-hidden="true"
              />

              <span>
                {toast.message}
              </span>

              <button
                type="button"
                aria-label="Bildirimi kapat"
                onClick={() =>
                  dismissToast(toast.id)
                }
              >
                <X
                  size={15}
                  aria-hidden="true"
                />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}