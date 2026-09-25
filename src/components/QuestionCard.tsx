import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import type { Question } from '../types/anatomy';

const labels: Record<Question['type'], string> = {
  multiple_choice: 'Çoktan Seçmeli',
  written: 'Yazmalı',
  region: 'Bölge İşaretleme',
  flashcard: 'Flashcard'
};

const descriptions: Record<Question['type'], string> = {
  multiple_choice: 'Seçenekler arasından doğru cevabı seç',
  written: 'Cevabı kendin yaz',
  region: 'Görsel üzerinde bölgeyi bul',
  flashcard: 'Kartı çevirerek cevabı gör'
};

interface Props {
  question: Question;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}

export default function QuestionCard({
  question,
  index,
  onEdit,
  onDelete
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: question.id
  });

  return (
    <article
      ref={setNodeRef}
      className={`question-card ${isDragging ? 'dragging' : ''}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition
      }}
    >
      <button
        type="button"
        className="question-drag-handle"
        aria-label={`${index + 1}. soruyu taşımak için sürükle`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={18} />
      </button>

      <div className="question-number">
        {String(index + 1).padStart(2, '0')}
      </div>

      <div className="question-card-content">
        <div className="question-card-meta">
          <span className="question-type-badge">
            {labels[question.type]}
          </span>

          <span className="question-type-description">
            {descriptions[question.type]}
          </span>
        </div>

        <strong>
          {question.title.trim() || 'Başlıksız soru'}
        </strong>

        {question.description && (
          <span className="question-card-description">
            {question.description}
          </span>
        )}
      </div>

      <div className="question-card-actions">
        <button
          type="button"
          className="question-edit-button"
          onClick={onEdit}
        >
          <Pencil size={15} />
          <span>Düzenle</span>
        </button>

        <button
          type="button"
          className="question-delete-button"
          onClick={onDelete}
          aria-label="Soruyu sil"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </article>
  );
}