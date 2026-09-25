export type Page = 'home' | 'game' | 'result' | 'editor';

export type RegionType = 'rectangle' | 'polygon';

export interface Point {
  x: number;
  y: number;
}

export interface AnatomyRegion {
  id: string;
  name: string;
  type: RegionType;

  // Rectangle
  x?: number;
  y?: number;
  width?: number;
  height?: number;

  // Polygon
  points?: Point[];
}

export interface AnatomyImage {
  id: string;
  src: string;
  name: string;
  width: number;
  height: number;
  regions: AnatomyRegion[];
}

export type QuestionType =
  | 'multiple_choice'
  | 'written'
  | 'region'
  | 'flashcard';

export interface BaseQuestion {
  id: string;
  type: QuestionType;
  title: string;
  description?: string;
}

export interface Choice {
  id: string;
  text: string;
  correct: boolean;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple_choice';
  imageId?: string;
  showImage?: boolean;
  choices: Choice[];
}

export interface WrittenQuestion extends BaseQuestion {
  type: 'written';
  imageId?: string;
  showImage?: boolean;
  answers: string[];
}

export interface RegionQuestion extends BaseQuestion {
  type: 'region';
  imageId: string;
  targetRegionId: string;
}

export interface FlashcardQuestion extends BaseQuestion {
  type: 'flashcard';
  imageId?: string;
  showImage?: boolean;
  answer: string;
}

export type Question =
  | MultipleChoiceQuestion
  | WrittenQuestion
  | RegionQuestion
  | FlashcardQuestion;

export interface Slide {
  id: string;
  name: string;
  images: AnatomyImage[];
  questions: Question[];
}

/** Legacy shape kept only for migration of existing localStorage records. */
export interface AnatomySet {
  id: string;
  name: string;
  image: string;
  regions: AnatomyRegion[];
  questions: Array<{
    id: string;
    title: string;
    description?: string;
    imageSrc?: string;
    targetRegionId: string;
  }>;
}

export interface RectCoords {
  x: number;
  y: number;
  width: number;
  height: number;
}