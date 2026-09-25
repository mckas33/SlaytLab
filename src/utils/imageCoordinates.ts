import type { Point } from '../types/anatomy';

export interface ImageMetrics {
  scale: number;
  renderedWidth: number;
  renderedHeight: number;
  offsetX: number;
  offsetY: number;
}

export function getContainedImageMetrics(containerWidth: number, containerHeight: number, naturalWidth: number, naturalHeight: number): ImageMetrics {
  const scale = Math.min(containerWidth / naturalWidth, containerHeight / naturalHeight);
  const renderedWidth = naturalWidth * scale;
  const renderedHeight = naturalHeight * scale;
  return { scale, renderedWidth, renderedHeight, offsetX: (containerWidth - renderedWidth) / 2, offsetY: (containerHeight - renderedHeight) / 2 };
}

export function clientToNaturalPoint(clientX: number, clientY: number, rect: DOMRect, naturalWidth: number, naturalHeight: number): Point {
  const metrics = getContainedImageMetrics(rect.width, rect.height, naturalWidth, naturalHeight);
  const x = Math.max(0, Math.min(naturalWidth, (clientX - rect.left - metrics.offsetX) / metrics.scale));
  const y = Math.max(0, Math.min(naturalHeight, (clientY - rect.top - metrics.offsetY) / metrics.scale));
  return { x, y };
}