import React from 'react';
import { TimelineMonth } from '../../types/timeline.types';
import { GenericWorkItem, ValueStreamData } from '../../utils/dataAdapter';
import { WorkItemCard } from './WorkItemCard';
import { TodayIndicator } from './TodayIndicator';
import { MilestoneIndicator } from './MilestoneIndicator';
import { calculateBarStyle } from '../../utils/timelineCalculations';
import { isItemVisible as checkItemVisible } from '../../utils/dateHelpers';
import { CARD_HEIGHTS, COLORS } from '../../utils/constants';
import { useSettings } from './SettingsContext';
import { useMilestones } from './MilestoneContext';

// --- Helper function to extract milestone name from tags ---
function extractMilestoneName(tags?: string[] | string): string | null {
  if (!tags) return null;
  
  const tagsArray = Array.isArray(tags) ? tags : tags.split(';');

  console.log(`Extracting milestone from tags: ${tagsArray.length}`);
  console.log(`Tags is it Array: ${Array.isArray(tags)}`);
  
  for (const tag of tagsArray) {
    const tagLower = tag.toLowerCase().trim();
    console.log(`Checking tag for milestone: ${tagLower}`);
    
    // Check for 'Milestone:' or '#Milestone:' prefix (case insensitive)
    if (tagLower.startsWith('milestone:')) {
      return tag.substring(10).trim(); // Remove 'milestone:' prefix
    }
    if (tagLower.startsWith('#milestone:')) {
      return tag.substring(11).trim(); // Remove '#milestone:' prefix
    }
  }
  
  return null;
}

// --- Helper function to pluralize work item types ---
function pluralize(type: string): string {
  if (!type) return 'items';
  
  const lowerType = type.toLowerCase();
  
  // Handle special cases
  if (lowerType.endsWith('y')) {
    return lowerType.slice(0, -1) + 'ies'; // story -> stories
  }
  if (lowerType.endsWith('s')) {
    return lowerType; // already plural
  }
  
  return lowerType + 's'; // feature -> features, epic -> epics
}

// --- Progress calculation helpers ---
const COMPLETED_STATE_NAMES = new Set([
  'done', 'closed', 'resolved', 'completed', 'shipped', 'released'
]);

function isCompletedState(state: any, stateCategory?: any): boolean {
  const s = (state || '').toString().toLowerCase().trim();
  const cat = (stateCategory || '').toString().toLowerCase().trim();
  if (cat === 'completed' || cat === 'done') return true;
  return COMPLETED_STATE_NAMES.has(s);
}

// --- Helper function to check if item is blocked ---
function isItemBlocked(workItem: GenericWorkItem): boolean {
  // Check state
  if (workItem.state?.toLowerCase() === 'blocked') {
    return true;
  }
  
  // Check tags
  if (workItem.tags) {
    const tagsStr = Array.isArray(workItem.tags) 
      ? workItem.tags.join(',').toLowerCase()
      : String(workItem.tags).toLowerCase();
    
    if (tagsStr.includes('blocked') || tagsStr.includes('#blocked')) {
      return true;
    }
  }
  
  return false;
}

// --- Helper function to check if item or any descendant is blocked ---
function hasBlockedDescendant(workItem: GenericWorkItem): boolean {
  // Check if this item itself is blocked
  if (isItemBlocked(workItem)) {
    return true;
  }
  
  // Recursively check children
  if (workItem.children && workItem.children.length > 0) {
    return workItem.children.some(child => hasBlockedDescendant(child));
  }
  
  return false;
}

function calculateProgress(workItem: GenericWorkItem): { total: number; completed: number } {
  // Use pre-calculated counts if available (more efficient and accurate)
  if (workItem.workItemType === 'Epic') {
    const total = workItem.featureCount ?? workItem.children?.length ?? 0;
    const completed = workItem.completedFeatureCount ?? 0;
    return { total, completed };
  }
  
  if (workItem.workItemType === 'Feature') {
    const total = workItem.userStoryCount ?? workItem.children?.length ?? 0;
    const completed = workItem.completedUserStoryCount ?? workItem.completedStories ?? 0;
    return { total, completed };
  }
  
  // For other types or if counts not available, calculate from direct children
  if (workItem.children && workItem.children.length > 0) {
    let total = 0;
    let completed = 0;
    
    workItem.children.forEach(child => {
      total++;
      // A child is considered "completed" if it's in a completed state
      if (isCompletedState(child.state, child.stateCategory)) {
        completed++;
      }
    });
    
    return { total, completed };
  }

  // Leaf node - check if it's completed
  const isCompleted = isCompletedState(workItem.state, workItem.stateCategory);
  return { total: 1, completed: isCompleted ? 1 : 0 };
}

// --- Work item type detection and configuration ---
interface WorkItemConfig {
  type: 'epic' | 'feature' | 'story' | 'task';
  borderColor: string;
  progressBarColor: string;
  height: number;
  spacing: number;
  showChevron: boolean;
  showProgress: boolean;
}

function getWorkItemTypeKey(workItemType: string): string {
  const lowerType = workItemType.toLowerCase();
  
  if (lowerType === 'epic') return 'epic';
  if (lowerType === 'feature') return 'feature';
  if (lowerType.includes('story') || lowerType.includes('backlog item')) return 'story';
  if (lowerType === 'task') return 'task';
  if (lowerType === 'bug') return 'bug';
  if (lowerType === 'issue') return 'issue';
  if (lowerType === 'milestone') return 'milestone';
  
  return 'task'; // default
}

function getWorkItemConfigWithSettings(
  workItem: GenericWorkItem, 
  borderColors: any
): WorkItemConfig {
  const workItemType = (workItem.workItemType || '').toLowerCase();
  const typeKey = getWorkItemTypeKey(workItem.workItemType || '');
  
  // Get border color from settings
  const borderColor = borderColors[typeKey] || 'border-gray-500';
  // Progress bar color is always green
  const progressBarColor = 'bg-green-500';

  const WORK_ITEM_TYPE_MAP: { [key: string]: Partial<WorkItemConfig> } = {
    'epic': { 
      type: 'epic', 
      borderColor, 
      progressBarColor, 
      height: 100,
      spacing: 110,
      showChevron: true, 
      showProgress: true 
    },
    'feature': { 
      type: 'feature', 
      borderColor, 
      progressBarColor, 
      height: 80,
      spacing: 90,
      showChevron: true, 
      showProgress: true 
    },
    'user story': { type: 'story', borderColor, progressBarColor, height: 50, spacing: 60, showChevron: true, showProgress: true },
    'story': { type: 'story', borderColor, progressBarColor, height: 50, spacing: 60, showChevron: true, showProgress: true },
    'product backlog item': { type: 'story', borderColor, progressBarColor, height: 50, spacing: 60, showChevron: true, showProgress: true },
    'backlog item': { type: 'story', borderColor, progressBarColor, height: 50, spacing: 60, showChevron: true, showProgress: true },
    'task': { type: 'task', borderColor, progressBarColor, height: 35, spacing: 45, showChevron: false, showProgress: false },
    'bug': { type: 'task', borderColor, progressBarColor, height: 35, spacing: 45, showChevron: false, showProgress: false },
    'issue': { type: 'task', borderColor, progressBarColor, height: 35, spacing: 45, showChevron: false, showProgress: false },
    'milestone': { type: 'task', borderColor, progressBarColor, height: 35, spacing: 45, showChevron: false, showProgress: false },
  };
  
  const config = WORK_ITEM_TYPE_MAP[workItemType];
  
  if (config) {
    return {
      type: config.type || 'task',
      borderColor: config.borderColor || 'border-gray-500',
      progressBarColor: config.progressBarColor || progressBarColor,
      height: config.height || 40,
      spacing: config.spacing || 50,
      showChevron: config.showChevron ?? false,
      showProgress: config.showProgress ?? false,
    };
  }

  // Default fallback based on hierarchy level (inferred from children)
  if (workItem.children && workItem.children.length > 0) {
    return {
      type: 'epic',
      borderColor: borderColors.epic || 'border-blue-500',
      progressBarColor,
      height: 100,
      spacing: 110,
      showChevron: true,
      showProgress: true,
    };
  }

  // Default to task-like item
  return {
    type: 'task',
    borderColor: borderColors.task || 'border-gray-500',
    progressBarColor,
    height: 40,
    spacing: 50,
    showChevron: false,
    showProgress: false,
  };
}

// --- Calculate Y offset for work items recursively ---
function calculateWorkItemHeight(
  workItem: GenericWorkItem,
  expandedItems: { [key: string]: boolean },
  isItemVisible: (start: string, end: string) => boolean,
  borderColors: any
): number {
  const config = getWorkItemConfigWithSettings(workItem, borderColors);
  let height = config.spacing;

  if (expandedItems[workItem.id] && workItem.children) {
    workItem.children.forEach(child => {
      if (isItemVisible(child.iterationStart, child.iterationEnd)) {
        height += calculateWorkItemHeight(child, expandedItems, isItemVisible, borderColors);
      }
    });
  }

  return height;
}

function calculateTotalHeight(
  workItems: GenericWorkItem[],
  expandedItems: { [key: string]: boolean },
  isItemVisible: (start: string, end: string) => boolean,
  borderColors: any
): number {
  let totalHeight = 16; // Base padding
  
  workItems.forEach(item => {
    if (isItemVisible(item.iterationStart, item.iterationEnd)) {
      totalHeight += calculateWorkItemHeight(item, expandedItems, isItemVisible, borderColors);
    }
  });

  return Math.max(totalHeight, 100);
}

// --- Recursive work item renderer ---
interface RenderWorkItemsProps {
  workItems: GenericWorkItem[];
  yOffset: number;
  timelineStart: Date;
  timelineEnd: Date;
  expandedItems: { [key: string]: boolean };
  onToggleItem: (itemId: string) => void;
  isItemVisible: (start: string, end: string) => boolean;
  borderColors: any;
  milestones: any[];
}

const RenderWorkItems: React.FC<RenderWorkItemsProps> = ({
  workItems,
  yOffset,
  timelineStart,
  timelineEnd,
  expandedItems,
  onToggleItem,
  isItemVisible,
  borderColors,
  milestones,
}) => {
  let currentOffset = yOffset;

  return (
    <>
      {workItems.map((workItem) => {
        if (!isItemVisible(workItem.iterationStart, workItem.iterationEnd)) {
          return null;
        }

        const config = getWorkItemConfigWithSettings(workItem, borderColors);
        const barStyle = calculateBarStyle(workItem.iterationStart, workItem.iterationEnd, timelineStart, timelineEnd);
        const progress = calculateProgress(workItem);
        const itemYOffset = currentOffset;
        const hasChildren = workItem.children && workItem.children.length > 0;
        const hasBlockedChild = hasBlockedDescendant(workItem);
        
        // Extract milestone name from tags
        const milestoneName = extractMilestoneName(workItem.tags);
        const associatedMilestone = milestoneName 
          ? milestones.find(m => m.name.toLowerCase() === milestoneName.toLowerCase().trim())
          : null;
        
        // Update offset for next item
        currentOffset += config.spacing;
        if (expandedItems[workItem.id] && hasChildren) {
          workItem.children!.forEach(child => {
            if (isItemVisible(child.iterationStart, child.iterationEnd)) {
              currentOffset += calculateWorkItemHeight(child, expandedItems, isItemVisible, borderColors);
            }
          });
        }

        return (
          <div key={workItem.id}>
            <WorkItemCard
              id={workItem.id}
              title={workItem.title || workItem.name || workItem.id}
              iterationStart={workItem.iterationStart}
              iterationEnd={workItem.iterationEnd}
              yOffset={itemYOffset}
              barStyle={barStyle}
              progress={progress}
              isExpanded={expandedItems[workItem.id]}
              onToggle={hasChildren ? () => onToggleItem(workItem.id) : undefined}
              config={config}
              hasBlockedDescendant={hasBlockedChild}
              metadata={{
                state: workItem.state,
                workItemType: workItem.workItemType,
                childCount: workItem.children?.length || 0,
                tags: workItem.tags,
              }}
            />

            {/* Render milestone indicator if associated milestone exists */ console.log(`associatedMilestone : ${associatedMilestone}`)}
            {associatedMilestone && (
              <div 
                className="absolute left-0 right-0 pointer-events-none z-40"
                style={{ top: `${itemYOffset}px`, height: `${config.height}px` }}
              >
                <MilestoneIndicator
                  date={associatedMilestone.date}
                  timelineStart={timelineStart}
                  timelineEnd={timelineEnd}
                  milestoneName={associatedMilestone.name}
                  color={associatedMilestone.color}
                />
              </div>
            )}

            {expandedItems[workItem.id] && hasChildren && (
              <RenderWorkItems
                workItems={workItem.children!}
                yOffset={itemYOffset + config.spacing}
                timelineStart={timelineStart}
                timelineEnd={timelineEnd}
                expandedItems={expandedItems}
                onToggleItem={onToggleItem}
                isItemVisible={isItemVisible}
                borderColors={borderColors}
                milestones={milestones}
              />
            )}
          </div>
        );
      })}
    </>
  );
};

// --- Main ValueStreamRow Component ---
interface ValueStreamRowProps {
  valueStream: ValueStreamData;
  vsWidth: string;
  timeline: TimelineMonth[];
  monthColumnWidth: string;
  expandedItems: { [key: string]: boolean };
  onToggleItem: (itemId: string) => void;
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
  expandedItems,
  onToggleItem,
  today,
  timelineStart,
  timelineEnd,
  getCurrentDatePosition,
}) => {
  const { settings } = useSettings();
  const { milestones } = useMilestones();
  const isItemVisible = (start: string, end: string) => 
    checkItemVisible(start, end, timelineStart, timelineEnd);

  const rowHeight = calculateTotalHeight(
    valueStream.workItems, 
    expandedItems, 
    isItemVisible, 
    settings.borderColors
  );

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

        {settings.showTodayIndicator && today >= timelineStart && today <= timelineEnd && (
          <TodayIndicator position={getCurrentDatePosition()} />
        )}

        <RenderWorkItems
          workItems={valueStream.workItems}
          yOffset={8}
          timelineStart={timelineStart}
          timelineEnd={timelineEnd}
          expandedItems={expandedItems}
          onToggleItem={onToggleItem}
          isItemVisible={isItemVisible}
          borderColors={settings.borderColors}
          milestones={milestones}
        />
      </div>
    </div>
  );
};