import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from 'react';

interface ImageBoxRect {
  /** Rendered image box relative to the stage, expressed as percentages. */
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
}

interface ImageStageProps {
  imageSrc: string;
  alt: string;
  /** Overlay content positioned exactly over the visible image area. */
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Optional cap so very tall/wide images don't dominate the layout. */
  maxHeight?: number | string;
  background?: string;
  cursor?: CSSProperties['cursor'];
  onOverlayPointerDown?: (
    event: PointerEvent<HTMLDivElement>
  ) => void;
  onOverlayPointerMove?: (
    event: PointerEvent<HTMLDivElement>
  ) => void;
  onOverlayPointerUp?: (
    event: PointerEvent<HTMLDivElement>
  ) => void;
  overlayRef?: Ref<HTMLDivElement>;
}

const DEFAULT_RECT: ImageBoxRect = {
  leftPct: 0,
  topPct: 0,
  widthPct: 100,
  heightPct: 100,
};

/**
 * Renders an image using object-fit: contain and keeps an overlay
 * perfectly aligned with the actually visible image area.
 */
export function ImageStage({
  imageSrc,
  alt,
  children,
  className,
  style,
  maxHeight,
  background = '#f1f5f9',
  cursor,
  onOverlayPointerDown,
  onOverlayPointerMove,
  onOverlayPointerUp,
  overlayRef,
}: ImageStageProps) {
  const containerRef =
    useRef<HTMLDivElement | null>(null);

  const imgRef =
    useRef<HTMLImageElement | null>(null);

  const [rect, setRect] =
    useState<ImageBoxRect>(DEFAULT_RECT);

  const recompute = useCallback(() => {
    const container = containerRef.current;
    const image = imgRef.current;

    if (!container || !image) {
      return;
    }

    const naturalWidth = image.naturalWidth;
    const naturalHeight = image.naturalHeight;

    if (!naturalWidth || !naturalHeight) {
      return;
    }

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    if (!containerWidth || !containerHeight) {
      return;
    }

    /*
     * Same calculation as CSS object-fit: contain:
     * the image is scaled until it completely fits inside
     * the available container without changing its aspect ratio.
     */
    const scale = Math.min(
      containerWidth / naturalWidth,
      containerHeight / naturalHeight
    );

    const renderedWidth =
      naturalWidth * scale;

    const renderedHeight =
      naturalHeight * scale;

    const offsetX =
      (containerWidth - renderedWidth) / 2;

    const offsetY =
      (containerHeight - renderedHeight) / 2;

    setRect({
      leftPct:
        (offsetX / containerWidth) * 100,
      topPct:
        (offsetY / containerHeight) * 100,
      widthPct:
        (renderedWidth / containerWidth) * 100,
      heightPct:
        (renderedHeight / containerHeight) * 100,
    });
  }, []);

  useLayoutEffect(() => {
    recompute();
  }, [imageSrc, recompute]);

  useEffect(() => {
    const container = containerRef.current;

    if (
      !container ||
      typeof ResizeObserver === 'undefined'
    ) {
      return;
    }

    const observer = new ResizeObserver(() => {
      recompute();
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [recompute]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        maxHeight,
        background,
        borderRadius: 'inherit',
        overflow: 'hidden',
        ...style,
      }}
    >
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        draggable={false}
        onLoad={recompute}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />

      <div
        ref={overlayRef}
        onPointerDown={onOverlayPointerDown}
        onPointerMove={onOverlayPointerMove}
        onPointerUp={onOverlayPointerUp}
        style={{
          position: 'absolute',
          left: `${rect.leftPct}%`,
          top: `${rect.topPct}%`,
          width: `${rect.widthPct}%`,
          height: `${rect.heightPct}%`,
          cursor,
          touchAction: cursor
            ? 'none'
            : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}