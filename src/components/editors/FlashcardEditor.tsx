import { useState, type ChangeEvent } from 'react';

import { ImagePlus } from 'lucide-react';

import type {
  AnatomyImage,
  FlashcardQuestion,
} from '../../types/anatomy';

import { EditorShell } from './MultipleTextEditor';

interface Props {
  initial?: FlashcardQuestion;
  images: AnatomyImage[];
  onAddImage: (file: File) => Promise<AnatomyImage>;
  onSave: (question: FlashcardQuestion) => void;
  onCancel: () => void;
}

export default function FlashcardEditor({
  initial,
  images: initialImages,
  onAddImage,
  onSave,
  onCancel,
}: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [answer, setAnswer] = useState(initial?.answer ?? '');
  const [images, setImages] = useState(initialImages);
  const [imageId, setImageId] = useState(initial?.imageId ?? '');
  const [uploadingImage, setUploadingImage] = useState(false);

  const image = images.find((item) => item.id === imageId);

  const canSave =
    title.trim().length > 0 && answer.trim().length > 0;

  const handleImageUpload = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const added = await onAddImage(file);
      setImages((current) => [...current, added]);
      setImageId(added.id);
    } finally {
      setUploadingImage(false);
      event.target.value = '';
    }
  };

  const save = () => {
    if (!canSave) return;

    onSave({
      id: initial?.id ?? `question-${Date.now()}`,
      type: 'flashcard',
      title: title.trim(),
      description: description.trim() || undefined,
      imageId: imageId || undefined,
      showImage: Boolean(imageId),
      answer: answer.trim(),
    });
  };

  return (
    <EditorShell
      title={initial ? 'Soruyu Düzenle' : 'Flashcard'}
      subtitle="Kartın ön yüzüne soruyu, arka yüzüne cevabı yaz."
      onSave={save}
      onCancel={onCancel}
      saveDisabled={!canSave}
    >
      <div className="question-editor-body">
        {/* QUESTION */}
        <section className="question-editor-section">
          <div className="question-editor-section-heading">
            <div>
              <span className="question-editor-kicker">01 · SORU</span>
              <h3>Kartın ön yüzü</h3>
              <p>İlk başta gösterilecek soruyu yaz.</p>
            </div>
          </div>

          <div className="question-form-field">
            <label htmlFor="flashcard-question-title">Soru metni</label>
            <textarea
              id="flashcard-question-title"
              className="question-main-textarea"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Örn. Humerus nedir?"
              autoFocus
            />
          </div>

          <div className="question-form-field">
            <label htmlFor="flashcard-question-description">
              Açıklama
              <span>Opsiyonel</span>
            </label>
            <textarea
              id="flashcard-question-description"
              className="question-description-textarea"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Kart çevrildikten sonra gösterilecek kısa bir açıklama ekle..."
              rows={3}
            />
          </div>
        </section>

        {/* IMAGE */}
        <section className="question-editor-section">
          <div className="question-editor-section-heading">
            <div>
              <span className="question-editor-kicker">02 · GÖRSEL</span>
              <h3>Soru görseli</h3>
              <p>
                Kartın ön yüzünde gösterilmesini istediğin
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
              {uploadingImage ? 'Yükleniyor...' : 'Yeni görsel yükle'}
            </label>
          </div>

          <div className="question-image-select-row">
            <div className="question-form-field">
              <label htmlFor="flashcard-question-image">
                Mevcut görsel
              </label>
              <select
                id="flashcard-question-image"
                value={imageId}
                onChange={(event) => setImageId(event.target.value)}
              >
                <option value="">Görsel kullanılmasın</option>
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
              <img src={image.src} alt={image.name} />
              <div className="question-selected-image-overlay">
                <span>{image.name}</span>
                <small>
                  {image.width} × {image.height} px
                </small>
              </div>
            </div>
          ) : (
            <div className="question-no-image">
              <ImagePlus size={19} />
              <div>
                <strong>Görsel seçilmedi</strong>
                <span>Bu kart yalnızca metinle gösterilecek.</span>
              </div>
            </div>
          )}
        </section>

        {/* ANSWER */}
        <section className="question-editor-section">
          <div className="question-editor-section-heading">
            <div>
              <span className="question-editor-kicker">03 · CEVAP</span>
              <h3>Kartın arka yüzü</h3>
              <p>Kart çevrildiğinde gösterilecek cevabı yaz.</p>
            </div>
          </div>

          <div className="question-form-field">
            <label htmlFor="flashcard-answer">Cevap metni</label>
            <textarea
              id="flashcard-answer"
              className="question-main-textarea"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="Örn. Üst kolda bulunan uzun kemik."
            />
          </div>

          {!answer.trim() && (
            <div className="question-editor-warning">
              Cevap metni boş bırakılamaz.
            </div>
          )}
        </section>
      </div>
    </EditorShell>
  );
}