import React, { useState, useRef } from 'react';
import { Calendar } from 'lucide-react';
import { TimelineHeader } from './TimelineHeader';
import { TimelineGrid } from './TimelineGrid';
import { TimelineToolbar, ViewLevel } from './TimelineToolbar';
import { SettingsModal } from './SettingsModal';
import { MilestoneModal } from './MilestoneModal';
import { ValueStreamRow } from './ValueStreamRow';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorMessage } from '../common/ErrorMessage';
import { useTimelineData } from '../../hooks/useTimelineData';
import { useResponsive } from '../../hooks/useResponsive';
import { calculateTimelineRange, generateTimeline, groupTimelineByQuarters } from '../../utils/dateHelpers';
import { getCurrentDatePosition } from '../../utils/timelineCalculations';
import { ZOOM } from '../../utils/constants';

type RootWorkItemType = 'Epic' | 'Feature';

// Helper to convert ViewLevel to RootWorkItemType
function getRootWorkItemType(viewLevel: ViewLevel): RootWorkItemType {
  // 'epic' view = Epic root
  // 'feature' view = Feature root
  // 'story' view = Epic root (but expanded)
  return viewLevel === 'feature' ? 'Feature' : 'Epic';
}

export const TimelineView: React.FC = () => {
  const [viewLevel, setViewLevel] = useState<ViewLevel>('epic'); // Default to Epic
  const rootWorkItemType = getRootWorkItemType(viewLevel);
  const { data, loading, error } = useTimelineData(rootWorkItemType);
  const { vsWidth } = useResponsive();
  const [expandedItems, setExpandedItems] = useState<{[key: string]: boolean}>({});
  const [quarterOffset, setQuarterOffset] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(ZOOM.DEFAULT);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMilestonesOpen, setIsMilestonesOpen] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const today = new Date();

  // Add defensive check
  const safeData = data || { valueStreams: [] };
  const valueStreams = safeData.valueStreams || [];

  const { timelineStart, timelineEnd } = calculateTimelineRange(quarterOffset);
  const timeline = generateTimeline(timelineStart, timelineEnd);
  const quarters = groupTimelineByQuarters(timeline);
  const monthColumnWidth = `${(1 / timeline.length) * 100}%`;

  const toggleItem = (itemId: string) => {
    setExpandedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
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
    
    // Determine expand/collapse behavior based on view level
    if (level === 'story') {
      // Story view: Expand everything to show stories
      const allItemsExpanded: {[key: string]: boolean} = {};
      data?.valueStreams.forEach(vs => {
        vs.workItems.forEach(item => {
          allItemsExpanded[item.id] = true;
          // Also expand children if they exist
          if (item.children) {
            item.children.forEach(child => {
              allItemsExpanded[child.id] = true;
            });
          }
        });
      });
      setExpandedItems(allItemsExpanded);
    } else if (level === 'feature' && rootWorkItemType === 'Epic') {
      // Feature view with Epic root: Expand epics to show features
      const topLevelExpanded: {[key: string]: boolean} = {};
      data?.valueStreams.forEach(vs => {
        vs.workItems.forEach(item => {
          topLevelExpanded[item.id] = true;
        });
      });
      setExpandedItems(topLevelExpanded);
    } else {
      // Epic view or Feature root: Collapse all
      setExpandedItems({});
    }
  };

  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
  };

  const handleOpenMilestones = () => {
    setIsMilestonesOpen(true);
  };

  const handleCloseMilestones = () => {
    setIsMilestonesOpen(false);
  };

  // Calculate counts for different work item types
  const calculateCounts = () => {
    let epicsCount = 0;
    let featuresCount = 0;
    let storiesCount = 0;

    valueStreams.forEach(vs => {
      vs.workItems.forEach(item => {
        if (item.workItemType === 'Epic') {
          epicsCount++;
          if (item.children) {
            featuresCount += item.children.length;
            item.children.forEach(child => {
              if (child.children) {
                storiesCount += child.children.length;
              }
            });
          }
        } else if (item.workItemType === 'Feature') {
          featuresCount++;
          if (item.children) {
            storiesCount += item.children.length;
          }
        } else if (item.workItemType === 'User Story') {
          storiesCount++;
        }
      });
    });

    return { epicsCount, featuresCount, storiesCount };
  };

  const { epicsCount, featuresCount, storiesCount } = calculateCounts();

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
        <TimelineToolbar
          viewLevel={viewLevel}
          onViewLevelChange={handleViewLevelChange}
          valueStreamsCount={0}
          workItemsCount={0}
          epicsCount={0}
          featuresCount={0}
          userStoriesCount={0}
          onOpenSettings={handleOpenSettings}
          onOpenMilestones={handleOpenMilestones}
        />
        <LoadingSpinner />
        <SettingsModal isOpen={isSettingsOpen} onClose={handleCloseSettings} />
        <MilestoneModal isOpen={isMilestonesOpen} onClose={handleCloseMilestones} />
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
        <TimelineToolbar
          viewLevel={viewLevel}
          onViewLevelChange={handleViewLevelChange}
          valueStreamsCount={0}
          workItemsCount={0}
          epicsCount={0}
          featuresCount={0}
          userStoriesCount={0}
          onOpenSettings={handleOpenSettings}
          onOpenMilestones={handleOpenMilestones}
        />
        <ErrorMessage message={error} />
        <SettingsModal isOpen={isSettingsOpen} onClose={handleCloseSettings} />
        <MilestoneModal isOpen={isMilestonesOpen} onClose={handleCloseMilestones} />
      </div>
    );
  }

  if (valueStreams.length === 0) {
    const rootTypeName = rootWorkItemType === 'Epic' ? 'epics' : 'features';
    
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
        <TimelineToolbar
          viewLevel={viewLevel}
          onViewLevelChange={handleViewLevelChange}
          valueStreamsCount={0}
          workItemsCount={0}
          epicsCount={0}
          featuresCount={0}
          userStoriesCount={0}
          onOpenSettings={handleOpenSettings}
          onOpenMilestones={handleOpenMilestones}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-600">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-semibold mb-2">No Data Available</p>
            <p className="text-sm">No {rootTypeName} with valid iterations found in your Azure DevOps project.</p>
            <p className="text-xs mt-2 text-gray-500">Make sure your {rootTypeName} are assigned to iterations with start and end dates.</p>
            <p className="text-xs mt-1 text-gray-500">Currently showing: Previous, Current, and Next iterations.</p>
          </div>
        </div>
        <SettingsModal isOpen={isSettingsOpen} onClose={handleCloseSettings} />
        <MilestoneModal isOpen={isMilestonesOpen} onClose={handleCloseMilestones} />
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

      <TimelineToolbar
        viewLevel={viewLevel}
        onViewLevelChange={handleViewLevelChange}
        valueStreamsCount={valueStreams.length}
        workItemsCount={valueStreams.reduce((sum, vs) => sum + vs.workItems.length, 0)}
        epicsCount={epicsCount}
        featuresCount={featuresCount}
        userStoriesCount={storiesCount}
        onOpenSettings={handleOpenSettings}
        onOpenMilestones={handleOpenMilestones}
      />

      <SettingsModal isOpen={isSettingsOpen} onClose={handleCloseSettings} />
      <MilestoneModal isOpen={isMilestonesOpen} onClose={handleCloseMilestones} />

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
              {valueStreams
                .filter(vs => vs.workItems.length > 0)
                .map((vs) => {
                  return (
                    <ValueStreamRow
                      key={vs.id}
                      valueStream={vs}
                      vsWidth={vsWidth}
                      timeline={timeline}
                      monthColumnWidth={monthColumnWidth}
                      expandedItems={expandedItems}
                      onToggleItem={toggleItem}
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