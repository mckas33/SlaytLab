import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Home,
  RotateCcw,
  Target,
  XCircle,
} from 'lucide-react';

import type { GameResults } from '../App';

interface Props {
  results: GameResults;
  total: number;
  onRestart: () => void;
  onReturnHome: () => void;
}

export function ResultPage({
  results,
  total,
  onRestart,
  onReturnHome,
}: Props) {
  const percent = total
    ? Math.round(
        (results.correct / total) * 100
      )
    : 0;

  const slideResults =
    Object.values(results.bySlide);

  return (
    <div className="result-page">
      <div className="result-shell">

        {/* HEADER */}
        <header className="result-topbar">
          <button
            type="button"
            className="result-back-button"
            onClick={onReturnHome}
          >
            <ArrowLeft size={16} />
            Ana Sayfa
          </button>

          <span className="result-completed-badge">
            <Check size={13} />
            Test tamamlandı
          </span>
        </header>

        {/* HERO */}
        <main className="result-card">

          <div className="result-hero">
            <div className="result-hero-copy">
              <span className="result-eyebrow">
                ÇALIŞMA SONUCU
              </span>

              <h1>
                Testi tamamladın.
              </h1>

              <p>
                Bu oturumdaki cevaplarının
                özeti aşağıda.
              </p>
            </div>

            <div className="result-score-ring">
              <div>
                <strong>
                  {percent}
                  <small>%</small>
                </strong>

                <span>
                  Başarı
                </span>
              </div>
            </div>
          </div>

          {/* SUMMARY */}
          <section className="result-summary">
            <div className="result-summary-item correct">
              <div className="result-summary-icon">
                <CheckCircle2 size={18} />
              </div>

              <div>
                <span>
                  DOĞRU
                </span>

                <strong>
                  {results.correct}
                </strong>
              </div>
            </div>

            <div className="result-summary-divider" />

            <div className="result-summary-item wrong">
              <div className="result-summary-icon">
                <XCircle size={18} />
              </div>

              <div>
                <span>
                  YANLIŞ
                </span>

                <strong>
                  {results.wrong}
                </strong>
              </div>
            </div>

            <div className="result-summary-divider" />

            <div className="result-summary-item total">
              <div className="result-summary-icon">
                <Target size={18} />
              </div>

              <div>
                <span>
                  TOPLAM
                </span>

                <strong>
                  {total}
                </strong>
              </div>
            </div>
          </section>

          {/* SLIDE PERFORMANCE */}
          <section className="result-performance">
            <div className="result-section-heading">
              <div>
                <span className="result-section-kicker">
                  DETAY
                </span>

                <h2>
                  Slaytlara göre performans
                </h2>

                <p>
                  Hangi slaytta kaç soruyu
                  doğru cevapladığını görebilirsin.
                </p>
              </div>
            </div>

            {slideResults.length > 0 ? (
              <div className="performance-list">
                {slideResults.map(
                  (slide) => {
                    const slidePercent =
                      slide.total
                        ? Math.round(
                            (slide.correct /
                              slide.total) *
                              100
                          )
                        : 0;

                    return (
                      <article
                        className="performance-row"
                        key={slide.slideId}
                      >
                        <div className="performance-info">
                          <div className="performance-title">
                            <span className="performance-icon">
                              <Target size={14} />
                            </span>

                            <strong>
                              {slide.slideName}
                            </strong>
                          </div>

                          <span className="performance-count">
                            {slide.correct} /{' '}
                            {slide.total}
                          </span>
                        </div>

                        <div className="performance-bar-row">
                          <div className="performance-bar">
                            <div
                              className="performance-bar-fill"
                              style={{
                                width: `${slidePercent}%`,
                              }}
                            />
                          </div>

                          <span>
                            %{slidePercent}
                          </span>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            ) : (
              <div className="result-empty-performance">
                <Target size={18} />

                <span>
                  Bu test için slayt sonucu
                  bulunmuyor.
                </span>
              </div>
            )}
          </section>

          {/* ACTIONS */}
          <footer className="result-actions">
            <button
              type="button"
              className="secondary-button result-home-button"
              onClick={onReturnHome}
            >
              <Home size={16} />
              Ana Sayfaya Dön
            </button>

            <button
              type="button"
              className="primary-button result-restart-button"
              onClick={onRestart}
            >
              <RotateCcw size={16} />
              Yeniden Başla
            </button>
          </footer>

        </main>
      </div>
    </div>
  );
}