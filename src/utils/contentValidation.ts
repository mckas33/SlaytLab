import type {
  AnatomyImage,
  AnatomyRegion,
  Point,
  Question,
  RegionType,
  Slide
} from '../types/anatomy';

const isObject = (
  value: unknown
): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const isValidPoint = (
  value: unknown,
  width?: number,
  height?: number
): value is Point => {
  if (!isObject(value)) return false;

  if (
    typeof value.x !== 'number' ||
    typeof value.y !== 'number' ||
    !Number.isFinite(value.x) ||
    !Number.isFinite(value.y)
  ) {
    return false;
  }

  if (
    width !== undefined &&
    height !== undefined
  ) {
    return (
      value.x >= 0 &&
      value.x <= width &&
      value.y >= 0 &&
      value.y <= height
    );
  }

  return value.x >= 0 && value.y >= 0;
};

const isValidRegionType = (
  value: unknown
): value is RegionType => {
  return (
    value === 'rectangle' ||
    value === 'polygon'
  );
};

export const isValidRegion = (
  value: unknown,
  width?: number,
  height?: number
): value is AnatomyRegion => {
  if (!isObject(value)) return false;

  if (
    typeof value.id !== 'string' ||
    value.id.trim().length === 0 ||
    typeof value.name !== 'string' ||
    value.name.trim().length === 0 ||
    !isValidRegionType(value.type)
  ) {
    return false;
  }

  if (value.type === 'rectangle') {
    if (
      typeof value.x !== 'number' ||
      typeof value.y !== 'number' ||
      typeof value.width !== 'number' ||
      typeof value.height !== 'number'
    ) {
      return false;
    }

    if (
      !Number.isFinite(value.x) ||
      !Number.isFinite(value.y) ||
      !Number.isFinite(value.width) ||
      !Number.isFinite(value.height) ||
      value.width <= 0 ||
      value.height <= 0 ||
      value.x < 0 ||
      value.y < 0
    ) {
      return false;
    }

    if (
      width !== undefined &&
      height !== undefined
    ) {
      return (
        value.x + value.width <= width &&
        value.y + value.height <= height
      );
    }

    return true;
  }

  if (
    !Array.isArray(value.points) ||
    value.points.length < 3
  ) {
    return false;
  }

  return value.points.every((point) =>
    isValidPoint(point, width, height)
  );
};

const isValidImage = (
  value: unknown
): value is AnatomyImage => {
  if (!isObject(value)) return false;

  if (
    typeof value.id !== 'string' ||
    typeof value.src !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.width !== 'number' ||
    typeof value.height !== 'number' ||
    !Array.isArray(value.regions)
  ) {
    return false;
  }

  if (
    value.id.trim().length === 0 ||
    value.src.trim().length === 0 ||
    value.name.trim().length === 0 ||
    value.width <= 0 ||
    value.height <= 0 ||
    !Number.isFinite(value.width) ||
    !Number.isFinite(value.height)
  ) {
    return false;
  }

  const imageWidth = value.width;
  const imageHeight = value.height;

  return value.regions.every((region) =>
    isValidRegion(
      region,
      imageWidth,
      imageHeight
    )
  );
};

const isValidChoice = (
  value: unknown
): boolean => {
  if (!isObject(value)) return false;

  return (
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    typeof value.text === 'string' &&
    typeof value.correct === 'boolean'
  );
};

export const isValidQuestion = (
  value: unknown,
  images: AnatomyImage[] = []
): value is Question => {
  if (!isObject(value)) return false;

  if (
    typeof value.id !== 'string' ||
    value.id.trim().length === 0 ||
    typeof value.title !== 'string' ||
    value.title.trim().length === 0
  ) {
    return false;
  }

  if (
    value.description !== undefined &&
    typeof value.description !== 'string'
  ) {
    return false;
  }

  if (value.type === 'multiple_choice') {
    if (
      !Array.isArray(value.choices) ||
      value.choices.length < 2
    ) {
      return false;
    }

    if (!value.choices.every(isValidChoice)) {
      return false;
    }

    const correctCount = value.choices.filter(
      (choice) =>
        isObject(choice) &&
        choice.correct === true
    ).length;

    if (correctCount !== 1) {
      return false;
    }

    if (
      value.imageId !== undefined &&
      (
        typeof value.imageId !== 'string' ||
        !images.some(
          (image) => image.id === value.imageId
        )
      )
    ) {
      return false;
    }

    return true;
  }

  if (value.type === 'written') {
    if (
      !Array.isArray(value.answers) ||
      value.answers.length === 0
    ) {
      return false;
    }

    if (
      !value.answers.every(
        (answer) =>
          typeof answer === 'string' &&
          answer.trim().length > 0
      )
    ) {
      return false;
    }

    if (
      value.imageId !== undefined &&
      (
        typeof value.imageId !== 'string' ||
        !images.some(
          (image) => image.id === value.imageId
        )
      )
    ) {
      return false;
    }

    return true;
  }

  if (value.type === 'region') {
    if (
      typeof value.imageId !== 'string' ||
      typeof value.targetRegionId !== 'string' ||
      value.imageId.trim().length === 0 ||
      value.targetRegionId.trim().length === 0
    ) {
      return false;
    }

    const image = images.find(
      (item) => item.id === value.imageId
    );

    if (!image) return false;

    return image.regions.some(
      (region) =>
        region.id === value.targetRegionId
    );
  }

  return false;
};

export const isValidSlide = (
  value: unknown
): value is Slide => {
  if (!isObject(value)) return false;

  if (
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    !Array.isArray(value.images) ||
    !Array.isArray(value.questions)
  ) {
    return false;
  }

  if (
    value.id.trim().length === 0 ||
    value.name.trim().length === 0
  ) {
    return false;
  }

  const images = value.images.filter(isValidImage);

  if (images.length !== value.images.length) {
    return false;
  }

  return value.questions.every(
    (question) =>
      isValidQuestion(question, images)
  );
};

export interface ValidatedContent {
  image: string | null;
  regions: AnatomyRegion[];
  questions: Question[];
}

export const validateImportData = (
  value: unknown
): ValidatedContent | null => {
  if (!isObject(value)) {
    return null;
  }

  /*
   * Legacy import format is still accepted here.
   * New slide-based data should use isValidSlide().
   */

  const imageValue =
    typeof value.image === 'string'
      ? value.image
      : typeof value.customImage === 'string'
        ? value.customImage
        : null;

  const regionsValue = value.regions;
  const questionsValue = value.questions;

  if (
    !Array.isArray(regionsValue) ||
    !Array.isArray(questionsValue)
  ) {
    return null;
  }

  const regions = regionsValue.filter(
    (region): region is AnatomyRegion =>
      isValidRegion(region)
  );

  const regionIds = new Set(
    regions.map((region) => region.id)
  );

  const questions = questionsValue.filter(
    (question): question is Question => {
      if (!isObject(question)) return false;

      if (question.type !== 'region') {
        return false;
      }

      if (
        typeof question.id !== 'string' ||
        typeof question.title !== 'string' ||
        typeof question.targetRegionId !== 'string'
      ) {
        return false;
      }

      return regionIds.has(
        question.targetRegionId
      );
    }
  );

  if (
    regions.length === 0 ||
    questions.length === 0
  ) {
    return null;
  }

  return {
    image:
      imageValue &&
      imageValue.trim().length > 0
        ? imageValue
        : null,
    regions,
    questions
  };
};