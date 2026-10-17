import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';

import type { Slide } from '../types/anatomy';
import { fetchSlides, syncSlides } from '../lib/slideRepository';
import { useToast } from '../components/ToastProvider';
import { useAuth } from './AuthContext';

export type SaveStatus = 'idle' | 'saving' | 'error';

interface SlideContextValue {
  slides: Slide[];
  loading: boolean;
  loadError: string | null;
  saveStatus: SaveStatus;
  setSlides: Dispatch<SetStateAction<Slide[]>>;
  loadSlides: () => Promise<void>;
  createSlide: (name: string) => Promise<Slide>;
  updateSlide: (id: string, updater: (slide: Slide) => Slide) => Promise<void>;
  deleteSlide: (id: string) => Promise<void>;
  flushPending: () => Promise<boolean>;
}

const SAVE_DELAY_MS = 600;

const SlideContext = createContext<SlideContextValue | null>(null);

export function useSlides(): SlideContextValue {
  const context = useContext(SlideContext);

  if (!context) {
    throw new Error('useSlides, SlideProvider içinde kullanılmalı.');
  }

  return context;
}

const createSlideId = (): string =>
  `slide-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export function SlideProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const userId = user?.id ?? null;

  const [slides, setSlidesState] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const slidesRef = useRef<Slide[]>([]);
  const persistedRef = useRef<Slide[]>([]);
  const timerRef = useRef<number | null>(null);
  const chainRef = useRef<Promise<boolean>>(Promise.resolve(true));

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const flushNow = useCallback((): Promise<boolean> => {
    clearTimer();

    const task = chainRef.current.then(async (): Promise<boolean> => {
      if (!userId) return true;

      const target = slidesRef.current;
      const base = persistedRef.current;

      if (target === base) {
        setSaveStatus('idle');
        return true;
      }

      setSaveStatus('saving');

      try {
        await syncSlides(base, target, userId);
        persistedRef.current = target;
        setSaveStatus(slidesRef.current === target ? 'idle' : 'saving');
        return true;
      } catch (error) {
        console.error('SlaytLab kayıt hatası:', error);
        setSaveStatus('error');
        showToast(
          'Değişiklikler kaydedilemedi. Bağlantını kontrol edip tekrar dene.',
          'error'
        );
        return false;
      }
    });

    chainRef.current = task;
    return task;
  }, [clearTimer, showToast, userId]);

  const scheduleFlush = useCallback(() => {
    clearTimer();

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void flushNow();
    }, SAVE_DELAY_MS);
  }, [clearTimer, flushNow]);

  const setSlides = useCallback<Dispatch<SetStateAction<Slide[]>>>(
    (action) => {
      const previous = slidesRef.current;
      const next = typeof action === 'function' ? action(previous) : action;

      if (next === previous) return;

      slidesRef.current = next;
      setSlidesState(next);
      setSaveStatus('saving');
      scheduleFlush();
    },
    [scheduleFlush]
  );

  const loadSlides = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setLoadError(null);

    try {
      const loaded = await fetchSlides();

      slidesRef.current = loaded;
      persistedRef.current = loaded;
      setSlidesState(loaded);
      setSaveStatus('idle');
    } catch (error) {
      console.error('Slaytlar yüklenemedi:', error);
      setLoadError(
        error instanceof Error ? error.message : 'Slaytlar yüklenemedi.'
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const createSlide = useCallback(
    async (name: string): Promise<Slide> => {
      const slide: Slide = {
        id: createSlideId(),
        name: name.trim() || 'Adsız Slayt',
        images: [],
        questions: [],
      };

      setSlides((current) => [...current, slide]);
      await flushNow();

      return slide;
    },
    [flushNow, setSlides]
  );

  const updateSlide = useCallback(
    async (id: string, updater: (slide: Slide) => Slide): Promise<void> => {
      setSlides((current) =>
        current.map((slide) => (slide.id === id ? updater(slide) : slide))
      );

      await flushNow();
    },
    [flushNow, setSlides]
  );

  const deleteSlide = useCallback(
    async (id: string): Promise<void> => {
      setSlides((current) => current.filter((slide) => slide.id !== id));
      await flushNow();
    },
    [flushNow, setSlides]
  );

  useEffect(() => {
    void loadSlides();
  }, [loadSlides]);

  useEffect(() => clearTimer, [clearTimer]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (slidesRef.current !== persistedRef.current) {
        event.preventDefault();
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        void flushNow();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [flushNow]);

  const value = useMemo<SlideContextValue>(
    () => ({
      slides,
      loading,
      loadError,
      saveStatus,
      setSlides,
      loadSlides,
      createSlide,
      updateSlide,
      deleteSlide,
      flushPending: flushNow,
    }),
    [
      slides,
      loading,
      loadError,
      saveStatus,
      setSlides,
      loadSlides,
      createSlide,
      updateSlide,
      deleteSlide,
      flushNow,
    ]
  );

  return <SlideContext.Provider value={value}>{children}</SlideContext.Provider>;
}