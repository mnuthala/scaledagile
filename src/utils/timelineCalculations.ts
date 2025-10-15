import { CARD_HEIGHTS } from './constants';
import { Epic, Feature } from '../types/timeline.types';

export const calculateBarStyle = (
  start: string,
  end: string,
  timelineStart: Date,
  timelineEnd: Date
) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const totalDays = (timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24);
  const startOffset = (startDate.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24);
  const duration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  
  const minWidth = 2;
  const calculatedWidth = Math.max((duration / totalDays) * 100, minWidth);
  
  if (startDate > timelineEnd || endDate < timelineStart) {
    return { display: 'none' as const };
  }
  
  return {
    left: `${Math.max(0, (startOffset / totalDays) * 100)}%`,
    width: `${calculatedWidth}%`
  };
};

export const getCurrentDatePosition = (today: Date, timelineStart: Date, timelineEnd: Date) => {
  const totalDays = (timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24);
  const currentOffset = (today.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24);
  return `${(currentOffset / totalDays) * 100}%`;
};

export const calculateRowHeight = (vs: any, expandedEpics: { [key: string]: boolean }) => {
  let height = 0;
  vs.epics.forEach((epic: any) => {
    height += CARD_HEIGHTS.EPIC_SPACING;
    if (expandedEpics[epic.id]) {
      height += epic.features.length * CARD_HEIGHTS.FEATURE_SPACING;
    }
  });
  return Math.max(height + CARD_HEIGHTS.BOTTOM_PADDING, CARD_HEIGHTS.MIN_ROW_HEIGHT);
};

export const calculateEpicYOffset = (
  vs: any,
  epicIdx: number,
  expandedEpics: { [key: string]: boolean },
  isItemVisible: (start: string, end: string) => boolean
) => {
  let yOffset = 10;
  for (let i = 0; i < epicIdx; i++) {
    if (isItemVisible(vs.epics[i].iterationStart, vs.epics[i].iterationEnd)) {
      yOffset += CARD_HEIGHTS.EPIC_SPACING;
      if (expandedEpics[vs.epics[i].id]) {
        yOffset += vs.epics[i].features.filter((f: any) => 
          isItemVisible(f.iterationStart, f.iterationEnd)
        ).length * CARD_HEIGHTS.FEATURE_SPACING;
      }
    }
  }
  return yOffset;
};

/**
 * Get user story progress for an Epic or Feature using real data from Azure DevOps
 * @param item - Epic or Feature object from Azure DevOps
 * @param isEpic - Whether the item is an Epic (true) or Feature (false)
 * @returns Object with total and completed user story counts
 */
export const getUserStoryProgress = (
  item: Epic | Feature,
  isEpic: boolean
): { total: number; completed: number } => {
  if (isEpic) {
    // For Epics, sum up all user stories from features
    const epic = item as Epic;
    const total = epic.features.reduce((sum, f) => sum + (f.userStoryCount || 0), 0);
    
    // TODO: To get completion status, you would need to enhance the API to fetch user story states
    // For now, we don't have completion data from the current API
    // You would need to add a query like:
    // SELECT [System.State] FROM WorkItems WHERE [System.WorkItemType] = 'User Story' AND [System.State] = 'Closed'
    const completed = 0;
    
    return { total, completed };
  } else {
    // For Features, use the userStoryCount directly
    const feature = item as Feature;
    const total = feature.userStoryCount || 0;
    
    // TODO: Fetch actual completion status from Azure DevOps
    const completed = 0;
    
    return { total, completed };
  }
};

/**
 * Helper function to get feature count for an Epic
 * @param epic - Epic object
 * @returns Number of features (prioritizes featureCount, falls back to features.length)
 */
export const getFeatureCount = (epic: Epic): number => {
  return epic.featureCount !== undefined ? epic.featureCount : epic.features.length;
};

/**
 * Helper function to get user story count for a Feature
 * @param feature - Feature object
 * @returns Number of user stories
 */
export const getUserStoryCount = (feature: Feature): number => {
  return feature.userStoryCount || 0;
};

/**
 * Calculate total user story count for an Epic (sum across all features)
 * @param epic - Epic object
 * @returns Total number of user stories
 */
export const getTotalUserStoryCount = (epic: Epic): number => {
  return epic.features.reduce((sum, f) => sum + (f.userStoryCount || 0), 0);
};