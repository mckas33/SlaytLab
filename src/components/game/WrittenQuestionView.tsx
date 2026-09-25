import { useEffect, useState } from 'react';
import { normalizeAnswer } from '../../utils/normalizeAnswer';

interface Props {
  image?: string;
  answers: string[];
  answered: boolean;
  onAnswer: (correct: boolean, value: string) => void;
}

export default function WrittenQuestionView({
  image,
  answers,
  answered,
  onAnswer,
}: Props) {
  const [value, setValue] = useState('');

  useEffect(() => {
    setValue('');
  }, [answers]);

  const submit = () => {
    if (answered || !value.trim()) return;

    const userAnswer = value.trim();

    const isCorrect = answers.some(
      (answer) =>
        normalizeAnswer(answer) === normalizeAnswer(userAnswer)
    );

    onAnswer(isCorrect, userAnswer);
  };

  return (
    <div className="game-question-view written-question-view">
      {image && (
        <div className="game-question-image-wrap">
          <img
            className="game-question-image"
            src={image}
            alt="Soru görseli"
          />
        </div>
      )}

      <div className="written-answer-box">
        <label htmlFor="written-answer">
          Cevabın
        </label>

        <div className="written-answer-row">
          <input
            id="written-answer"
            value={value}
            disabled={answered}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !answered) {
                submit();
              }
            }}
            placeholder="Cevabını yaz..."
            autoComplete="off"
          />

          <button
            type="button"
            className="primary-button"
            disabled={answered || !value.trim()}
            onClick={submit}
          >
            Kontrol Et
          </button>
        </div>
      </div>
    </div>
  );
}