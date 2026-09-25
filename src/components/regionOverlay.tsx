import type { AnatomyImage, AnatomyRegion } from '../types/anatomy';

interface Props {
  image?: AnatomyImage;
  selectedRegionId?: string | null;
  targetRegionId?: string | null;
  hasAnswered?: boolean;
  onRegionClick?: (regionId: string) => void;
}

export const RegionOverlay = ({
  image,
  selectedRegionId,
  targetRegionId,
  hasAnswered = false,
  onRegionClick,
}: Props) => {
  if (!image) {
    return (
      <div className="region-image-missing">
        Bu soru için görsel bulunamadı.
      </div>
    );
  }

  const getRegionClassName = (region: AnatomyRegion) => {
    const isTarget = region.id === targetRegionId;
    const isSelected = region.id === selectedRegionId;

    if (!hasAnswered) {
      return `natural-region ${
        isSelected ? 'selected' : ''
      }`;
    }

    return `natural-region ${
      isTarget
        ? 'correct'
        : isSelected
          ? 'wrong'
          : 'muted'
    }`;
  };

  const handleRegionClick = (regionId: string) => {
    if (hasAnswered) {
      return;
    }

    onRegionClick?.(regionId);
  };

  return (
    <div
      className="region-overlay-wrapper natural-region-wrapper"
      style={{
        aspectRatio: `${image.width} / ${image.height}`,
      }}
    >
      <img
        src={image.src}
        alt={image.name}
        draggable={false}
      />

      <svg
        viewBox={`0 0 ${image.width} ${image.height}`}
        preserveAspectRatio="none"
        aria-label="Anatomi bölgeleri"
      >
        {image.regions.map((region) => {
          if (
            region.type === 'rectangle' &&
            region.x !== undefined &&
            region.y !== undefined &&
            region.width !== undefined &&
            region.height !== undefined
          ) {
            return (
              <rect
                key={region.id}
                x={region.x}
                y={region.y}
                width={region.width}
                height={region.height}
                className={getRegionClassName(region)}
                onClick={() =>
                  handleRegionClick(region.id)
                }
              />
            );
          }

          if (
            region.type === 'polygon' &&
            region.points
          ) {
            return (
              <polygon
                key={region.id}
                points={region.points
                  .map(
                    (point) =>
                      `${point.x},${point.y}`
                  )
                  .join(' ')}
                className={getRegionClassName(region)}
                onClick={() =>
                  handleRegionClick(region.id)
                }
              />
            );
          }

          return null;
        })}
      </svg>
    </div>
  );
};