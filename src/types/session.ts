import type { AnatomyImage, Question, Slide } from './anatomy';

export type GameQuestion = Question & {
  slideId: string;
  slideName: string;
  images: AnatomyImage[];
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

export function buildSession(
  slides: Slide[],
  shuffle = false
): GameQuestion[] {
  const combined: GameQuestion[] = slides.flatMap((slide) =>
    slide.questions.map((question) => {
      // Çoktan seçmeli sorularda şıklar her oturumda yeniden karıştırılır,
      // soru sırası karıştırma ayarından bağımsız olarak.
      const randomizedQuestion =
        question.type === 'multiple_choice'
          ? { ...question, choices: shuffleArray(question.choices) }
          : question;

      return {
        ...randomizedQuestion,
        slideId: slide.id,
        slideName: slide.name,
        images: slide.images,
      };
    })
  );

  if (!shuffle) {
    return combined;
  }

  return shuffleArray(combined);
}