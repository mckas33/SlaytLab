import { useEffect, useState } from 'react';
import { Check, Eye, X } from 'lucide-react';

interface Props {
  image?: string;
  question: string;
  answer: string;
  answered: boolean;
  onAnswer: (correct: boolean, value: string) => void;
}

export default function FlashcardQuestionView({
  image,
  question,
  answer,
  answered,
  onAnswer,
}: Props) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    setFlipped(false);
  }, [question, answer]);

  const reveal = () => {
    if (answered) return;
    setFlipped(true);
  };

  const mark = (correct: boolean) => {
    if (answered) return;
    onAnswer(correct, correct ? 'Doğru bildim' : 'Yanlış bildim');
  };

  return (
    <div className="game-question-view flashcard-question-view">
      {image && (
        <div className="game-question-image-wrap flashcard-image-wrap">
          <img
            className="game-question-image"
            src={image}
            alt="Soru görseli"
          />
        </div>
      )}

      <div className={`flashcard-stage ${flipped ? 'is-flipped' : ''}`}>
        <div className="flashcard-inner">
          <div className="flashcard-face flashcard-front">
            <span className="flashcard-face-kicker">SORU</span>
            <p className="flashcard-face-text">{question}</p>

            {!flipped && (
              <button
                type="button"
                className="primary-button flashcard-reveal-button"
                onClick={reveal}
              >
                <Eye size={16} />
                Cevabı Göster
              </button>
            )}
          </div>

          <div className="flashcard-face flashcard-back">
            <span className="flashcard-face-kicker">CEVAP</span>
            <p className="flashcard-face-text">{answer}</p>
          </div>
        </div>
      </div>

      {flipped && (
        <div className="flashcard-judge-row">
          <span className="flashcard-judge-label">
            Bu soruyu doğru bildin mi?
          </span>

          <div className="flashcard-judge-actions">
            <button
              type="button"
              className="flashcard-judge-button wrong"
              disabled={answered}
              onClick={() => mark(false)}
            >
              <X size={16} />
              Yanlış bildim
            </button>

            <button
              type="button"
              className="flashcard-judge-button correct"
              disabled={answered}
              onClick={() => mark(true)}
            >
              <Check size={16} />
              Doğru bildim
            </button>
          </div>
        </div>
      )}
    </div>
  );
}