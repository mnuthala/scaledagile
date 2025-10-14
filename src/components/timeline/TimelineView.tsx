import React, { useState, useRef } from 'react';
import { Calendar } from 'lucide-react';
import { TimelineHeader } from './TimelineHeader';
import { TimelineGrid } from './TimelineGrid';
import { ValueStreamRow } from './ValueStreamRow';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorMessage } from '../common/ErrorMessage';
import { useTimelineData } from '../../hooks/useTimelineData';
import { useResponsive } from '../../hooks/useResponsive';
import { calculateTimelineRange, generateTimeline, groupTimelineByQuarters } from '../../utils/dateHelpers';
import { getCurrentDatePosition, calculateRowHeight } from '../../utils/timelineCalculations';
import { ZOOM } from '../../utils/constants';

export const TimelineView: React.FC = () => {
  const { data, loading, error } = useTimelineData();
  const { vsWidth } = useResponsive();
  const [expandedEpics, setExpandedEpics] = useState<{[key: string]: boolean}>({});
  const [quarterOffset, setQuarterOffset] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(ZOOM.DEFAULT);
  const timelineRef = useRef<HTMLDivElement>(null);
  const today = new Date();

  const { timelineStart, timelineEnd } = calculateTimelineRange(quarterOffset);
  const timeline = generateTimeline(timelineStart, timelineEnd);
  const quarters = groupTimelineByQuarters(timeline);
  const monthColumnWidth = `${(1 / timeline.length) * 100}%`;

  const toggleEpic = (epicId: string) => {
    setExpandedEpics(prev => ({ ...prev, [epicId]: !prev[epicId] }));
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + ZOOM.STEP, ZOOM.MAX));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - ZOOM.STEP, ZOOM.MIN));
  };

  const handlePreviousQuarter = () => {
    setQuarterOffset(prev => prev - 1);
  };

  const handleNextQuarter = () => {
    setQuarterOffset(prev => prev + 1);
  };

  const handleToday = () => {
    setQuarterOffset(0);
  };

  const getTodayPosition = () => getCurrentDatePosition(today, timelineStart, timelineEnd);

  if (loading) {
    return (
      <div className="w-full h-screen bg-gray-50 overflow-hidden flex flex-col">
        <TimelineHeader
          zoomLevel={zoomLevel}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onPreviousQuarter={handlePreviousQuarter}
          onNextQuarter={handleNextQuarter}
          onToday={handleToday}
        />
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen bg-gray-50 overflow-hidden flex flex-col">
        <TimelineHeader
          zoomLevel={zoomLevel}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onPreviousQuarter={handlePreviousQuarter}
          onNextQuarter={handleNextQuarter}
          onToday={handleToday}
        />
        <ErrorMessage message={error} />
      </div>
    );
  }

  if (data.valueStreams.length === 0) {
    return (
      <div className="w-full h-screen bg-gray-50 overflow-hidden flex flex-col">
        <TimelineHeader
          zoomLevel={zoomLevel}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onPreviousQuarter={handlePreviousQuarter}
          onNextQuarter={handleNextQuarter}
          onToday={handleToday}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-600">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-semibold mb-2">No Data Available</p>
            <p className="text-sm">No epics with valid iterations found in your Azure DevOps project.</p>
            <p className="text-xs mt-2 text-gray-500">Make sure your epics are assigned to iterations with start and end dates.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-gray-50 overflow-hidden flex flex-col">
      <TimelineHeader
        zoomLevel={zoomLevel}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onPreviousQuarter={handlePreviousQuarter}
        onNextQuarter={handleNextQuarter}
        onToday={handleToday}
      />

      <div className="flex-1 overflow-auto relative" ref={timelineRef}>
        <div 
          className="min-w-full"
          style={{ 
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top left',
            width: `${100 / zoomLevel}%`
          }}
        >
          <div className="flex flex-col" style={{ minWidth: '800px' }}>
            <TimelineGrid
              vsWidth={vsWidth}
              quarters={quarters}
              timeline={timeline}
              monthColumnWidth={monthColumnWidth}
              today={today}
              timelineStart={timelineStart}
              timelineEnd={timelineEnd}
              getCurrentDatePosition={getTodayPosition}
            />

            <div className="flex-1">
              {data.valueStreams
                .filter(vs => vs.epics.length > 0)
                .map((vs) => {
                  const rowHeight = calculateRowHeight(vs, expandedEpics);
                  
                  return (
                    <ValueStreamRow
                      key={vs.id}
                      valueStream={vs}
                      vsWidth={vsWidth}
                      timeline={timeline}
                      monthColumnWidth={monthColumnWidth}
                      expandedEpics={expandedEpics}
                      onToggleEpic={toggleEpic}
                      rowHeight={rowHeight}
                      today={today}
                      timelineStart={timelineStart}
                      timelineEnd={timelineEnd}
                      getCurrentDatePosition={getTodayPosition}
                    />
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineView;