import { useEffect, useState } from 'react';

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';

import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';

import {
  ArrowLeft,
  ChevronRight,
  FileQuestion,
  Image as ImageIcon,
  Layers3,
  Pencil,
  Plus,
  Shapes,
} from 'lucide-react';

import type { Dispatch, SetStateAction } from 'react';

import type {
  AnatomyImage,
  Question,
  QuestionType,
  Slide,
} from '../types/anatomy';

import { useDialog } from './DialogProvider';
import { useToast } from './ToastProvider';

import SlideList from './SlideList';
import QuestionCard from './QuestionCard';
import QuestionTypeModal from './QuestionTypeModal';
import RegionEditor from './RegionEditor';

import MultipleTextEditor from './editors/MultipleTextEditor';
import WrittenEditor from './editors/WrittenEditor';
import RegionQuestionEditor from './editors/RegionQuestionEditor';
import FlashcardEditor from './editors/FlashcardEditor';

interface Props {
  slides: Slide[];
  selectedSlideId: string | null;
  onSelectSlide: (id: string | null) => void;
  onUpdateSlides: Dispatch<SetStateAction<Slide[]>>;
  onReturnHome: () => void;
}

const createId = () =>
  `slide-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export default function EditorPage({
  slides,
  selectedSlideId,
  onSelectSlide,
  onUpdateSlides,
  onReturnHome,
}: Props) {
  const [tab, setTab] = useState<'regions' | 'questions'>('questions');
  const [showTypes, setShowTypes] = useState(false);
  const [editorType, setEditorType] = useState<QuestionType | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<
    Question | undefined
  >();
  const [slideModal, setSlideModal] = useState<'create' | 'edit' | null>(
    null
  );
  const [slideName, setSlideName] = useState('');

  const { showConfirm } = useDialog();
  const { showToast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    })
  );

  const selected =
    slides.find((slide) => slide.id === selectedSlideId) ?? null;

  const regionCount =
    selected?.images.reduce(
      (total, image) => total + image.regions.length,
      0
    ) ?? 0;

  useEffect(() => {
    if (!selected && slides[0]) {
      onSelectSlide(slides[0].id);
    }
  }, [selected, slides, onSelectSlide]);

  const updateSelected = (updater: (slide: Slide) => Slide) => {
    if (!selected) return;

    onUpdateSlides((current) =>
      current.map((slide) =>
        slide.id === selected.id ? updater(slide) : slide
      )
    );
  };

  const addImageToSlide = (
    file: File
  ): Promise<AnatomyImage> =>
    new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result !== 'string') return;

        const loaded = new Image();

        loaded.onload = () => {
          const image: AnatomyImage = {
            id: `image-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 7)}`,
            src: reader.result as string,
            name:
              file.name.replace(/\.[^.]+$/, '') ||
              'Yeni görsel',
            width: loaded.naturalWidth,
            height: loaded.naturalHeight,
            regions: [],
          };

          updateSelected((slide) => ({
            ...slide,
            images: [...slide.images, image],
          }));

          resolve(image);
        };

        loaded.src = reader.result;
      };

      reader.readAsDataURL(file);
    });

  const openCreateSlide = () => {
    setSlideName('');
    setSlideModal('create');
  };

  const openEditSlide = () => {
    if (!selected) return;

    setSlideName(selected.name);
    setSlideModal('edit');
  };

  const saveSlide = () => {
    const name = slideName.trim();

    if (!name) {
      showToast('Slayt adı boş bırakılamaz.', 'error');
      return;
    }

    const isDuplicate = slides.some((slide) => {
      if (slideModal === 'edit' && slide.id === selected?.id) {
        return false;
      }

      return (
        slide.name.trim().toLocaleLowerCase('tr') ===
        name.toLocaleLowerCase('tr')
      );
    });

    if (isDuplicate) {
      showToast(
        'Bu isimde bir slayt zaten var. Farklı bir isim seç.',
        'error'
      );
      return;
    }

    if (slideModal === 'create') {
      const slide: Slide = {
        id: createId(),
        name,
        images: [],
        questions: [],
      };

      onUpdateSlides((current) => [...current, slide]);
      onSelectSlide(slide.id);

      showToast('Slayt oluşturuldu.', 'success');
    } else if (selected) {
      updateSelected((slide) => ({
        ...slide,
        name,
      }));

      showToast('Slayt adı güncellendi.', 'success');
    }

    setSlideModal(null);
  };

  const deleteSlide = async () => {
    if (!selected) return;

    const confirmed = await showConfirm(
      `"${selected.name}" slaytı ve içeriği silinsin mi?`,
      {
        title: 'Slaytı sil',
        tone: 'danger',
        confirmLabel: 'Sil',
      }
    );

    if (!confirmed) return;

    const remaining = slides.filter(
      (slide) => slide.id !== selected.id
    );

    onUpdateSlides(remaining);
    onSelectSlide(remaining[0]?.id ?? null);

    showToast('Slayt silindi.', 'success');
  };

  const saveQuestion = (question: Question) => {
    updateSelected((slide) => ({
      ...slide,
      questions: editingQuestion
        ? slide.questions.map((item) =>
            item.id === question.id ? question : item
          )
        : [...slide.questions, question],
    }));

    setEditorType(null);
    setEditingQuestion(undefined);

    showToast(
      editingQuestion ? 'Soru güncellendi.' : 'Soru eklendi.',
      'success'
    );
  };

  const openQuestionEditor = (
    type: QuestionType,
    question?: Question
  ) => {
    if (
      type === 'region' &&
      !selected?.images.some((image) => image.regions.length)
    ) {
      showToast(
        'Önce Bölgeler sekmesinden en az bir bölge oluştur.',
        'error'
      );

      setTab('regions');
      return;
    }

    setEditingQuestion(question);
    setEditorType(type);
    setShowTypes(false);
  };

  const handleDragEnd = ({
    active,
    over,
  }: DragEndEvent) => {
    if (!over || active.id === over.id || !selected) {
      return;
    }

    const oldIndex = selected.questions.findIndex(
      (question) => question.id === active.id
    );

    const newIndex = selected.questions.findIndex(
      (question) => question.id === over.id
    );

    if (oldIndex !== newIndex) {
      updateSelected((slide) => ({
        ...slide,
        questions: arrayMove(
          slide.questions,
          oldIndex,
          newIndex
        ),
      }));
    }
  };

  const handleDeleteQuestion = async (question: Question) => {
    const confirmed = await showConfirm(
      `"${question.title}" sorusu silinsin mi?`,
      {
        title: 'Soruyu sil',
        tone: 'danger',
        confirmLabel: 'Sil',
      }
    );

    if (!confirmed) return;

    updateSelected((slide) => ({
      ...slide,
      questions: slide.questions.filter(
        (item) => item.id !== question.id
      ),
    }));

    showToast('Soru silindi.', 'success');
  };

  return (
    <div className="editor-page">
      {/* TOP BAR */}
      <header className="editor-topbar">
        <button
          type="button"
          className="back-home-button"
          onClick={onReturnHome}
        >
          <ArrowLeft size={17} />
          <span>Ana Sayfa</span>
        </button>

        <div className="editor-brand">
          <span className="editor-brand-mark">
            <Layers3 size={17} />
          </span>

          <div>
            <strong>SlaytLab</strong>
            <span>İçerik Editörü</span>
          </div>
        </div>

        <div className="editor-topbar-status">
          <span className="editor-status-dot" />
          <span>Yerel kayıt</span>
        </div>
      </header>

      <div className="editor-layout">
        {/* LEFT SIDEBAR */}
        <SlideList
          slides={slides}
          selectedId={selectedSlideId}
          onSelect={onSelectSlide}
          onAdd={openCreateSlide}
          onDelete={deleteSlide}
        />

        {/* MAIN */}
        <main className="editor-main">
          {selected ? (
            <>
              {/* HEADER */}
              <section className="editor-main-heading">
                <div className="editor-heading-left">
                  <div className="editor-breadcrumb">
                    <span>İÇERİK</span>
                    <ChevronRight size={13} />
                    <span>SLAYTLAR</span>
                    <ChevronRight size={13} />
                    <strong>{selected.name}</strong>
                  </div>

                  <div className="slide-heading-line">
                    <div className="slide-heading-icon">
                      <Layers3 size={21} />
                    </div>

                    <div>
                      <div className="slide-title-row">
                        <h1>{selected.name}</h1>

                        <button
                          type="button"
                          className="small-outline-button"
                          onClick={openEditSlide}
                        >
                          <Pencil size={13} />
                          Düzenle
                        </button>
                      </div>

                      <p className="editor-heading-description">
                        Bu slaytın görsellerini, bölgelerini ve
                        sorularını yönet.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="slide-stat-group">
                  <div className="slide-stat">
                    <span className="slide-stat-icon">
                      <FileQuestion size={15} />
                    </span>

                    <span>
                      <strong>{selected.questions.length}</strong>
                      <small>Soru</small>
                    </span>
                  </div>

                  <div className="slide-stat">
                    <span className="slide-stat-icon">
                      <ImageIcon size={15} />
                    </span>

                    <span>
                      <strong>{selected.images.length}</strong>
                      <small>Görsel</small>
                    </span>
                  </div>

                  <div className="slide-stat">
                    <span className="slide-stat-icon">
                      <Shapes size={15} />
                    </span>

                    <span>
                      <strong>{regionCount}</strong>
                      <small>Bölge</small>
                    </span>
                  </div>
                </div>
              </section>

              {/* TABS */}
              <nav className="editor-tabs" aria-label="Slayt bölümleri">
                <button
                  type="button"
                  className={
                    tab === 'regions' ? 'active' : ''
                  }
                  onClick={() => setTab('regions')}
                >
                  <Shapes size={16} />
                  <span>Bölgeler</span>

                  <small>{regionCount}</small>
                </button>

                <button
                  type="button"
                  className={
                    tab === 'questions' ? 'active' : ''
                  }
                  onClick={() => setTab('questions')}
                >
                  <FileQuestion size={16} />
                  <span>Sorular</span>

                  <small>{selected.questions.length}</small>
                </button>
              </nav>

              {/* CONTENT */}
              {tab === 'regions' ? (
                <section className="editor-content-panel">
                  <div className="editor-section-heading">
                    <div>
                      <span className="editor-section-kicker">
                        GÖRSEL ANOTASYONU
                      </span>

                      <h2>Anatomik bölgeler</h2>

                      <p>
                        Görseller üzerinde tıklanabilir bölgeler
                        oluştur ve isimlendir.
                      </p>
                    </div>
                  </div>

                  <RegionEditor
                    slide={selected}
                    onUpdate={updateSelected}
                  />
                </section>
              ) : (
                <section className="editor-content-panel">
                  <div className="editor-section-heading question-section-heading">
                    <div>
                      <span className="editor-section-kicker">
                        DEĞERLENDİRME
                      </span>

                      <h2>Sorular</h2>

                      <p>
                        Soruları sırala, düzenle veya yeni bir
                        soru oluştur.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="add-question-button"
                      onClick={() => setShowTypes(true)}
                    >
                      <Plus size={17} />
                      Soru Ekle
                    </button>
                  </div>

                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={selected.questions.map(
                        (question) => question.id
                      )}
                      strategy={verticalListSortingStrategy}
                    >
                      <section className="question-list">
                        {selected.questions.length === 0 ? (
                          <div className="editor-empty question-empty">
                            <div className="editor-empty-icon">
                              <FileQuestion size={25} />
                            </div>

                            <span className="editor-empty-kicker">
                              HENÜZ SORU YOK
                            </span>

                            <h2>İlk sorunu oluştur</h2>

                            <p>
                              Bu slayta soru ekleyerek
                              sınavını oluşturmaya başlayabilirsin.
                            </p>

                            <button
                              type="button"
                              className="primary-button"
                              onClick={() =>
                                setShowTypes(true)
                              }
                            >
                              <Plus size={16} />
                              İlk Soruyu Ekle
                            </button>
                          </div>
                        ) : (
                          selected.questions.map(
                            (question, index) => (
                              <QuestionCard
                                key={question.id}
                                question={question}
                                index={index}
                                onEdit={() =>
                                  openQuestionEditor(
                                    question.type,
                                    question
                                  )
                                }
                                onDelete={() =>
                                  handleDeleteQuestion(
                                    question
                                  )
                                }
                              />
                            )
                          )
                        )}
                      </section>
                    </SortableContext>
                  </DndContext>
                </section>
              )}
            </>
          ) : (
            <div className="editor-no-slide">
              <div className="editor-no-slide-icon">
                <Layers3 size={30} />
              </div>

              <span className="editor-empty-kicker">
                İÇERİK EDİTÖRÜ
              </span>

              <h1>Bir slayt seç</h1>

              <p>
                Mevcut bir slaytı seç veya yeni bir slayt
                oluşturarak çalışmaya başla.
              </p>

              <button
                type="button"
                className="primary-button"
                onClick={openCreateSlide}
              >
                <Plus size={17} />
                Yeni Slayt
              </button>
            </div>
          )}
        </main>
      </div>

      {/* QUESTION TYPE MODAL */}
      {showTypes && (
        <QuestionTypeModal
          onSelect={(type) => openQuestionEditor(type)}
          onClose={() => setShowTypes(false)}
        />
      )}

      {/* SLIDE CREATE / EDIT MODAL */}
      {slideModal && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSlideModal(null);
            }
          }}
        >
          <div
            className="modal-card compact-modal slide-name-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="slide-modal-title"
          >
            <header className="modal-heading">
              <div>
                <span className="editor-eyebrow">
                  SLAYT
                </span>

                <h2 id="slide-modal-title">
                  {slideModal === 'create'
                    ? 'Yeni Slayt'
                    : 'Slaytı Düzenle'}
                </h2>
              </div>

              <button
                type="button"
                className="icon-button"
                onClick={() => setSlideModal(null)}
                aria-label="Kapat"
              >
                ×
              </button>
            </header>

            <div className="slide-name-form">
              <label htmlFor="slide-name">
                Slayt adı
              </label>

              <input
                id="slide-name"
                autoFocus
                value={slideName}
                onChange={(event) =>
                  setSlideName(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    saveSlide();
                  }
                }}
                placeholder="Örn. Üst Ekstremite"
              />

              <span>
                Bu isim içerik editöründe ve çalışma sırasında
                kullanılabilir.
              </span>
            </div>

            <footer className="modal-footer">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setSlideModal(null)}
              >
                İptal
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={saveSlide}
              >
                {slideModal === 'create'
                  ? 'Slaytı Oluştur'
                  : 'Değişiklikleri Kaydet'}
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* QUESTION EDITORS */}
      {editorType === 'multiple_choice' && (
        <MultipleTextEditor
          initial={
            editingQuestion?.type === 'multiple_choice'
              ? editingQuestion
              : undefined
          }
          images={selected?.images ?? []}
          onAddImage={addImageToSlide}
          onSave={saveQuestion}
          onCancel={() => {
            setEditorType(null);
            setEditingQuestion(undefined);
          }}
        />
      )}

      {editorType === 'written' && (
        <WrittenEditor
          initial={
            editingQuestion?.type === 'written'
              ? editingQuestion
              : undefined
          }
          images={selected?.images ?? []}
          onAddImage={addImageToSlide}
          onSave={saveQuestion}
          onCancel={() => {
            setEditorType(null);
            setEditingQuestion(undefined);
          }}
        />
      )}

      {editorType === 'region' && (
        <RegionQuestionEditor
          initial={
            editingQuestion?.type === 'region'
              ? editingQuestion
              : undefined
          }
          images={selected?.images ?? []}
          onSave={saveQuestion}
          onCancel={() => {
            setEditorType(null);
            setEditingQuestion(undefined);
          }}
        />
      )}

      {editorType === 'flashcard' && (
        <FlashcardEditor
          initial={
            editingQuestion?.type === 'flashcard'
              ? editingQuestion
              : undefined
          }
          images={selected?.images ?? []}
          onAddImage={addImageToSlide}
          onSave={saveQuestion}
          onCancel={() => {
            setEditorType(null);
            setEditingQuestion(undefined);
          }}
        />
      )}
    </div>
  );
}