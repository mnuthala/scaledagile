import React from 'react';
import { Feature } from '../../types/timeline.types';
import { UserStoryProgress } from '../../types/timeline.types';
import { COLORS, CARD_HEIGHTS } from '../../utils/constants';

interface FeatureCardProps {
  feature: Feature;
  yOffset: number;
  barStyle: any;
  progress: UserStoryProgress;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  feature,
  yOffset,
  barStyle,
  progress,
}) => {
  if (barStyle.display === 'none') return null;

  const progressPercentage = (progress.completed / progress.total) * 100;

  return (
    <div
      className={`absolute bg-white rounded-lg shadow-md border-l-4 ${COLORS.FEATURE_BORDER} z-10 overflow-hidden`}
      style={{
        ...barStyle,
        top: `${yOffset}px`,
        height: `${CARD_HEIGHTS.FEATURE}px`
      }}
      title={`${feature.title}\nStart: ${new Date(feature.iterationStart).toLocaleDateString()}\nEnd: ${new Date(feature.iterationEnd).toLocaleDateString()}`}
    >
      <div className="px-2 py-1.5 h-full flex flex-col justify-between">
        <div className="flex items-start">
          <span className="text-xs font-medium text-gray-800 truncate flex-1 leading-tight">
            {feature.title}
          </span>
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-0.5">
            <span className="text-xs text-gray-600">
              {progress.completed}/{progress.total} stories
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div 
              className={`${COLORS.FEATURE_PROGRESS} h-1 rounded-full transition-all`}
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};