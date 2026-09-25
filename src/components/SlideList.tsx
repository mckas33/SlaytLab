import { useState } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Layers3,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import type { Slide } from '../types/anatomy';

interface Props {
  slides: Slide[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: () => void;
}

export default function SlideList({
  slides,
  selectedId,
  onSelect,
  onAdd,
  onDelete,
}: Props) {
  const [query, setQuery] = useState('');

  const normalizedQuery = query.trim().toLocaleLowerCase('tr');

  const filteredSlides = normalizedQuery
    ? slides.filter((slide) =>
        slide.name.toLocaleLowerCase('tr').includes(normalizedQuery)
      )
    : slides;

  return (
    <aside className="slide-sidebar">
      <div className="slide-sidebar-header">
        <div>
          <span className="editor-eyebrow">İÇERİK</span>
          <h2>Slaytlar</h2>
        </div>

        <span className="slide-count">{slides.length}</span>
      </div>

      {slides.length > 0 && (
        <div className="slide-search">
          <Search size={14} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Slayt ara..."
            aria-label="Slayt ara"
          />
        </div>
      )}

      <div className="slide-list">
        {slides.length === 0 ? (
          <div className="slide-empty">
            <div className="slide-empty-icon">
              <Layers3 size={22} />
            </div>

            <strong>Henüz slayt yok</strong>

            <p>İlk slaytını oluşturarak başlayabilirsin.</p>

            <button
              type="button"
              className="slide-empty-button"
              onClick={onAdd}
            >
              <Plus size={16} />
              Slayt oluştur
            </button>
          </div>
        ) : filteredSlides.length === 0 ? (
          <div className="slide-search-empty">
            <Search size={18} />
            <span>"{query}" ile eşleşen slayt bulunamadı.</span>
          </div>
        ) : (
          filteredSlides.map((slide) => {
            const index = slides.findIndex(
              (item) => item.id === slide.id
            );

            const imageCount = slide.images.length;
            const questionCount = slide.questions.length;
            const regionCount = slide.images.reduce(
              (total, image) => total + image.regions.length,
              0
            );

            const isActive = selectedId === slide.id;

            return (
              <button
                key={slide.id}
                type="button"
                className={`slide-list-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelect(slide.id)}
              >
                <span className="slide-item-number">
                  {String(index + 1).padStart(2, '0')}
                </span>

                <span className="slide-item-main">
                  <strong>{slide.name.trim() || 'Adsız slayt'}</strong>

                  <span className="slide-item-meta">
                    <span>
                      <FileText size={12} />
                      {questionCount} soru
                    </span>

                    <span>
                      <ImageIcon size={12} />
                      {imageCount} görsel
                    </span>
                  </span>

                  {regionCount > 0 && (
                    <span className="slide-item-regions">
                      {regionCount} bölge tanımlı
                    </span>
                  )}
                </span>

                <span
                  className={`slide-item-indicator ${
                    isActive ? 'visible' : ''
                  }`}
                  aria-hidden="true"
                />
              </button>
            );
          })
        )}
      </div>

      {slides.length > 0 && (
        <div className="slide-sidebar-footer">
          <button type="button" className="slide-add-button" onClick={onAdd}>
            <Plus size={17} />
            <span>Yeni Slayt</span>
          </button>

          <button
            type="button"
            className="slide-delete-button"
            onClick={onDelete}
            disabled={!selectedId}
            title="Seçili slaytı sil"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </aside>
  );
}