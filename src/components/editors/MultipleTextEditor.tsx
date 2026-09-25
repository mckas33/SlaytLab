import { useState, type ChangeEvent, type ReactNode } from 'react';

import {
  Check,
  ImagePlus,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

import type {
  AnatomyImage,
  Choice,
  MultipleChoiceQuestion,
} from '../../types/anatomy';

interface Props {
  initial?: MultipleChoiceQuestion;
  images: AnatomyImage[];
  onAddImage: (file: File) => Promise<AnatomyImage>;
  onSave: (question: MultipleChoiceQuestion) => void;
  onCancel: () => void;
}

const createId = () =>
  `choice-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;

const defaultChoices = (): Choice[] =>
  [0, 1, 2, 3].map((index) => ({
    id: createId(),
    text: '',
    correct: index === 0,
  }));

export default function MultipleTextEditor({
  initial,
  images: initialImages,
  onAddImage,
  onSave,
  onCancel,
}: Props) {
  const [title, setTitle] = useState(
    initial?.title ?? ''
  );

  const [description, setDescription] =
    useState(initial?.description ?? '');

  const [images, setImages] =
    useState(initialImages);

  const [imageId, setImageId] = useState(
    initial?.imageId ?? ''
  );

  const [showImage, setShowImage] =
    useState(
      initial?.showImage ??
        Boolean(initial?.imageId)
    );

  const [choices, setChoices] = useState<
    Choice[]
  >(
    initial?.choices ??
      defaultChoices()
  );

  const [uploadingImage, setUploadingImage] =
    useState(false);

  const image = images.find(
    (item) => item.id === imageId
  );

  const correctChoice =
    choices.find(
      (choice) => choice.correct
    );

  const canSave =
    title.trim().length > 0 &&
    choices.length >= 2 &&
    choices.every(
      (choice) => choice.text.trim().length > 0
    ) &&
    choices.filter(
      (choice) => choice.correct
    ).length === 1;

  const handleImageUpload = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) return;

    try {
      setUploadingImage(true);

      const added =
        await onAddImage(file);

      setImages((current) => [
        ...current,
        added,
      ]);

      setImageId(added.id);
      setShowImage(true);
    } finally {
      setUploadingImage(false);
      event.target.value = '';
    }
  };

  const updateChoice = (
    id: string,
    updater: (
      choice: Choice
    ) => Choice
  ) => {
    setChoices((current) =>
      current.map((choice) =>
        choice.id === id
          ? updater(choice)
          : choice
      )
    );
  };

  const setCorrectChoice = (
    id: string
  ) => {
    setChoices((current) =>
      current.map((choice) => ({
        ...choice,
        correct: choice.id === id,
      }))
    );
  };

  const deleteChoice = (id: string) => {
    if (choices.length <= 2) return;

    setChoices((current) =>
      current.filter(
        (choice) => choice.id !== id
      )
    );
  };

  const addChoice = () => {
    setChoices((current) => [
      ...current,
      {
        id: createId(),
        text: '',
        correct: false,
      },
    ]);
  };

  const save = () => {
    if (!canSave) return;

    onSave({
      id:
        initial?.id ??
        `question-${Date.now()}`,
      type: 'multiple_choice',
      title: title.trim(),
      description:
        description.trim() || undefined,
      imageId:
        showImage && imageId
          ? imageId
          : undefined,
      showImage:
        showImage &&
        Boolean(imageId),
      choices: choices.map(
        (choice) => ({
          ...choice,
          text: choice.text.trim(),
        })
      ),
    });
  };

  return (
    <EditorShell
      title={
        initial
          ? 'Soruyu Düzenle'
          : 'Çoktan Seçmeli Soru'
      }
      subtitle="Soru metnini, görselini ve cevap seçeneklerini düzenle."
      onSave={save}
      onCancel={onCancel}
      saveDisabled={!canSave}
    >
      <div className="question-editor-body">
        {/* QUESTION */}
        <section className="question-editor-section">
          <div className="question-editor-section-heading">
            <div>
              <span className="question-editor-kicker">
                01 · SORU
              </span>

              <h3>Soru içeriği</h3>

              <p>
                Soruyu net ve tek bir doğru cevabı olacak şekilde yaz.
              </p>
            </div>
          </div>

          <div className="question-form-field">
            <label htmlFor="multiple-question-title">
              Soru metni
            </label>

            <textarea
              id="multiple-question-title"
              className="question-main-textarea"
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              placeholder="Örn. Aşağıdakilerden hangisi humerustur?"
              autoFocus
            />
          </div>

          <div className="question-form-field">
            <label htmlFor="multiple-question-description">
              Açıklama
              <span>Opsiyonel</span>
            </label>

            <textarea
              id="multiple-question-description"
              className="question-description-textarea"
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              placeholder="Soru cevaplandıktan sonra gösterilecek kısa bir açıklama ekle..."
              rows={3}
            />
          </div>
        </section>

        {/* IMAGE */}
        <section className="question-editor-section">
          <div className="question-editor-section-heading">
            <div>
              <span className="question-editor-kicker">
                02 · GÖRSEL
              </span>

              <h3>Soru görseli</h3>

              <p>
                Soru metninin altında gösterilmesini istediğin
                görseli seç.
              </p>
            </div>

            <label className="question-upload-button">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImage}
              />

              <ImagePlus size={15} />

              {uploadingImage
                ? 'Yükleniyor...'
                : 'Yeni görsel yükle'}
            </label>
          </div>

          <div className="question-image-select-row">
            <div className="question-form-field">
              <label htmlFor="multiple-question-image">
                Mevcut görsel
              </label>

              <select
                id="multiple-question-image"
                value={imageId}
                onChange={(event) => setImageId(event.target.value)}
              >
                <option value="">
                  Görsel kullanılmasın
                </option>

                {images.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {image ? (
            <div className="question-selected-image">
              <img
                src={image.src}
                alt={image.name}
              />

              <div className="question-selected-image-overlay">
                <span>
                  {image.name}
                </span>

                <small>
                  {image.width} ×{' '}
                  {image.height} px
                </small>
              </div>
            </div>
          ) : (
            <div className="question-no-image">
              <ImagePlus size={19} />

              <div>
                <strong>
                  Görsel seçilmedi
                </strong>

                <span>
                  Bu soru yalnızca metin
                  ve şıklarla gösterilecek.
                </span>
              </div>
            </div>
          )}
        </section>

        {/* CHOICES */}
        <section className="question-editor-section">
          <div className="question-editor-section-heading">
            <div>
              <span className="question-editor-kicker">
                03 · CEVAPLAR
              </span>

              <h3>Şıklar</h3>

              <p>
                Tek bir seçeneği doğru cevap
                olarak işaretle.
              </p>
            </div>

            <div className="question-answer-summary">
              <span
                className={
                  correctChoice
                    ? 'has-answer'
                    : ''
                }
              >
                {correctChoice
                  ? 'Doğru cevap seçildi'
                  : 'Doğru cevap seçilmedi'}
              </span>
            </div>
          </div>

          <div className="choice-editor-list">
            {choices.map(
              (choice, index) => (
                <article
                  key={choice.id}
                  className={`choice-editor-card ${
                    choice.correct
                      ? 'is-correct'
                      : ''
                  }`}
                >
                  <button
                    type="button"
                    className={`choice-correct-button ${
                      choice.correct
                        ? 'active'
                        : ''
                    }`}
                    onClick={() =>
                      setCorrectChoice(
                        choice.id
                      )
                    }
                    aria-label={`${index + 1}. şıkkı doğru cevap olarak seç`}
                    title={
                      choice.correct
                        ? 'Doğru cevap'
                        : 'Doğru cevap olarak işaretle'
                    }
                  >
                    {choice.correct ? (
                      <Check size={15} />
                    ) : null}
                  </button>

                  <span className="choice-letter">
                    {String.fromCharCode(
                      65 + index
                    )}
                  </span>

                  <input
                    className="choice-text-input"
                    value={choice.text}
                    onChange={(event) =>
                      updateChoice(
                        choice.id,
                        (current) => ({
                          ...current,
                          text: event.target
                            .value,
                        })
                      )
                    }
                    placeholder={`${
                      String.fromCharCode(
                        65 + index
                      )
                    } şıkkını yaz...`}
                    aria-label={`${index + 1}. şık`}
                  />

                  <div className="choice-card-status">
                    {choice.correct && (
                      <span>
                        Doğru
                      </span>
                    )}

                    <button
                      type="button"
                      className="choice-delete-button"
                      disabled={
                        choices.length <= 2
                      }
                      onClick={() =>
                        deleteChoice(
                          choice.id
                        )
                      }
                      aria-label={`${index + 1}. şıkkı sil`}
                      title={
                        choices.length <= 2
                          ? 'En az iki şık olmalı'
                          : 'Şıkkı sil'
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              )
            )}
          </div>

          <button
            type="button"
            className="add-choice-button"
            onClick={addChoice}
          >
            <Plus size={15} />
            Şık ekle
          </button>

          {choices.length < 2 && (
            <div className="question-editor-error">
              En az iki şık eklemelisin.
            </div>
          )}

          {choices.some(
            (choice) =>
              !choice.text.trim()
          ) && (
            <div className="question-editor-warning">
              Boş bırakılan şıklar kaydedilmeyecek.
            </div>
          )}
        </section>
      </div>
    </EditorShell>
  );
}

interface EditorShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onSave: () => void;
  onCancel: () => void;
  saveDisabled?: boolean;
}

export function EditorShell({
  title,
  subtitle,
  children,
  onSave,
  onCancel,
  saveDisabled = false,
}: EditorShellProps) {
  return (
    <div
      className="modal-backdrop question-editor-backdrop"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onCancel();
        }
      }}
    >
      <div
        className="modal-card question-editor-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="question-editor-title"
      >
        <header className="question-editor-header">
          <div className="question-editor-title-group">
            <span className="editor-eyebrow">
              SORU EDİTÖRÜ
            </span>

            <h2 id="question-editor-title">
              {title}
            </h2>

            {subtitle && (
              <p>{subtitle}</p>
            )}
          </div>

          <button
            type="button"
            className="question-editor-close"
            onClick={onCancel}
            aria-label="Kapat"
          >
            <X size={18} />
          </button>
        </header>

        <div className="editor-form">
          {children}
        </div>

        <footer className="modal-footer question-editor-footer">
          <div className="question-editor-footer-hint">
            {saveDisabled
              ? 'Devam etmek için eksik alanları tamamla.'
              : 'Hazır olduğunda soruyu kaydedebilirsin.'}
          </div>

          <div className="question-editor-footer-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onCancel}
            >
              İptal
            </button>

            <button
              type="button"
              className="primary-button"
              onClick={onSave}
              disabled={saveDisabled}
            >
              <Check size={15} />
              Kaydet
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}