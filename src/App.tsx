import { useState, type ReactNode } from 'react';
import { AlertTriangle, Loader2, LogOut, RefreshCw } from 'lucide-react';

import HomePage from './components/HomePage';
import { GamePage } from './components/GamePage';
import { ResultPage } from './components/ResultPage';
import EditorPage from './components/EditorPage';
import UserBar from './components/UserBar';
import AuthPage from './components/auth/AuthPage';
import { DialogProvider } from './components/DialogProvider';
import { ToastProvider } from './components/ToastProvider';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SlideProvider, useSlides } from './contexts/SlideContext';
import { isSupabaseConfigured } from './lib/supabase';
import type { Page } from './types/anatomy';
import { buildSession, type GameQuestion } from './types/session';

export interface SlidePerformance {
  slideId: string;
  slideName: string;
  correct: number;
  total: number;
}

export interface GameResults {
  correct: number;
  wrong: number;
  bySlide: Record<string, SlidePerformance>;
}

const emptyResults = (): GameResults => ({
  correct: 0,
  wrong: 0,
  bySlide: {},
});

interface ScreenStateProps {
  icon: ReactNode;
  title: string;
  message?: string;
  children?: ReactNode;
}

function ScreenState({ icon, title, message, children }: ScreenStateProps) {
  return (
    <div className="app-screen-state">
      <div className="app-screen-card">
        <div className="app-screen-icon">{icon}</div>
        <h1>{title}</h1>
        {message && <p>{message}</p>}
        {children && <div className="app-screen-actions">{children}</div>}
      </div>
    </div>
  );
}

function AppInner() {
  const { slides, setSlides, loading, loadError, loadSlides } = useSlides();
  const { signOut } = useAuth();

  const [page, setPage] = useState<Page>('home');
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);
  const [sessionQuestions, setSessionQuestions] = useState<GameQuestion[]>([]);
  const [results, setResults] = useState<GameResults>(emptyResults);
  const [gameRunId, setGameRunId] = useState(0);
  const [lastSession, setLastSession] = useState<{
    slideIds: string[];
    shuffle: boolean;
  } | null>(null);

  const handleStartGame = (slideIds: string[], shuffle: boolean) => {
    const selected = slides.filter((slide) => slideIds.includes(slide.id));
    const questions = buildSession(selected, shuffle);

    setSessionQuestions(questions);
    setLastSession({ slideIds, shuffle });
    setResults(emptyResults());
    setGameRunId((current) => current + 1);
    setPage('game');
  };

  const handleRestart = () => {
    if (lastSession) {
      const selected = slides.filter((slide) =>
        lastSession.slideIds.includes(slide.id)
      );

      setSessionQuestions(buildSession(selected, lastSession.shuffle));
    }

    setResults(emptyResults());
    setGameRunId((current) => current + 1);
    setPage('game');
  };

  const handleReturnHome = () => {
    setPage('home');
  };

  if (loading) {
    return (
      <ScreenState
        icon={<Loader2 size={26} className="auth-spinner" />}
        title="Slaytların yükleniyor..."
      />
    );
  }

  if (loadError) {
    return (
      <ScreenState
        icon={<AlertTriangle size={26} />}
        title="Veriler yüklenemedi"
        message={loadError}
      >
        <button
          type="button"
          className="primary-button"
          onClick={() => void loadSlides()}
        >
          <RefreshCw size={16} />
          Tekrar Dene
        </button>

        <button
          type="button"
          className="secondary-button"
          onClick={() => void signOut()}
        >
          <LogOut size={16} />
          Çıkış Yap
        </button>
      </ScreenState>
    );
  }

  if (page === 'home') {
    return (
      <>
        <UserBar />
        <HomePage
          slides={slides}
          onStartGame={handleStartGame}
          onOpenEditor={() => setPage('editor')}
        />
      </>
    );
  }

  if (page === 'editor') {
    return (
      <>
        <UserBar />
        <EditorPage
          slides={slides}
          selectedSlideId={selectedSlideId}
          onSelectSlide={setSelectedSlideId}
          onUpdateSlides={setSlides}
          onReturnHome={handleReturnHome}
        />
      </>
    );
  }

  if (page === 'game' && sessionQuestions.length > 0) {
    return (
      <GamePage
        key={gameRunId}
        sessionQuestions={sessionQuestions}
        results={results}
        setResults={setResults}
        onFinishGame={() => setPage('result')}
        onReturnHome={handleReturnHome}
      />
    );
  }

  return (
    <ResultPage
      results={results}
      total={sessionQuestions.length}
      onRestart={handleRestart}
      onReturnHome={handleReturnHome}
    />
  );
}

function Gate() {
  const { user, loading } = useAuth();

  if (!isSupabaseConfigured) {
    return (
      <ScreenState
        icon={<AlertTriangle size={26} />}
        title="Supabase yapılandırılmamış"
        message="VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY değişkenlerini .env.local (yerelde) veya Vercel Environment Variables (canlıda) içine ekleyip yeniden başlat / yeniden deploy et."
      />
    );
  }

  if (loading) {
    return (
      <ScreenState
        icon={<Loader2 size={26} className="auth-spinner" />}
        title="Yükleniyor..."
      />
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <SlideProvider key={user.id}>
      <AppInner />
    </SlideProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DialogProvider>
        <ToastProvider>
          <Gate />
        </ToastProvider>
      </DialogProvider>
    </AuthProvider>
  );
}