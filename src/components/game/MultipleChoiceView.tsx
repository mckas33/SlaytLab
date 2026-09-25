import {
  Check,
  X,
} from 'lucide-react';

import type { Choice } from '../../types/anatomy';

interface Props {
  image?: string;
  choices: Choice[];
  answered: boolean;
  selectedValue?: string;
  onAnswer: (
    correct: boolean,
    value: string
  ) => void;
}

export default function MultipleChoiceView({
  image,
  choices,
  answered,
  selectedValue,
  onAnswer,
}: Props) {
  return (
    <div className="game-question-view multiple-choice-view">
      {image && (
        <div className="game-question-image-frame">
          <img
            className="game-question-image"
            src={image}
            alt="Soru görseli"
          />
        </div>
      )}

      <div className="game-choice-list">
        {choices.map((choice, index) => {
          const selected =
            selectedValue === choice.text;

          const correct =
            choice.correct;

          let state = '';

          if (answered) {
            if (correct) {
              state = 'correct';
            } else if (selected) {
              state = 'wrong';
            } else {
              state = 'muted';
            }
          }

          return (
            <button
              type="button"
              key={choice.id}
              disabled={answered}
              className={`game-choice ${state} ${
                selected
                  ? 'selected'
                  : ''
              }`}
              onClick={() =>
                onAnswer(
                  choice.correct,
                  choice.text
                )
              }
            >
              <span className="game-choice-letter">
                {String.fromCharCode(
                  65 + index
                )}
              </span>

              <span className="game-choice-text">
                {choice.text}
              </span>

              {answered && correct && (
                <span className="game-choice-status correct">
                  <Check size={17} />
                </span>
              )}

              {answered &&
                selected &&
                !correct && (
                  <span className="game-choice-status wrong">
                    <X size={17} />
                  </span>
                )}
            </button>
          );
        })}
      </div>
    </div>
  );
}