import { supabase } from './supabase';
import type {
  AnatomyImage,
  AnatomyRegion,
  Choice,
  Point,
  Question,
  RegionType,
  Slide,
} from '../types/anatomy';

/* ---------- Satır tipleri ---------- */

interface SlideRow {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface ImageRow {
  id: string;
  slide_id: string;
  name: string;
  src: string;
  width: number;
  height: number;
  position: number;
  created_at: string;
}

interface RegionRow {
  id: string;
  image_id: string;
  name: string;
  type: string;
  x: number | null;
  y: number | null;
  width: number | null;
  height: number | null;
  points: unknown;
  position: number;
  created_at: string;
}

interface QuestionRow {
  id: string;
  slide_id: string;
  type: string;
  title: string;
  description: string | null;
  image_id: string | null;
  show_image: boolean;
  target_region_id: string | null;
  answer: string | null;
  answers: unknown;
  choices: unknown;
  position: number;
  created_at: string;
}

interface SlideWrite {
  id: string;
  user_id: string;
  name: string;
}

interface ImageMetaWrite {
  id: string;
  slide_id: string;
  name: string;
  width: number;
  height: number;
  position: number;
}

interface ImageWrite extends ImageMetaWrite {
  src: string;
}

interface RegionWrite {
  id: string;
  image_id: string;
  name: string;
  type: RegionType;
  x: number | null;
  y: number | null;
  width: number | null;
  height: number | null;
  points: Point[] | null;
  position: number;
}

interface QuestionWrite {
  id: string;
  slide_id: string;
  type: string;
  title: string;
  description: string | null;
  image_id: string | null;
  show_image: boolean;
  target_region_id: string | null;
  answer: string | null;
  answers: string[] | null;
  choices: Choice[] | null;
  position: number;
}

interface SlideRefs {
  imageIds: Set<string>;
  regionIds: Set<string>;
}

interface Plan {
  deleteSlides: string[];
  deleteImages: string[];
  deleteRegions: string[];
  deleteQuestions: string[];
  slides: SlideWrite[];
  images: ImageWrite[];
  imageMetas: ImageMetaWrite[];
  regions: RegionWrite[];
  questions: QuestionWrite[];
  touched: string[];
}

interface WriteResult {
  error: { message: string } | null;
}

/* ---------- Yardımcılar ---------- */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const json = (value: unknown): string => JSON.stringify(value);

const byPosition = <T extends { position: number }>(a: T, b: T): number =>
  a.position - b.position;

function indexed<T extends { id: string }>(items: readonly T[]) {
  return new Map(
    items.map((item, index) => [item.id, { item, index }] as const)
  );
}

function groupBy<T>(items: readonly T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();

  for (const item of items) {
    const k = key(item);
    const bucket = map.get(k);

    if (bucket) {
      bucket.push(item);
    } else {
      map.set(k, [item]);
    }
  }

  return map;
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const result: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }

  return result;
}

async function check(
  operation: PromiseLike<WriteResult>,
  label: string
): Promise<void> {
  const { error } = await operation;

  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }
}

/* ---------- jsonb ayrıştırıcıları ---------- */

function parsePoints(value: unknown): Point[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item: unknown) =>
    isRecord(item) &&
    typeof item.x === 'number' &&
    typeof item.y === 'number'
      ? [{ x: item.x, y: item.y }]
      : []
  );
}

function parseChoices(value: unknown): Choice[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item: unknown) =>
    isRecord(item) &&
    typeof item.id === 'string' &&
    typeof item.text === 'string' &&
    typeof item.correct === 'boolean'
      ? [{ id: item.id, text: item.text, correct: item.correct }]
      : []
  );
}

function parseStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item: unknown) =>
    typeof item === 'string' ? [item] : []
  );
}

/* ---------- Satır → uygulama modeli ---------- */

function toRegion(row: RegionRow): AnatomyRegion {
  if (row.type === 'polygon') {
    return {
      id: row.id,
      name: row.name,
      type: 'polygon',
      points: parsePoints(row.points),
    };
  }

  return {
    id: row.id,
    name: row.name,
    type: 'rectangle',
    x: row.x ?? undefined,
    y: row.y ?? undefined,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
  };
}

function toQuestion(row: QuestionRow): Question | null {
  const description = row.description ?? undefined;

  switch (row.type) {
    case 'multiple_choice':
      return {
        id: row.id,
        type: 'multiple_choice',
        title: row.title,
        description,
        imageId: row.image_id ?? undefined,
        showImage: row.show_image,
        choices: parseChoices(row.choices),
      };

    case 'written':
      return {
        id: row.id,
        type: 'written',
        title: row.title,
        description,
        imageId: row.image_id ?? undefined,
        showImage: row.show_image,
        answers: parseStrings(row.answers),
      };

    case 'region':
      return {
        id: row.id,
        type: 'region',
        title: row.title,
        description,
        imageId: row.image_id ?? '',
        targetRegionId: row.target_region_id ?? '',
      };

    case 'flashcard':
      return {
        id: row.id,
        type: 'flashcard',
        title: row.title,
        description,
        imageId: row.image_id ?? undefined,
        showImage: row.show_image,
        answer: row.answer ?? '',
      };

    default:
      return null;
  }
}

/* ---------- Uygulama modeli → satır ---------- */

const refsOf = (slide: Slide): SlideRefs => ({
  imageIds: new Set(slide.images.map((image) => image.id)),
  regionIds: new Set(
    slide.images.flatMap((image) => image.regions.map((region) => region.id))
  ),
});

const imageMeta = (
  image: AnatomyImage,
  slideId: string,
  position: number
): ImageMetaWrite => ({
  id: image.id,
  slide_id: slideId,
  name: image.name,
  width: Math.max(1, Math.round(image.width)),
  height: Math.max(1, Math.round(image.height)),
  position,
});

const regionWrite = (
  region: AnatomyRegion,
  imageId: string,
  position: number
): RegionWrite => ({
  id: region.id,
  image_id: imageId,
  name: region.name,
  type: region.type,
  x: region.type === 'rectangle' ? region.x ?? null : null,
  y: region.type === 'rectangle' ? region.y ?? null : null,
  width: region.type === 'rectangle' ? region.width ?? null : null,
  height: region.type === 'rectangle' ? region.height ?? null : null,
  points: region.type === 'polygon' ? region.points ?? [] : null,
  position,
});

function questionWrite(
  question: Question,
  slideId: string,
  position: number,
  refs: SlideRefs
): QuestionWrite {
  const imageOrNull = (id: string | undefined): string | null =>
    id && refs.imageIds.has(id) ? id : null;

  const base = {
    id: question.id,
    slide_id: slideId,
    type: question.type,
    title: question.title,
    description: question.description ?? null,
    position,
  };

  switch (question.type) {
    case 'multiple_choice':
      return {
        ...base,
        image_id: imageOrNull(question.imageId),
        show_image: Boolean(question.showImage),
        target_region_id: null,
        answer: null,
        answers: null,
        choices: question.choices,
      };

    case 'written':
      return {
        ...base,
        image_id: imageOrNull(question.imageId),
        show_image: Boolean(question.showImage),
        target_region_id: null,
        answer: null,
        answers: question.answers,
        choices: null,
      };

    case 'region':
      return {
        ...base,
        image_id: imageOrNull(question.imageId),
        show_image: true,
        target_region_id: refs.regionIds.has(question.targetRegionId)
          ? question.targetRegionId
          : null,
        answer: null,
        answers: null,
        choices: null,
      };

    case 'flashcard':
      return {
        ...base,
        image_id: imageOrNull(question.imageId),
        show_image: Boolean(question.showImage),
        target_region_id: null,
        answer: question.answer,
        answers: null,
        choices: null,
      };
  }
}

/* ---------- Okuma ---------- */

export async function fetchSlides(): Promise<Slide[]> {
  const [slidesRes, imagesRes, regionsRes, questionsRes] = await Promise.all([
    supabase.from('slides').select('*').order('created_at', { ascending: true }),
    supabase.from('images').select('*').order('position', { ascending: true }),
    supabase.from('regions').select('*').order('position', { ascending: true }),
    supabase.from('questions').select('*').order('position', { ascending: true }),
  ]);

  for (const response of [slidesRes, imagesRes, regionsRes, questionsRes]) {
    if (response.error) {
      throw new Error(response.error.message);
    }
  }

  const slideRows = (slidesRes.data ?? []) as SlideRow[];
  const imageRows = (imagesRes.data ?? []) as ImageRow[];
  const regionRows = (regionsRes.data ?? []) as RegionRow[];
  const questionRows = (questionsRes.data ?? []) as QuestionRow[];

  const imagesBySlide = groupBy(imageRows, (row) => row.slide_id);
  const regionsByImage = groupBy(regionRows, (row) => row.image_id);
  const questionsBySlide = groupBy(questionRows, (row) => row.slide_id);

  return slideRows.map((slideRow): Slide => ({
    id: slideRow.id,
    name: slideRow.name,
    images: [...(imagesBySlide.get(slideRow.id) ?? [])]
      .sort(byPosition)
      .map((imageRow): AnatomyImage => ({
        id: imageRow.id,
        src: imageRow.src,
        name: imageRow.name,
        width: imageRow.width,
        height: imageRow.height,
        regions: [...(regionsByImage.get(imageRow.id) ?? [])]
          .sort(byPosition)
          .map(toRegion),
      })),
    questions: [...(questionsBySlide.get(slideRow.id) ?? [])]
      .sort(byPosition)
      .flatMap((row) => {
        const question = toQuestion(row);
        return question ? [question] : [];
      }),
  }));
}

/* ---------- Yazma (fark hesabı) ---------- */

function buildPlan(prev: Slide[], next: Slide[], userId: string): Plan {
  const plan: Plan = {
    deleteSlides: [],
    deleteImages: [],
    deleteRegions: [],
    deleteQuestions: [],
    slides: [],
    images: [],
    imageMetas: [],
    regions: [],
    questions: [],
    touched: [],
  };

  const prevSlides = indexed(prev);
  const nextSlideIds = new Set(next.map((slide) => slide.id));

  for (const slide of prev) {
    if (!nextSlideIds.has(slide.id)) {
      plan.deleteSlides.push(slide.id);
    }
  }

  for (const slide of next) {
    const old = prevSlides.get(slide.id)?.item;

    if (old === slide) continue;

    let childrenChanged = false;

    if (!old || old.name !== slide.name) {
      plan.slides.push({ id: slide.id, user_id: userId, name: slide.name });
    }

    /* Görseller + bölgeler */
    const oldImages = indexed(old?.images ?? []);
    const newImageIds = new Set(slide.images.map((image) => image.id));

    for (const image of old?.images ?? []) {
      if (!newImageIds.has(image.id)) {
        plan.deleteImages.push(image.id);
        childrenChanged = true;
      }
    }

    for (const [index, image] of slide.images.entries()) {
      const oldEntry = oldImages.get(image.id);
      const oldImage = oldEntry?.item;
      const meta = imageMeta(image, slide.id, index);

      if (!oldEntry || !oldImage || oldImage.src !== image.src) {
        plan.images.push({ ...meta, src: image.src });
        childrenChanged = true;
      } else if (
        json(imageMeta(oldImage, slide.id, oldEntry.index)) !== json(meta)
      ) {
        plan.imageMetas.push(meta);
        childrenChanged = true;
      }

      const oldRegions = indexed(oldImage?.regions ?? []);
      const newRegionIds = new Set(image.regions.map((region) => region.id));

      for (const region of oldImage?.regions ?? []) {
        if (!newRegionIds.has(region.id)) {
          plan.deleteRegions.push(region.id);
          childrenChanged = true;
        }
      }

      for (const [regionIndex, region] of image.regions.entries()) {
        const write = regionWrite(region, image.id, regionIndex);
        const oldRegionEntry = oldRegions.get(region.id);

        if (
          !oldRegionEntry ||
          json(
            regionWrite(oldRegionEntry.item, image.id, oldRegionEntry.index)
          ) !== json(write)
        ) {
          plan.regions.push(write);
          childrenChanged = true;
        }
      }
    }

    /* Sorular */
    const newRefs = refsOf(slide);
    const oldRefs = old ? refsOf(old) : null;
    const oldQuestions = indexed(old?.questions ?? []);
    const newQuestionIds = new Set(slide.questions.map((question) => question.id));

    for (const question of old?.questions ?? []) {
      if (!newQuestionIds.has(question.id)) {
        plan.deleteQuestions.push(question.id);
        childrenChanged = true;
      }
    }

    for (const [index, question] of slide.questions.entries()) {
      const write = questionWrite(question, slide.id, index, newRefs);
      const oldEntry = oldQuestions.get(question.id);

      if (
        !oldEntry ||
        !oldRefs ||
        json(
          questionWrite(oldEntry.item, slide.id, oldEntry.index, oldRefs)
        ) !== json(write)
      ) {
        plan.questions.push(write);
        childrenChanged = true;
      }
    }

    if (old && childrenChanged && old.name === slide.name) {
      plan.touched.push(slide.id);
    }
  }

  return plan;
}

async function removeByIds(
  table: 'slides' | 'images' | 'regions' | 'questions',
  ids: string[]
): Promise<void> {
  for (const part of chunk(ids, 200)) {
    await check(supabase.from(table).delete().in('id', part), `${table} silme`);
  }
}

async function upsertRows(
  table: 'slides' | 'regions' | 'questions',
  rows: readonly object[],
  size: number
): Promise<void> {
  for (const part of chunk(rows, size)) {
    await check(
      supabase.from(table).upsert(part, { onConflict: 'id' }),
      `${table} kaydetme`
    );
  }
}

export async function syncSlides(
  prev: Slide[],
  next: Slide[],
  userId: string
): Promise<void> {
  const plan = buildPlan(prev, next, userId);

  await removeByIds('questions', plan.deleteQuestions);
  await removeByIds('regions', plan.deleteRegions);
  await removeByIds('images', plan.deleteImages);
  await removeByIds('slides', plan.deleteSlides);

  await upsertRows('slides', plan.slides, 100);

  for (const image of plan.images) {
    await check(
      supabase.from('images').upsert(image, { onConflict: 'id' }),
      'images kaydetme'
    );
  }

  for (const meta of plan.imageMetas) {
    await check(
      supabase
        .from('images')
        .update({
          name: meta.name,
          width: meta.width,
          height: meta.height,
          position: meta.position,
        })
        .eq('id', meta.id),
      'images güncelleme'
    );
  }

  await upsertRows('regions', plan.regions, 200);
  await upsertRows('questions', plan.questions, 100);

  for (const id of plan.touched) {
    await check(
      supabase
        .from('slides')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', id),
      'slides güncelleme'
    );
  }
}