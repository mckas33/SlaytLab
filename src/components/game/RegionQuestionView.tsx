import type { AnatomyImage } from '../../types/anatomy';

import { RegionOverlay } from '../regionOverlay';

interface Props {
  image?: AnatomyImage;
  targetRegionId: string;
  selected: string | null;
  answered: boolean;
  onAnswer: (
    correct: boolean,
    id: string
  ) => void;
}

export default function RegionQuestionView({
  image,
  targetRegionId,
  selected,
  answered,
  onAnswer,
}: Props) {
  return (
    <div className="game-question-view region-question-view">
      <RegionOverlay
        image={image}
        selectedRegionId={selected}
        targetRegionId={targetRegionId}
        hasAnswered={answered}
        onRegionClick={(id) =>
          onAnswer(
            id === targetRegionId,
            id
          )
        }
      />
    </div>
  );
}