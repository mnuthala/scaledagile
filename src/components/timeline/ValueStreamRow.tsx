import React from 'react';
import { ValueStream, TimelineMonth } from '../../types/timeline.types';
import { EpicCard } from './EpicCard';
import { FeatureCard } from './FeatureCard';
import { TodayIndicator } from './TodayIndicator';
import { calculateBarStyle, calculateEpicYOffset } from '../../utils/timelineCalculations';
import { isItemVisible as checkItemVisible } from '../../utils/dateHelpers';
import { CARD_HEIGHTS } from '../../utils/constants';

// --- Progress helpers (derive from enriched ADO service data) ---
type AnyFeature = any;
type AnyEpic = any;

const COMPLETED_STATE_NAMES = new Set([
  'done','closed','resolved','completed','shipped','released'
]);

function isCompletedState(state: any, stateCategory?: any): boolean {
  const s = (state || '').toString().toLowerCase().trim();
  const cat = (stateCategory || '').toString().toLowerCase().trim();
  // Prefer category-style flags if provided by the service
  if (cat === 'completed' || cat === 'done') return true;
  return COMPLETED_STATE_NAMES.has(s);
}

function progressForFeature(feature: AnyFeature) {
  const total =
    (typeof feature.userStoryCount === 'number' ? feature.userStoryCount : undefined) ??
    (Array.isArray(feature.userStories) ? feature.userStories.length : undefined) ??
    0;

  const completedFromField =
    feature.completedUserStoryCount ?? feature.completedStories ?? feature.userStoriesCompleted;

  const completed =
    (typeof completedFromField === 'number' ? completedFromField : undefined) ??
    (Array.isArray(feature.userStories)
      ? feature.userStories.filter((s: any) =>
          isCompletedState(s.state || s.State, s.stateCategory || s.StateCategory)
        ).length
      : 0);

  // 🔍 Debug logging (only once per feature)
  console.log(
    `[Feature Progress] ${feature.title || feature.name || feature.id}`,
    {
      total,
      completed,
      completedFromField,
      hasUserStories: Array.isArray(feature.userStories),
      rawStories: Array.isArray(feature.userStories)
        ? feature.userStories.map((s: any) => ({
            id: s.id,
            state: s.state || s.State,
            category: s.stateCategory || s.StateCategory,
          }))
        : undefined,
    }
  );

  return { total, completed };
}


function progressForEpic(epic: AnyEpic) {
  const features: any[] = Array.isArray(epic.features) ? epic.features : [];
  return features.reduce(
    (acc, f) => {
      const p = progressForFeature(f);
      return { total: acc.total + p.total, completed: acc.completed + p.completed };
    },
    { total: 0, completed: 0 }
  );
}


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
          const epicProgress = progressForEpic(epic);

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
                const featureProgress = progressForFeature(feature);
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