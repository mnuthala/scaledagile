import React, { useState, useRef } from 'react';
import { Calendar, Eye } from 'lucide-react';
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

type ViewLevel = 'epic' | 'feature';

export const TimelineView: React.FC = () => {
  const { data, loading, error } = useTimelineData();
  const { vsWidth } = useResponsive();
  const [expandedEpics, setExpandedEpics] = useState<{[key: string]: boolean}>({});
  const [quarterOffset, setQuarterOffset] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(ZOOM.DEFAULT);
  const [viewLevel, setViewLevel] = useState<ViewLevel>('epic');
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

  const handleViewLevelChange = (level: ViewLevel) => {
    setViewLevel(level);
    if (level === 'feature') {
      const allEpicsExpanded: {[key: string]: boolean} = {};
      data?.valueStreams.forEach(vs => {
        vs.epics.forEach(epic => {
          allEpicsExpanded[epic.id] = true;
        });
      });
      setExpandedEpics(allEpicsExpanded);
    }
  };

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

      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">View:</span>
          
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => handleViewLevelChange('epic')}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all
                ${viewLevel === 'epic' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
              title="Show Epic Level"
            >
              <span>Epic</span>
            </button>
            
            <button
              onClick={() => handleViewLevelChange('feature')}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all
                ${viewLevel === 'feature' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
              title="Show Feature Level"
            >
              <span>Feature</span>
            </button>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1.5">
            <span className="font-medium">{data.valueStreams.length}</span>
            <span>Value Streams</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-medium">
              {data.valueStreams.reduce((sum, vs) => sum + vs.epics.length, 0)}
            </span>
            <span>Epics</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-medium">
              {data.valueStreams.reduce((sum, vs) => 
                sum + vs.epics.reduce((eSum, e) => eSum + (e.featureCount || e.features.length), 0), 0
              )}
            </span>
            <span>Features</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-medium">
              {data.valueStreams.reduce((sum, vs) => 
                sum + vs.epics.reduce((eSum, e) => 
                  eSum + e.features.reduce((fSum, f) => fSum + (f.userStoryCount || 0), 0), 0
                ), 0
              )}
            </span>
            <span>User Stories</span>
          </div>
        </div>
      </div>

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