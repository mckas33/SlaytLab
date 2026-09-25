import { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  FileQuestion,
  Layers3,
  Play,
  Shuffle,
  Sparkles,
  Target,
  X,
} from 'lucide-react';

import type { Slide } from '../types/anatomy';

interface Props {
  slides: Slide[];
  onStartGame: (slideIds: string[], shuffle: boolean) => void;
  onOpenEditor: () => void;
}

export default function HomePage({
  slides,
  onStartGame,
  onOpenEditor,
}: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [shuffle, setShuffle] = useState(false);

  const totalQuestions = useMemo(
    () =>
      slides.reduce(
        (total, slide) => total + slide.questions.length,
        0
      ),
    [slides]
  );

  const totalImages = useMemo(
    () =>
      slides.reduce(
        (total, slide) => total + slide.images.length,
        0
      ),
    [slides]
  );

  const selectedQuestionCount = useMemo(
    () =>
      slides
        .filter((slide) => selected.includes(slide.id))
        .reduce(
          (total, slide) => total + slide.questions.length,
          0
        ),
    [slides, selected]
  );

  const toggle = (id: string) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  const openStartModal = () => {
    setSelected([]);
    setShuffle(false);
    setOpen(true);
  };

  const closeStartModal = () => {
    setOpen(false);
  };

  const startGame = () => {
    if (!selected.length) return;

    setOpen(false);
    onStartGame(selected, shuffle);
  };

  const selectAll = () => {
    setSelected(slides.map((slide) => slide.id));
  };

  const clearSelection = () => {
    setSelected([]);
  };

  return (
    <div className="home-page">
      <div className="home-shell">
        <header className="home-header">
          <div className="home-brand">
            <div className="home-brand-mark">
              <Layers3 size={20} strokeWidth={2.2} />
            </div>

            <div>
              <strong>SlaytLab</strong>
              <span>Eğitim platformu</span>
            </div>
          </div>

          <button
            type="button"
            className="home-editor-link"
            onClick={onOpenEditor}
          >
            İçerik Editörü
            <ArrowRight size={15} />
          </button>
        </header>

        <main className="home-main">
          <section className="home-hero">
            <div className="home-hero-copy">
              <div className="home-badge">
                <Sparkles size={14} />
                <span>SLAYT ÖĞRENME PLATFORMU</span>
              </div>

              <h1>
                Slaytları
                <br />
                öğrenmeye <span>başla.</span>
              </h1>

              <p>
                Görselleri incele, soruları çöz ve anatomik bilgini
                interaktif bir çalışma deneyimiyle geliştir.
              </p>

              <div className="home-actions">
                <button
                  type="button"
                  className="primary-button home-start-button"
                  onClick={openStartModal}
                >
                  <Play size={17} fill="currentColor" />
                  Çalışmaya Başla
                  <ArrowRight size={16} />
                </button>

                <button
                  type="button"
                  className="secondary-button home-editor-button"
                  onClick={onOpenEditor}
                >
                  <BookOpen size={17} />
                  İçerik Editörü
                </button>
              </div>
            </div>

            <div className="home-visual">
              <div className="home-visual-glow" />

              <div className="home-anatomy-card">
                <div className="home-anatomy-card-top">
                  <span>SLAYTLAB</span>
                  <span className="home-live-dot">
                    <i />
                    Hazır
                  </span>
                </div>

                <div className="home-anatomy-illustration">
                  <div className="anatomy-silhouette">
                    <div className="anatomy-head" />
                    <div className="anatomy-neck" />
                    <div className="anatomy-body" />
                    <div className="anatomy-arm left" />
                    <div className="anatomy-arm right" />
                    <div className="anatomy-leg left" />
                    <div className="anatomy-leg right" />
                  </div>

                  <span className="anatomy-marker marker-one">
                    <i />
                  </span>

                  <span className="anatomy-marker marker-two">
                    <i />
                  </span>

                  <span className="anatomy-marker marker-three">
                    <i />
                  </span>
                </div>

                <div className="home-anatomy-card-bottom">
                </div>
              </div>
            </div>
          </section>

          <section className="home-stats">
            <div className="home-stat">
              <div className="home-stat-icon">
                <Layers3 size={18} />
              </div>
              <div>
                <strong>{slides.length}</strong>
                <span>Slayt</span>
              </div>
            </div>

            <div className="home-stat-divider" />

            <div className="home-stat">
              <div className="home-stat-icon">
                <FileQuestion size={18} />
              </div>
              <div>
                <strong>{totalQuestions}</strong>
                <span>Soru</span>
              </div>
            </div>

            <div className="home-stat-divider" />

            <div className="home-stat">
              <div className="home-stat-icon">
                <BookOpen size={18} />
              </div>
              <div>
                <strong>{totalImages}</strong>
                <span>Görsel</span>
              </div>
            </div>
          </section>

          <section className="home-features">
            <article className="home-feature-card">
              <div className="home-feature-icon">
                <Target size={18} />
              </div>
              <div>
                <strong>Görsel öğrenme</strong>
                <p>
                  Anatomik yapıları görseller üzerinden
                  etkileşimli şekilde keşfet.
                </p>
              </div>
              <ChevronRight size={17} />
            </article>

            <article className="home-feature-card">
              <div className="home-feature-icon">
                <FileQuestion size={18} />
              </div>
              <div>
                <strong>Esnek testler</strong>
                <p>
                  İstediğin slaytları seç ve soruları kendi
                  çalışma düzeninde çöz.
                </p>
              </div>
              <ChevronRight size={17} />
            </article>

            <article className="home-feature-card">
              <div className="home-feature-icon">
                <Check size={18} />
              </div>
              <div>
                <strong>Performans takibi</strong>
                <p>
                  Test sonunda sonuçlarını slayt bazında
                  incele.
                </p>
              </div>
              <ChevronRight size={17} />
            </article>
          </section>
        </main>

        <footer className="home-footer">
          <strong>© 2026 SlaytLab</strong>
          <span>Tüm hakları saklıdır.</span>
        </footer>
      </div>

      {open && (
        <div
          className="home-start-backdrop"
          onClick={closeStartModal}
        >
          <div
            className="home-start-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="home-start-modal-header">
              <div>
                <span className="home-modal-kicker">
                  TEST BAŞLANGICI
                </span>

                <h2>Çalışma oturumunu oluştur</h2>

                <p>
                  Çalışmak istediğin slaytları seç ve soru
                  sırasını belirle.
                </p>
              </div>

              <button
                type="button"
                className="home-modal-close"
                onClick={closeStartModal}
                aria-label="Pencereyi kapat"
              >
                <X size={18} />
              </button>
            </header>

            <div className="home-start-modal-body">
              <section className="home-modal-section">
                <div className="home-modal-section-heading">
                  <div>
                    <span>01</span>
                    <div>
                      <strong>Slaytları seç</strong>
                      <small>
                        Çalışmak istediğin içerikleri belirle.
                      </small>
                    </div>
                  </div>

                  {slides.length > 0 && (
                    <button
                      type="button"
                      className="home-select-all-button"
                      onClick={
                        selected.length === slides.length
                          ? clearSelection
                          : selectAll
                      }
                    >
                      {selected.length === slides.length
                        ? 'Seçimi kaldır'
                        : 'Tümünü seç'}
                    </button>
                  )}
                </div>

                <div className="home-slide-list">
                  {slides.length === 0 ? (
                    <div className="home-no-slides">
                      <div className="home-no-slides-icon">
                        <Layers3 size={20} />
                      </div>

                      <div>
                        <strong>Henüz slayt yok</strong>
                        <p>
                          Önce İçerik Editörü'nden bir slayt
                          ve soru oluşturmalısın.
                        </p>
                      </div>
                    </div>
                  ) : (
                    slides.map((slide, index) => {
                      const isSelected = selected.includes(slide.id);

                      return (
                        <label
                          key={slide.id}
                          className={`home-slide-option ${
                            isSelected ? 'selected' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggle(slide.id)}
                          />

                          <span className="home-slide-check">
                            {isSelected && <Check size={14} />}
                          </span>

                          <span className="home-slide-number">
                            {String(index + 1).padStart(2, '0')}
                          </span>

                          <span className="home-slide-info">
                            <strong>{slide.name}</strong>
                            <small>
                              {slide.questions.length} soru
                              <span>•</span>
                              {slide.images.length} görsel
                            </small>
                          </span>

                          <ChevronRight
                            className="home-slide-arrow"
                            size={17}
                          />
                        </label>
                      );
                    })
                  )}
                </div>
              </section>

              <section className="home-modal-section">
                <div className="home-modal-section-heading simple">
                  <div>
                    <span>02</span>
                    <div>
                      <strong>Soru sırası</strong>
                      <small>
                        Soruların hangi sırada gösterileceğini seç.
                      </small>
                    </div>
                  </div>
                </div>

                <div className="home-order-options">
                  <label
                    className={`home-order-option ${
                      !shuffle ? 'selected' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      checked={!shuffle}
                      onChange={() => setShuffle(false)}
                    />

                    <span className="home-radio-mark">
                      {!shuffle && <i />}
                    </span>

                    <span>
                      <strong>Oluşturduğum sıra</strong>
                      <small>
                        Soruları belirlediğin sırayla çöz.
                      </small>
                    </span>
                  </label>

                  <label
                    className={`home-order-option ${
                      shuffle ? 'selected' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      checked={shuffle}
                      onChange={() => setShuffle(true)}
                    />

                    <span className="home-radio-mark">
                      {shuffle && <i />}
                    </span>

                    <span>
                      <strong>Rastgele karıştır</strong>
                      <small>
                        Her oturumda soruları farklı sırada çöz.
                      </small>
                    </span>

                    <Shuffle
                      className="home-order-icon"
                      size={17}
                    />
                  </label>
                </div>
              </section>
            </div>

            <footer className="home-start-modal-footer">
              <div className="home-session-summary">
                <span>Seçilen içerik</span>
                <strong>
                  {selected.length} slayt
                  <i>•</i>
                  {selectedQuestionCount} soru
                </strong>
              </div>

              <div className="home-modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeStartModal}
                >
                  Vazgeç
                </button>

                <button
                  type="button"
                  className="primary-button"
                  disabled={!selected.length || selectedQuestionCount === 0}
                  onClick={startGame}
                >
                  Başla
                  <ArrowRight size={16} />
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}