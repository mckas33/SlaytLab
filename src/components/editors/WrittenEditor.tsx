import { useState, type ChangeEvent } from 'react';

import {
  Check,
  ImagePlus,
  Plus,
  Trash2,
} from 'lucide-react';

import type {
  AnatomyImage,
  WrittenQuestion,
} from '../../types/anatomy';

import { EditorShell } from './MultipleTextEditor';

interface Props {
  initial?: WrittenQuestion;
  images: AnatomyImage[];
  onAddImage: (file: File) => Promise<AnatomyImage>;
  onSave: (question: WrittenQuestion) => void;
  onCancel: () => void;
}

export default function WrittenEditor({
  initial,
  images: initialImages,
  onAddImage,
  onSave,
  onCancel,
}: Props) {
  const [title, setTitle] = useState(
    initial?.title ?? ''
  );

  const [description, setDescription] = useState(
    initial?.description ?? ''
  );

  const [images, setImages] =
    useState(initialImages);

  const [imageId, setImageId] = useState(
    initial?.imageId ?? ''
  );

  const [answers, setAnswers] = useState<string[]>(
    initial?.answers?.length
      ? initial.answers
      : ['']
  );

  const [uploadingImage, setUploadingImage] =
    useState(false);

  const image = images.find(
    (item) => item.id === imageId
  );

  const cleanAnswers = answers
    .map((answer) => answer.trim())
    .filter(Boolean);

  const canSave =
    title.trim().length > 0 &&
    cleanAnswers.length > 0;

  const handleImageUpload = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      setUploadingImage(true);

      const added = await onAddImage(file);

      setImages((current) => [
        ...current,
        added,
      ]);

      setImageId(added.id);
    } finally {
      setUploadingImage(false);
      event.target.value = '';
    }
  };

  const updateAnswer = (
    index: number,
    value: string
  ) => {
    setAnswers((current) =>
      current.map((answer, answerIndex) =>
        answerIndex === index
          ? value
          : answer
      )
    );
  };

  const deleteAnswer = (index: number) => {
    if (answers.length <= 1) return;

    setAnswers((current) =>
      current.filter(
        (_, answerIndex) =>
          answerIndex !== index
      )
    );
  };

  const addAnswer = () => {
    setAnswers((current) => [
      ...current,
      '',
    ]);
  };

  const save = () => {
    if (!canSave) return;

    onSave({
      id:
        initial?.id ??
        `question-${Date.now()}`,
      type: 'written',
      title: title.trim(),
      description:
        description.trim() || undefined,
      imageId: imageId || undefined,
      showImage: Boolean(imageId),
      answers: cleanAnswers,
    });
  };

  return (
    <EditorShell
      title={
        initial
          ? 'Soruyu Düzenle'
          : 'Yazılı Soru'
      }
      subtitle="Soru metnini, görselini ve kabul edilecek cevapları düzenle."
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
                Soruyu kısa ve net bir doğru cevabı olacak şekilde yaz.
              </p>
            </div>
          </div>

          <div className="question-form-field">
            <label htmlFor="written-question-title">
              Soru metni
            </label>

            <textarea
              id="written-question-title"
              className="question-main-textarea"
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              placeholder="Örn. Omuz eklemini oluşturan kemiğin adı nedir?"
              autoFocus
            />
          </div>

          <div className="question-form-field">
            <label htmlFor="written-question-description">
              Açıklama
              <span>Opsiyonel</span>
            </label>

            <textarea
              id="written-question-description"
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
              <label htmlFor="written-question-image">
                Mevcut görsel
              </label>

              <select
                id="written-question-image"
                value={imageId}
                onChange={(event) =>
                  setImageId(event.target.value)
                }
              >
                <option value="">
                  Görsel kullanılmasın
                </option>

                {images.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
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
                  ve cevap alanıyla gösterilecek.
                </span>
              </div>
            </div>
          )}
        </section>

        {/* ANSWERS */}
        <section className="question-editor-section">
          <div className="question-editor-section-heading">
            <div>
              <span className="question-editor-kicker">
                03 · CEVAPLAR
              </span>

              <h3>Kabul edilen cevaplar</h3>

              <p>
                Öğrencinin verebileceği doğru
                cevapları ekle.
              </p>
            </div>

            <div className="question-answer-summary">
              <span
                className={
                  cleanAnswers.length
                    ? 'has-answer'
                    : ''
                }
              >
                {cleanAnswers.length
                  ? `${cleanAnswers.length} cevap tanımlı`
                  : 'Henüz cevap yok'}
              </span>
            </div>
          </div>

          <div className="written-answer-list">
            {answers.map(
              (answer, index) => (
                <article
                  key={index}
                  className={`written-answer-card ${
                    answer.trim()
                      ? 'has-value'
                      : ''
                  }`}
                >
                  <span className="choice-letter">
                    {String.fromCharCode(
                      65 + index
                    )}
                  </span>

                  <input
                    className="choice-text-input"
                    value={answer}
                    onChange={(event) =>
                      updateAnswer(
                        index,
                        event.target.value
                      )
                    }
                    placeholder={
                      index === 0
                        ? 'Ana doğru cevabı yaz...'
                        : 'Alternatif doğru cevap...'
                    }
                    aria-label={`${index + 1}. doğru cevap`}
                  />

                  <div className="written-answer-status">
                    {answer.trim() && (
                      <span>
                        <Check size={14} />
                        Kabul edilir
                      </span>
                    )}

                    <button
                      type="button"
                      className="choice-delete-button"
                      disabled={
                        answers.length <= 1
                      }
                      onClick={() =>
                        deleteAnswer(index)
                      }
                      aria-label={`${index + 1}. doğru cevabı sil`}
                      title={
                        answers.length <= 1
                          ? 'En az bir cevap olmalı'
                          : 'Cevabı sil'
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
            onClick={addAnswer}
          >
            <Plus size={15} />
            Alternatif cevap ekle
          </button>

          {!cleanAnswers.length && (
            <div className="question-editor-warning">
              En az bir doğru cevap eklemelisin.
            </div>
          )}

          {answers.some(
            (answer) => !answer.trim()
          ) && (
            <div className="question-editor-warning">
              Boş bırakılan cevaplar kaydedilmeyecek.
            </div>
          )}
        </section>
      </div>
    </EditorShell>
  );
}