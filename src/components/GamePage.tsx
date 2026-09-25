import { useState } from 'react';

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Info,
  Target,
  X,
  XCircle,
} from 'lucide-react';

import type { GameResults } from '../App';
import type { GameQuestion } from '../types/session';

import MultipleChoiceView from './game/MultipleChoiceView';
import WrittenQuestionView from './game/WrittenQuestionView';
import RegionQuestionView from './game/RegionQuestionView';
import FlashcardQuestionView from './game/FlashcardQuestionView';

interface Props {
  sessionQuestions: GameQuestion[];
  results: GameResults;
  setResults: React.Dispatch<
    React.SetStateAction<GameResults>
  >;
  onFinishGame: () => void;
  onReturnHome: () => void;
}

export function GamePage({
  sessionQuestions,
  results,
  setResults,
  onFinishGame,
  onReturnHome,
}: Props) {
  const [index, setIndex] =
    useState(0);

  const [answered, setAnswered] =
    useState(false);

  const [correct, setCorrect] =
    useState(false);

  const [selectedRegion, setSelectedRegion] =
    useState<string | null>(null);

  const [userAnswer, setUserAnswer] =
    useState('');

  const question =
    sessionQuestions[index];

  if (!question) return null;

  const regionImage =
    question.type === 'region'
      ? question.images.find(
          (image) =>
            image.id === question.imageId
        )
      : undefined;

  const questionImage =
    question.type !== 'region' &&
    question.imageId
      ? question.images.find(
          (image) =>
            image.id === question.imageId
        )
      : undefined;

  const correctAnswer =
    question.type === 'multiple_choice'
      ? question.choices.find((choice) => choice.correct)?.text ?? ''
      : question.type === 'written'
        ? question.answers.join(', ')
        : question.type === 'region'
          ? regionImage?.regions.find(
              (region) => region.id === question.targetRegionId
            )?.name ?? ''
          : question.type === 'flashcard'
            ? question.answer
            : '';

  const answer = (
    isCorrect: boolean,
    value: string,
    regionId?: string
  ) => {
    if (answered) return;

    setAnswered(true);
    setCorrect(isCorrect);
    setUserAnswer(value);

    if (regionId) {
      setSelectedRegion(regionId);
    }

    setResults((previous) => {
      const current =
        previous.bySlide[
          question.slideId
        ] ?? {
          slideId: question.slideId,
          slideName:
            question.slideName,
          correct: 0,
          total: 0,
        };

      return {
        correct:
          previous.correct +
          (isCorrect ? 1 : 0),

        wrong:
          previous.wrong +
          (isCorrect ? 0 : 1),

        bySlide: {
          ...previous.bySlide,
          [question.slideId]: {
            ...current,
            correct:
              current.correct +
              (isCorrect ? 1 : 0),
            total:
              current.total + 1,
          },
        },
      };
    });
  };

  const next = () => {
    if (
      index ===
      sessionQuestions.length - 1
    ) {
      onFinishGame();
      return;
    }

    setIndex((current) => current + 1);
    setAnswered(false);
    setCorrect(false);
    setSelectedRegion(null);
    setUserAnswer('');
  };

  const progress =
    ((index + 1) /
      sessionQuestions.length) *
    100;

  const questionTypeLabel =
    question.type === 'multiple_choice'
      ? 'Çoktan seçmeli'
      : question.type === 'written'
        ? 'Yazılı cevap'
        : question.type === 'flashcard'
          ? 'Flashcard'
          : 'Bölge işaretleme';

  const questionTypeIcon =
    question.type === 'region'
      ? <Target size={15} />
      : question.type === 'written'
        ? <span className="game-type-text-icon">Aa</span>
        : question.type === 'flashcard'
          ? <span className="game-type-text-icon">⟳</span>
          : <span className="game-type-text-icon">A–D</span>;

  return (
    <div className="game-page">
      <div className="game-shell">

        {/* TOP BAR */}
        <header className="game-topbar">
          <button
            type="button"
            className="back-home-button"
            onClick={onReturnHome}
          >
            <ArrowLeft size={16} />
            <span>Ana Sayfa</span>
          </button>

          <div className="game-question-counter">
            <strong>
              {String(index + 1).padStart(
                2,
                '0'
              )}
            </strong>

            <span>
              / {String(
                sessionQuestions.length
              ).padStart(2, '0')}
            </span>
          </div>
        </header>

        {/* PROGRESS */}
        <div className="game-progress-wrap">
          <div className="game-progress">
            <div
              className="game-progress-fill"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>

          <span>
            %{Math.round(progress)}
          </span>
        </div>

        {/* QUESTION HEADER */}
        <section className="game-question-header">
          <div className="game-question-heading">
            <div className="game-question-meta">
              <span className="game-label">
                {question.slideName}
              </span>

              <span
                className={`game-question-type game-question-type-${question.type}`}
              >
                {questionTypeIcon}
                {questionTypeLabel}
              </span>
            </div>

            <h1 className="game-title">
              {question.title}
            </h1>
          </div>

          <div className="game-score-panel">
            <div className="game-score-item correct">
              <CheckCircle2 size={16} />
              <div>
                <small>
                  DOĞRU
                </small>
                <strong>
                  {results.correct}
                </strong>
              </div>
            </div>

            <div className="game-score-divider" />

            <div className="game-score-item wrong">
              <XCircle size={16} />
              <div>
                <small>
                  YANLIŞ
                </small>
                <strong>
                  {results.wrong}
                </strong>
              </div>
            </div>
          </div>
        </section>

        {/* QUESTION */}
        <main
          className={`anatomy-card ${
            answered
              ? 'is-answered'
              : ''
          }`}
        >
          {question.type ===
            'multiple_choice' && (
            <MultipleChoiceView
              image={
                question.showImage
                  ? questionImage?.src
                  : undefined
              }
              choices={
                question.choices
              }
              answered={answered}
              selectedValue={
                userAnswer
              }
              onAnswer={(
                isCorrect,
                value
              ) =>
                answer(
                  isCorrect,
                  value
                )
              }
            />
          )}

          {question.type ===
            'written' && (
            <WrittenQuestionView
              image={
                question.showImage
                  ? questionImage?.src
                  : undefined
              }
              answers={
                question.answers
              }
              answered={answered}
              onAnswer={(
                isCorrect,
                value
              ) =>
                answer(
                  isCorrect,
                  value
                )
              }
            />
          )}

          {question.type ===
            'region' && (
            <RegionQuestionView
              image={regionImage}
              targetRegionId={
                question.targetRegionId
              }
              selected={
                selectedRegion
              }
              answered={answered}
              onAnswer={(
                isCorrect,
                id
              ) =>
                answer(
                  isCorrect,
                  regionImage?.regions.find(
                    (region) =>
                      region.id === id
                  )?.name ?? '',
                  id
                )
              }
            />
          )}

          {question.type === 'flashcard' && (
            <FlashcardQuestionView
              image={
                question.showImage
                  ? questionImage?.src
                  : undefined
              }
              question={question.title}
              answer={question.answer}
              answered={answered}
              onAnswer={(isCorrect, value) =>
                answer(isCorrect, value)
              }
            />
          )}
        </main>

        {/* RESULT */}
        {answered && (
          <section
            className={`game-answer-result ${
              correct
                ? 'is-correct'
                : 'is-wrong'
            }`}
          >
            <div className="game-result-main">
              <div className="game-result-icon">
                {correct ? (
                  <Check size={20} />
                ) : (
                  <X size={20} />
                )}
              </div>

              <div>
                <span className="game-result-kicker">
                  {correct
                    ? 'CEVAP DOĞRU'
                    : 'CEVAP YANLIŞ'}
                </span>

                <strong>
                  {correct
                    ? 'Tebrikler, doğru cevabı buldun.'
                    : 'Bu sefer doğru cevabı bulamadın.'}
                </strong>
              </div>
            </div>

                        <div
              className={`game-result-details ${
                question.type === 'flashcard'
                  ? 'single-column'
                  : ''
              }`}
            >
              {question.type !== 'flashcard' && (
                <div>
                  <span>
                    Senin cevabın
                  </span>

                  <b>
                    {userAnswer ||
                      'Cevap verilmedi'}
                  </b>
                </div>
              )}

              <div>
                <span>
                  Doğru cevap
                </span>

                <b>
                  {correctAnswer ||
                    'Tanımlanmamış'}
                </b>
              </div>

              {question.description && (
                <div className="game-result-description">
                  <span>
                    <Info size={13} />
                    Açıklama
                  </span>

                  <p>
                    {question.description}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* BOTTOM */}
        <footer className="game-bottom">
          <div className="game-bottom-status">
            {!answered ? (
              <>
                <span className="game-status-dot" />
                <span>
                  Cevabını seç ve kontrol et.
                </span>
              </>
            ) : (
              <>
                <span
                  className={`game-status-icon ${
                    correct
                      ? 'correct'
                      : 'wrong'
                  }`}
                >
                  {correct ? (
                    <Check size={13} />
                  ) : (
                    <X size={13} />
                  )}
                </span>

                <span>
                  {index ===
                  sessionQuestions.length - 1
                    ? 'Test tamamlandı.'
                    : 'Hazırsan sonraki soruya geçebilirsin.'}
                </span>
              </>
            )}
          </div>

          <button
            type="button"
            className="next-button"
            disabled={!answered}
            onClick={next}
          >
            <span>
              {index ===
              sessionQuestions.length - 1
                ? 'Testi Bitir'
                : 'Sonraki Soru'}
            </span>

            {index ===
            sessionQuestions.length - 1 ? (
              <Check size={17} />
            ) : (
              <ArrowRight size={17} />
            )}
          </button>
        </footer>

      </div>
    </div>
  );
}