import { BookOpen, MapPin, Pencil, RotateCw, X } from 'lucide-react';
import type { QuestionType } from '../types/anatomy';

interface Props {
  onSelect: (type: QuestionType) => void;
  onClose: () => void;
}

const options: Array<{
  type: QuestionType;
  icon: typeof BookOpen;
  title: string;
  description: string;
  symbol: string;
}> = [
  {
    type: 'multiple_choice',
    icon: BookOpen,
    title: 'Çoktan Seçmeli',
    description: 'Seçenekler arasından doğru cevabı seç.',
    symbol: 'A',
  },
  {
    type: 'flashcard',
    icon: RotateCw,
    title: 'Flashcard',
    description: 'Soruyu gördükten sonra kartı çevirerek cevabı gör.',
    symbol: '⟳',
  },
  {
    type: 'written',
    icon: Pencil,
    title: 'Yazılı Cevap',
    description: 'Cevabı kendin yaz.',
    symbol: 'Aa',
  },
  {
    type: 'region',
    icon: MapPin,
    title: 'Bölge İşaretleme',
    description: 'Verilen görsel üzerinde doğru anatomik bölgeyi bul.',
    symbol: '⌖',
  },
];

export default function QuestionTypeModal({
  onSelect,
  onClose,
}: Props) {
  return (
    <div
      className="modal-backdrop question-type-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="question-type-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="question-type-title"
      >
        <header className="question-type-header">
          <div>
            <span className="editor-eyebrow">YENİ İÇERİK</span>

            <h2 id="question-type-title">
              Soru türünü seç
            </h2>

            <p>
              Hazırlamak istediğin soru formatını seçerek devam et.
            </p>
          </div>

          <button
            type="button"
            className="modal-close-button"
            onClick={onClose}
            aria-label="Kapat"
          >
            <X size={19} />
          </button>
        </header>

        <div className="question-type-grid">
          {options.map((option) => {
            const Icon = option.icon;

            return (
              <button
                key={option.type}
                type="button"
                className={`question-type-option question-type-option-${option.type}`}
                onClick={() => onSelect(option.type)}
              >
                <span className="question-type-option-icon">
                  <Icon size={22} strokeWidth={1.9} />
                </span>

                <span className="question-type-option-content">
                  <strong>{option.title}</strong>
                  <span>{option.description}</span>
                </span>

                <span className="question-type-option-symbol">
                  {option.symbol}
                </span>
              </button>
            );
          })}
        </div>

        <footer className="question-type-footer">
          <span>
            Daha sonra soru türünü değiştirebilirsin.
          </span>

          <button
            type="button"
            className="text-button"
            onClick={onClose}
          >
            Vazgeç
          </button>
        </footer>
      </div>
    </div>
  );
}