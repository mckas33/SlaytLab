import { useEffect, useState } from 'react';
import HomePage from './components/HomePage';
import { GamePage } from './components/GamePage';
import { ResultPage } from './components/ResultPage';
import EditorPage from './components/EditorPage';
import { DialogProvider } from './components/DialogProvider';
import { ToastProvider } from './components/ToastProvider';
import type {
  AnatomyImage,
  AnatomyRegion,
  Page,
  Question,
  Slide,
} from './types/anatomy';
import {
  buildSession,
  type GameQuestion,
} from './types/session';

const STORAGE_KEY =
  'slaytlab_slides_v2';

const LEGACY_KEYS = {
  sets: 'slaytlab_sets_v1',
  image: 'slaytlab_custom_image_v1',
  regions: 'slaytlab_custom_regions_v1',
  questions: 'slaytlab_custom_questions_v1',
};

export interface SlidePerformance {
  slideId: string;
  slideName: string;
  correct: number;
  total: number;
}

export interface GameResults {
  correct: number;
  wrong: number;
  bySlide: Record<
    string,
    SlidePerformance
  >;
}

const emptyResults = (): GameResults => ({
  correct: 0,
  wrong: 0,
  bySlide: {},
});

/**
 * Legacy verilerde kullanılan yüzde koordinatlarını
 * doğal piksel koordinatlarına çevirir.
 *
 * Bu fonksiyon yalnızca eski veri migration'ında
 * kullanılmalıdır.
 */
function normalizeLegacyRegion(
  region: AnatomyRegion,
  width = 1000,
  height = 600
): AnatomyRegion {
  const convertPoint = (point: {
    x: number;
    y: number;
  }) => ({
    x:
      point.x <= 100
        ? (point.x / 100) * width
        : point.x,
    y:
      point.y <= 100
        ? (point.y / 100) * height
        : point.y,
  });

  if (
    region.type === 'polygon' &&
    region.points
  ) {
    return {
      ...region,
      points: region.points.map(convertPoint),
    };
  }

  if (
    region.type === 'rectangle' &&
    region.x !== undefined &&
    region.y !== undefined &&
    region.width !== undefined &&
    region.height !== undefined
  ) {
    return {
      ...region,
      x:
        region.x <= 100
          ? (region.x / 100) * width
          : region.x,
      y:
        region.y <= 100
          ? (region.y / 100) * height
          : region.y,
      width:
        region.width <= 100
          ? (region.width / 100) * width
          : region.width,
      height:
        region.height <= 100
          ? (region.height / 100) * height
          : region.height,
    };
  }

  return {
    ...region,
    type: region.type ?? 'rectangle',
  };
}

function normalizeSlide(
  value: unknown
): Slide {
  const raw = value as {
    id?: string;
    name?: string;
    image?: string;
    regions?: AnatomyRegion[];
    images?: AnatomyImage[];
    questions?: Array<
      Record<string, unknown>
    >;
  };

  const slideId =
    raw.id ??
    `slide-${Date.now()}`;

  const legacyImageId =
    `image-${slideId}-legacy`;

  /**
   * Modern v2 verileri zaten doğal piksel
   * koordinatları kullanıyor.
   *
   * Bu nedenle burada bölgeleri normalize
   * etmiyoruz.
   */
  let images: AnatomyImage[] =
    Array.isArray(raw.images)
      ? raw.images.map((image) => ({
          ...image,
          width:
            typeof image.width === 'number' &&
            image.width > 0
              ? image.width
              : 1000,
          height:
            typeof image.height === 'number' &&
            image.height > 0
              ? image.height
              : 600,
          regions:
            Array.isArray(image.regions)
              ? image.regions.map(
                  (region) => ({
                    ...region,
                    type:
                      region.type ??
                      'rectangle',
                  })
                )
              : [],
        }))
      : [];

  /**
   * Eski tek-görsel yapısından migration.
   */
  if (
    !images.length &&
    typeof raw.image === 'string' &&
    raw.image
  ) {
    images = [
      {
        id: legacyImageId,
        src: raw.image,
        name: 'Görsel 1',
        width: 1000,
        height: 600,
        regions: Array.isArray(
          raw.regions
        )
          ? raw.regions.map((region) =>
              normalizeLegacyRegion(
                region
              )
            )
          : [],
      },
    ];
  }

  const ensureImage = (
    src: string,
    name: string
  ) => {
    const existing = images.find(
      (image) => image.src === src
    );

    if (existing) {
      return existing.id;
    }

    const image = {
      id: `image-${Date.now()}-${images.length}`,
      src,
      name,
      width: 1000,
      height: 600,
      regions: [],
    };

    images = [
      ...images,
      image,
    ];

    return image.id;
  };

  const questions: Question[] =
    Array.isArray(raw.questions)
      ? (raw.questions.flatMap(
          (question) => {
            const type =
              question.type;

            /**
             * Eski multiple_text /
             * multiple_image sorularını
             * yeni multiple_choice yapısına
             * dönüştür.
             */
            if (
              (type ===
                'multiple_text' ||
                type ===
                  'multiple_image') &&
              Array.isArray(
                question.choices
              )
            ) {
              const imageId =
                typeof question.imageId ===
                'string'
                  ? question.imageId
                  : typeof question.image ===
                      'string'
                    ? ensureImage(
                        question.image,
                        'Soru görseli'
                      )
                    : undefined;

              const {
                image: _oldImage,
                ...rest
              } = question;

              return [
                {
                  ...rest,
                  type: 'multiple_choice',
                  imageId,
                  showImage:
                    type ===
                      'multiple_image' ||
                    Boolean(
                      question.showImage
                    ),
                },
              ];
            }

            /**
             * Eski bölge sorularını yeni
             * imageId + targetRegionId
             * yapısına taşı.
             */
            if (
              type === 'region' &&
              Array.isArray(
                question.regions
              )
            ) {
              const imageId =
                typeof question.imageId ===
                'string'
                  ? question.imageId
                  : typeof question.image ===
                      'string'
                    ? ensureImage(
                        question.image,
                        'Bölge görseli'
                      )
                    : images[0]?.id;

              const image =
                images.find(
                  (item) =>
                    item.id === imageId
                );

              if (
                image &&
                !image.regions.length
              ) {
                image.regions =
                  question.regions
                    .filter(
                      (
                        region
                      ): region is AnatomyRegion =>
                        Boolean(
                          region &&
                            typeof region ===
                              'object'
                        )
                    )
                    .map((region) =>
                      normalizeLegacyRegion(
                        region,
                        image.width,
                        image.height
                      )
                    );
              }

              return [
                {
                  ...question,
                  imageId,
                  type: 'region',
                },
              ];
            }

            /**
             * Eski yazılı sorularda image
             * doğrudan tutuluyordu.
             */
            if (
              type === 'written' &&
              typeof question.image ===
                'string'
            ) {
              const imageId =
                typeof question.imageId ===
                'string'
                  ? question.imageId
                  : ensureImage(
                      question.image,
                      'Soru görseli'
                    );

              return [
                {
                  ...question,
                  imageId,
                  showImage:
                    question.showImage ??
                    true,
                },
              ];
            }

            return [question];
          }
        ) as unknown as Question[])
      : [];

  const firstImageId =
    images[0]?.id;

  return {
    id: slideId,
    name:
      raw.name ??
      'Adsız Slayt',
    images,
    questions:
      questions.map((question) => {
        if (
          question.type === 'region' &&
          !question.imageId &&
          firstImageId
        ) {
          return {
            ...question,
            imageId:
              firstImageId,
          };
        }

        return question;
      }),
  };
}

function createLegacyQuestion(
  question: {
    id: string;
    title: string;
    description?: string;
    imageSrc?: string;
    targetRegionId: string;
  },
  imageId: string
): Question {
  return {
    id: question.id,
    type: 'region',
    title: question.title,
    description:
      question.description,
    imageId,
    targetRegionId:
      question.targetRegionId,
  };
}

function migrateLegacy(): Slide[] {
  try {
    const rawSets =
      localStorage.getItem(
        LEGACY_KEYS.sets
      );

    if (rawSets) {
      const sets = JSON.parse(
        rawSets
      );

      if (Array.isArray(sets)) {
        return sets.map((set) => {
          const regions =
            Array.isArray(
              set.regions
            )
              ? set.regions.map(
                  (
                    region: AnatomyRegion
                  ) =>
                    normalizeLegacyRegion(
                      region
                    )
                )
              : [];

          const imageId =
            `image-${set.id}-legacy`;

          return {
            id: set.id,
            name:
              set.name ??
              'Adsız Slayt',

            images:
              set.image
                ? [
                    {
                      id: imageId,
                      src: set.image,
                      name: 'Görsel 1',
                      width: 1000,
                      height: 600,
                      regions,
                    },
                  ]
                : [],

            questions:
              Array.isArray(
                set.questions
              )
                ? set.questions.map(
                    (
                      question: {
                        id: string;
                        title: string;
                        description?: string;
                        imageSrc?: string;
                        targetRegionId: string;
                      }
                    ) =>
                      createLegacyQuestion(
                        question,
                        imageId
                      )
                  )
                : [],
          };
        });
      }
    }

    const image =
      localStorage.getItem(
        LEGACY_KEYS.image
      ) ?? '';

    const regionsRaw =
      localStorage.getItem(
        LEGACY_KEYS.regions
      );

    const questionsRaw =
      localStorage.getItem(
        LEGACY_KEYS.questions
      );

    const regions: AnatomyRegion[] =
      regionsRaw
        ? JSON.parse(
            regionsRaw
          ).map(
            (
              region: AnatomyRegion
            ) =>
              normalizeLegacyRegion(
                region
              )
          )
        : [];

    const questions = questionsRaw
      ? JSON.parse(
          questionsRaw
        )
      : [];

    if (
      image ||
      regions.length ||
      questions.length
    ) {
      const imageId =
        'image-legacy-slide';

      return [
        {
          id: 'legacy-slide',
          name: 'Kendi Anatomi Slaytım',

          images: image
            ? [
                {
                  id: imageId,
                  src: image,
                  name: 'Görsel 1',
                  width: 1000,
                  height: 600,
                  regions,
                },
              ]
            : [],

          questions:
            Array.isArray(
              questions
            )
              ? questions.map(
                  (question) =>
                    createLegacyQuestion(
                      question,
                      imageId
                    )
                )
              : [],
        },
      ];
    }
  } catch {
    return [];
  }

  return [];
}

function loadSlides(): Slide[] {
  try {
    const saved =
      localStorage.getItem(
        STORAGE_KEY
      );

    if (saved) {
      const parsed =
        JSON.parse(saved);

      if (Array.isArray(parsed)) {
        return parsed.map(
          normalizeSlide
        );
      }
    }
  } catch {
    return [];
  }

  return migrateLegacy();
}

function AppInner() {
  const [page, setPage] =
    useState<Page>('home');

  const [slides, setSlides] =
    useState<Slide[]>(loadSlides);

  const [
    selectedSlideId,
    setSelectedSlideId,
  ] = useState<string | null>(
    null
  );

  const [
    sessionQuestions,
    setSessionQuestions,
  ] = useState<GameQuestion[]>(
    []
  );

  const [results, setResults] =
    useState<GameResults>(
      emptyResults
    );

  const [gameRunId, setGameRunId] =
    useState(0);

  const [lastSession, setLastSession] = useState<{
    slideIds: string[];
    shuffle: boolean;
  } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(slides)
      );
    } catch {
      // localStorage yazılamıyorsa
      // uygulamanın çalışmasını engelleme.
    }
  }, [slides]);

  const handleStartGame = (
    slideIds: string[],
    shuffle: boolean
  ) => {
    const selected = slides.filter((slide) =>
      slideIds.includes(slide.id)
    );

    const questions = buildSession(selected, shuffle);

    setSessionQuestions(questions);
    setLastSession({ slideIds, shuffle });
    setResults(emptyResults());
    setGameRunId((current) => current + 1);
    setPage('game');
  };

  const handleRestart = () => {
    if (lastSession) {
      const selected = slides.filter((slide) =>
        lastSession.slideIds.includes(slide.id)
      );

      const questions = buildSession(selected, lastSession.shuffle);

      setSessionQuestions(questions);
    }

    setResults(emptyResults());
    setGameRunId((current) => current + 1);
    setPage('game');
  };

  const handleReturnHome = () => {
    setPage('home');
  };

  if (page === 'home') {
    return (
      <HomePage
        slides={slides}
        onStartGame={
          handleStartGame
        }
        onOpenEditor={() =>
          setPage('editor')
        }
      />
    );
  }

  if (page === 'editor') {
    return (
      <EditorPage
        slides={slides}
        selectedSlideId={
          selectedSlideId
        }
        onSelectSlide={
          setSelectedSlideId
        }
        onUpdateSlides={
          setSlides
        }
        onReturnHome={
          handleReturnHome
        }
      />
    );
  }

  if (
    page === 'game' &&
    sessionQuestions.length > 0
  ) {
    return (
      <GamePage
        key={gameRunId}
        sessionQuestions={
          sessionQuestions
        }
        results={results}
        setResults={setResults}
        onFinishGame={() =>
          setPage('result')
        }
        onReturnHome={
          handleReturnHome
        }
      />
    );
  }

  return (
    <ResultPage
      results={results}
      total={
        sessionQuestions.length
      }
      onRestart={
        handleRestart
      }
      onReturnHome={
        handleReturnHome
      }
    />
  );
}

export default function App() {
  return (
    <DialogProvider>
      <ToastProvider>
        <AppInner />
      </ToastProvider>
    </DialogProvider>
  );
}