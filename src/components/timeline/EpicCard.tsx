import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Epic } from '../../types/timeline.types';
import { UserStoryProgress } from '../../types/timeline.types';
import { COLORS, CARD_HEIGHTS } from '../../utils/constants';

interface EpicCardProps {
  epic: Epic;
  yOffset: number;
  barStyle: any;
  isExpanded: boolean;
  progress: UserStoryProgress;
  onToggle: () => void;
}

export const EpicCard: React.FC<EpicCardProps> = ({
  epic,
  yOffset,
  barStyle,
  isExpanded,
  progress,
  onToggle,
}) => {
  if (barStyle.display === 'none') return null;

  const progressPercentage = (progress.completed / progress.total) * 100;

  return (
    <div
      className={`absolute bg-white rounded-lg shadow-md border-l-4 ${COLORS.EPIC_BORDER} cursor-pointer hover:shadow-lg transition-shadow z-10 overflow-hidden`}
      style={{
        ...barStyle,
        top: `${yOffset}px`,
        height: `${CARD_HEIGHTS.EPIC}px`
      }}
      onClick={onToggle}
      title={`${epic.title}\nStart: ${new Date(epic.iterationStart).toLocaleDateString()}\nEnd: ${new Date(epic.iterationEnd).toLocaleDateString()}`}
    >
      <div className="px-2 py-2 h-full flex flex-col">
        <div className="flex items-start gap-1 mb-2">
          {isExpanded ? (
            <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 text-gray-600 mt-0.5" />
          ) : (
            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 text-gray-600 mt-0.5" />
          )}
          <span className="text-xs sm:text-sm font-semibold text-gray-800 truncate flex-1 leading-tight">
            {epic.title}
          </span>
        </div>
        
        <div className="mt-auto">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-600">
              {progress.completed}/{progress.total} stories
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1 mb-1">
            <div 
              className={`${COLORS.EPIC_PROGRESS} h-1 rounded-full transition-all`}
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};