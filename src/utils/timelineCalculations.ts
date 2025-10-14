import { CARD_HEIGHTS } from './constants';

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

export const getUserStoryProgress = (itemId: string, isEpic: boolean) => {
  // TODO: Fetch actual user story data from Azure DevOps
  const total = Math.floor(Math.random() * 20) + 5;
  const completed = Math.floor(Math.random() * total);
  return { total, completed };
};