import React from 'react';
import { ValueStream, TimelineMonth } from '../../types/timeline.types';
import { EpicCard } from './EpicCard';
import { FeatureCard } from './FeatureCard';
import { TodayIndicator } from './TodayIndicator';
import { calculateBarStyle, calculateEpicYOffset, getUserStoryProgress } from '../../utils/timelineCalculations';
import { isItemVisible as checkItemVisible } from '../../utils/dateHelpers';
import { CARD_HEIGHTS } from '../../utils/constants';

interface ValueStreamRowProps {
  valueStream: ValueStream;
  vsWidth: string;
  timeline: TimelineMonth[];
  monthColumnWidth: string;
  expandedEpics: { [key: string]: boolean };
  onToggleEpic: (epicId: string) => void;
  rowHeight: number;
  today: Date;
  timelineStart: Date;
  timelineEnd: Date;
  getCurrentDatePosition: () => string;
}

export const ValueStreamRow: React.FC<ValueStreamRowProps> = ({
  valueStream,
  vsWidth,
  timeline,
  monthColumnWidth,
  expandedEpics,
  onToggleEpic,
  rowHeight,
  today,
  timelineStart,
  timelineEnd,
  getCurrentDatePosition,
}) => {
  const isItemVisible = (start: string, end: string) => 
    checkItemVisible(start, end, timelineStart, timelineEnd);

  return (
    <div 
      className="flex border-b-2 border-gray-400 transition-all duration-300" 
      style={{ minHeight: `${rowHeight}px`, paddingTop: '8px', paddingBottom: '8px' }}
    >
      <div className={`${vsWidth} flex-shrink-0 border-r-2 border-gray-300 bg-blue-100 p-2 sm:p-4 flex items-center justify-center`}>
        <span className="font-semibold text-xs sm:text-sm break-words text-center">
          {valueStream.name}
        </span>
      </div>

      <div className="flex-1 relative bg-white min-w-0">
        <div className="absolute inset-0 flex">
          {timeline.map((month, idx) => (
            <div
              key={idx}
              className="border-r border-gray-200"
              style={{ width: monthColumnWidth }}
            ></div>
          ))}
        </div>

        {today >= timelineStart && today <= timelineEnd && (
          <TodayIndicator position={getCurrentDatePosition()} />
        )}

        {valueStream.epics.map((epic, epicIdx) => {
          if (!isItemVisible(epic.iterationStart, epic.iterationEnd)) {
            return null;
          }

          const yOffset = calculateEpicYOffset(valueStream, epicIdx, expandedEpics, isItemVisible) + 8;
          const barStyle = calculateBarStyle(epic.iterationStart, epic.iterationEnd, timelineStart, timelineEnd);
          const epicProgress = getUserStoryProgress(epic.id, true);

          return (
            <div key={epic.id}>
              <EpicCard
                epic={epic}
                yOffset={yOffset}
                barStyle={barStyle}
                isExpanded={expandedEpics[epic.id]}
                progress={epicProgress}
                onToggle={() => onToggleEpic(epic.id)}
              />

              {expandedEpics[epic.id] && epic.features.map((feature, featureIdx) => {
                if (!isItemVisible(feature.iterationStart, feature.iterationEnd)) {
                  return null;
                }

                const featureBarStyle = calculateBarStyle(
                  feature.iterationStart,
                  feature.iterationEnd,
                  timelineStart,
                  timelineEnd
                );
                const featureProgress = getUserStoryProgress(feature.id, false);
                const featureYOffset = yOffset + CARD_HEIGHTS.EPIC_SPACING + (featureIdx * CARD_HEIGHTS.FEATURE_SPACING);

                return (
                  <FeatureCard
                    key={feature.id}
                    feature={feature}
                    yOffset={featureYOffset}
                    barStyle={featureBarStyle}
                    progress={featureProgress}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};