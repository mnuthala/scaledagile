import React from 'react';
import { TimelineMonth, Quarter } from '../../types/timeline.types';
import { TodayIndicator } from './TodayIndicator';
import { useSettings } from './SettingsContext';

interface TimelineGridProps {
  vsWidth: string;
  quarters: { [key: string]: Quarter };
  timeline: TimelineMonth[];
  monthColumnWidth: string;
  today: Date;
  timelineStart: Date;
  timelineEnd: Date;
  getCurrentDatePosition: () => string;
}

export const TimelineGrid: React.FC<TimelineGridProps> = ({
  vsWidth,
  quarters,
  timeline,
  monthColumnWidth,
  today,
  timelineStart,
  timelineEnd,
  getCurrentDatePosition,
}) => {
  const { settings } = useSettings();

  return (
    <div className="sticky top-0 z-20 bg-white border-b-2 border-gray-300 flex">
      <div className={`${vsWidth} flex-shrink-0 border-r-2 border-gray-300 bg-gray-100 p-2 font-semibold text-sm flex items-center justify-center`}>
        Value Stream
      </div>
      <div className="flex-1 min-w-0 relative">
        <div className="flex border-b border-gray-200">
          {Object.values(quarters).map((q: Quarter, idx: number) => (
            <div
              key={idx}
              className="border-r border-gray-200 bg-blue-50 p-1 sm:p-2 text-center font-semibold text-xs sm:text-sm"
              style={{ width: `${(q.months.length / timeline.length) * 100}%` }}
            >
              <span className="hidden sm:inline">Q{q.quarter} {q.year}</span>
              <span className="sm:hidden">Q{q.quarter}</span>
            </div>
          ))}
        </div>

        <div className="flex">
          {timeline.map((item, idx) => (
            <div
              key={idx}
              className="border-r border-gray-200 bg-gray-50 p-1 sm:p-2 text-center text-xs sm:text-sm"
              style={{ width: monthColumnWidth }}
            >
              {item.monthName}
            </div>
          ))}
        </div>

        {settings.showTodayIndicator && today >= timelineStart && today <= timelineEnd && (
          <TodayIndicator position={getCurrentDatePosition()} showLabel={true} />
        )}
      </div>
    </div>
  );
};