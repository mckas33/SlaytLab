import { useEffect, useState } from 'react';

import {
  Check,
  Image as ImageIcon,
  MapPin,
  Target,
  X,
} from 'lucide-react';

import type {
  AnatomyImage,
  RegionQuestion,
} from '../../types/anatomy';

import { EditorShell } from './MultipleTextEditor';

interface Props {
  initial?: RegionQuestion;
  images: AnatomyImage[];
  onSave: (question: RegionQuestion) => void;
  onCancel: () => void;
}

export default function RegionQuestionEditor({
  initial,
  images,
  onSave,
  onCancel,
}: Props) {
  const [title, setTitle] = useState(
    initial?.title ?? ''
  );

  const [description, setDescription] =
    useState(
      initial?.description ?? ''
    );

  const [imageId, setImageId] = useState(
    initial?.imageId ??
      images[0]?.id ??
      ''
  );

  const image = images.find(
    (item) => item.id === imageId
  );

  const [target, setTarget] = useState(
    initial?.targetRegionId ??
      image?.regions[0]?.id ??
      ''
  );

  const [error, setError] = useState('');

  useEffect(() => {
    const nextImage = images.find(
      (item) => item.id === imageId
    );

    if (!nextImage) {
      setTarget('');
      return;
    }

    const targetStillExists =
      nextImage.regions.some(
        (region) => region.id === target
      );

    if (!targetStillExists) {
      setTarget(
        nextImage.regions[0]?.id ?? ''
      );
    }
  }, [imageId, images, target]);

  const selectedRegion = image?.regions.find(
    (region) => region.id === target
  );

  const canSave =
    title.trim().length > 0 &&
    Boolean(imageId) &&
    Boolean(image?.regions.length) &&
    Boolean(target);

  const save = () => {
    if (!title.trim()) {
      setError(
        'Lütfen soru metnini gir.'
      );
      return;
    }

    if (!imageId) {
      setError(
        'Lütfen bir görsel seç.'
      );
      return;
    }

    if (!image?.regions.length) {
      setError(
        'Bu görselde henüz tanımlanmış bir bölge yok.'
      );
      return;
    }

    if (!target) {
      setError(
        'Lütfen doğru bölgeyi seç.'
      );
      return;
    }

    setError('');

    onSave({
      id:
        initial?.id ??
        `question-${Date.now()}`,
      type: 'region',
      title: title.trim(),
      description:
        description.trim() ||
        undefined,
      imageId,
      targetRegionId: target,
    });
  };

  return (
    <EditorShell
      title={
        initial
          ? 'Soruyu Düzenle'
          : 'Bölge Sorusu'
      }
      subtitle="Soru metnini, görselini ve hedef bölgeyi düzenle."
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

            <div className="region-editor-section-icon">
              <MapPin size={18} />
            </div>
          </div>

          <div className="question-form-field">
            <label htmlFor="region-question-title">
              Soru metni
            </label>

            <textarea
              id="region-question-title"
              className="question-main-textarea"
              value={title}
              onChange={(event) => {
                setTitle(
                  event.target.value
                );
                setError('');
              }}
              placeholder="Örn. Brachialis hangisidir?"
              autoFocus
            />
          </div>

          <div className="question-form-field">
            <label htmlFor="region-question-description">
              Açıklama
              <span>Opsiyonel</span>
            </label>

            <textarea
              id="region-question-description"
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

              <h3>Görsel seçimi</h3>

              <p>
                Üzerinde işlem yapılacak olan 
                görseli seç.
              </p>
            </div>
          </div>

          <div className="question-form-field">
            <label htmlFor="region-question-image">
              Görsel
            </label>

            <select
              id="region-question-image"
              value={imageId}
              onChange={(event) => {
                setImageId(
                  event.target.value
                );
                setError('');
              }}
              disabled={!images.length}
            >
              {!images.length && (
                <option value="">
                  Henüz görsel yok
                </option>
              )}

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

          {image ? (
            <div className="region-question-image-card">
              <div className="region-question-image-preview">
                <img
                  src={image.src}
                  alt={image.name}
                />
              </div>

              <div className="region-question-image-meta">
                <div className="region-question-image-title">
                  <ImageIcon size={15} />

                  <strong>
                    {image.name}
                  </strong>
                </div>

                <div className="region-question-image-details">
                  <span>
                    {image.width} ×{' '}
                    {image.height} px
                  </span>

                  <span className="region-question-region-count">
                    <MapPin size={13} />
                    {image.regions.length}{' '}
                    {image.regions.length === 1
                      ? 'bölge'
                      : 'bölge'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="question-no-image">
              <ImageIcon size={19} />

              <div>
                <strong>
                  Görsel seçilmedi
                </strong>

                <span>
                  Bölge sorusu oluşturmak için
                  bir görsel seçmelisin.
                </span>
              </div>
            </div>
          )}
        </section>

        {/* TARGET */}
        <section className="question-editor-section">
          <div className="question-editor-section-heading">
            <div>
              <span className="question-editor-kicker">
                03 · HEDEF BÖLGE
              </span>

              <h3>Doğru bölge</h3>

              <p>
                Doğru cevap olarak
                işaretlenmesi gereken bölgeyi seç.
              </p>
            </div>

            <div className="region-editor-section-icon target">
              <Target size={18} />
            </div>
          </div>

          <div className="question-form-field">
            <label htmlFor="region-question-target">
              Hedef bölge
            </label>

            <select
              id="region-question-target"
              value={target}
              onChange={(event) => {
                setTarget(
                  event.target.value
                );
                setError('');
              }}
              disabled={
                !image?.regions.length
              }
            >
              {!image?.regions.length ? (
                <option value="">
                  Tanımlı bölge yok
                </option>
              ) : (
                image.regions.map(
                  (region) => (
                    <option
                      key={region.id}
                      value={region.id}
                    >
                      {region.name}
                    </option>
                  )
                )
              )}
            </select>
          </div>

          {selectedRegion ? (
            <div className="selected-target-preview">
              <span className="selected-target-icon">
                <Check size={15} />
              </span>

              <div>
                <small>
                  DOĞRU CEVAP
                </small>

                <strong>
                  {selectedRegion.name}
                </strong>
              </div>

              <Target
                size={17}
                className="selected-target-mark"
              />
            </div>
          ) : (
            <div className="region-question-empty-target">
              <Target size={18} />

              <div>
                <strong>
                  Hedef bölge seçilmedi
                </strong>

                <span>
                  Önce seçtiğin görsel üzerinde
                  en az bir bölge oluşturmalısın.
                </span>
              </div>
            </div>
          )}
        </section>

        {/* INFO */}
        <div className="region-question-info">
          <MapPin size={16} />

          <div>
            <strong>
              Nasıl çalışır?
            </strong>

            <p>
              Çalışma sırasında görsel
              üzerindeki bölgelerden birine
              tıklanacak. Seçilen hedef bölge
              doğru cevap olarak kullanılacak.
            </p>
          </div>
        </div>

        {error && (
          <div className="editor-validation-error">
            <X size={16} />
            <span>{error}</span>
          </div>
        )}
      </div>
    </EditorShell>
  );
}