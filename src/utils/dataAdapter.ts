// dataAdapter.ts - Updated to handle generic recursive structure

export interface GenericWorkItem {
  id: string;
  title?: string;
  name?: string;
  workItemType: string;
  state?: string;
  stateCategory?: string;
  iterationStart: string;
  iterationEnd: string;
  iterationPath?: string;
  assignedTo?: string;
  children?: GenericWorkItem[];
  
  // Backwards compatibility properties
  featureCount?: number;
  completedFeatureCount?: number;
  userStoryCount?: number;
  completedUserStoryCount?: number;
  completedStories?: number;
}

export interface ValueStreamData {
  id: string;
  name: string;
  workItems: GenericWorkItem[];
}

export interface TimelineData {
  valueStreams: ValueStreamData[];
}

/**
 * Transform legacy data format (epics/features/userStories) to new generic format
 */
export function transformLegacyData(data: any): TimelineData {
  if (!data || !data.valueStreams) {
    return { valueStreams: [] };
  }

  const valueStreams: ValueStreamData[] = data.valueStreams.map((vs: any) => {
    // Check if it's already in the new format (has workItems)
    if (vs.workItems) {
      return {
        id: vs.id,
        name: vs.name,
        workItems: vs.workItems
      };
    }

    // Transform from old format (epics/features/userStories)
    if (vs.epics) {
      const workItems = vs.epics.map((epic: any) => transformEpicToWorkItem(epic));
      return {
        id: vs.id,
        name: vs.name,
        workItems
      };
    }

    return {
      id: vs.id,
      name: vs.name,
      workItems: []
    };
  });

  return { valueStreams };
}

/**
 * Transform old Epic structure to generic WorkItem
 */
function transformEpicToWorkItem(epic: any): GenericWorkItem {
  const workItem: GenericWorkItem = {
    id: epic.id,
    title: epic.title,
    name: epic.name,
    workItemType: epic.workItemType || 'Epic',
    state: epic.state,
    iterationStart: epic.iterationStart,
    iterationEnd: epic.iterationEnd,
    iterationPath: epic.iterationPath,
    assignedTo: epic.assignedTo,
    children: [],
    featureCount: epic.featureCount,
    completedFeatureCount: epic.completedFeatureCount
  };

  // Transform features to children
  if (epic.features && Array.isArray(epic.features)) {
    workItem.children = epic.features.map((feature: any) => transformFeatureToWorkItem(feature));
  }

  return workItem;
}

/**
 * Transform old Feature structure to generic WorkItem
 */
function transformFeatureToWorkItem(feature: any): GenericWorkItem {
  const workItem: GenericWorkItem = {
    id: feature.id,
    title: feature.title,
    name: feature.name,
    workItemType: feature.workItemType || 'Feature',
    state: feature.state,
    iterationStart: feature.iterationStart,
    iterationEnd: feature.iterationEnd,
    iterationPath: feature.iterationPath,
    assignedTo: feature.assignedTo,
    children: [],
    userStoryCount: feature.userStoryCount,
    completedUserStoryCount: feature.completedUserStoryCount
  };

  // Transform user stories to children
  if (feature.userStories && Array.isArray(feature.userStories)) {
    workItem.children = feature.userStories.map((story: any) => transformUserStoryToWorkItem(story));
  }

  return workItem;
}

/**
 * Transform old UserStory structure to generic WorkItem
 */
function transformUserStoryToWorkItem(story: any): GenericWorkItem {
  return {
    id: story.id,
    title: story.title,
    name: story.name,
    workItemType: story.workItemType || 'User Story',
    state: story.state,
    iterationStart: story.iterationStart,
    iterationEnd: story.iterationEnd,
    iterationPath: story.iterationPath,
    assignedTo: story.assignedTo,
    children: []
  };
}

/**
 * Get all work items in a flat list (for filtering, searching, etc.)
 */
export function flattenWorkItems(workItems: GenericWorkItem[]): GenericWorkItem[] {
  const result: GenericWorkItem[] = [];
  
  function flatten(items: GenericWorkItem[]) {
    items.forEach(item => {
      result.push(item);
      if (item.children && item.children.length > 0) {
        flatten(item.children);
      }
    });
  }
  
  flatten(workItems);
  return result;
}

/**
 * Find a work item by ID in the hierarchy
 */
export function findWorkItemById(workItems: GenericWorkItem[], id: string): GenericWorkItem | null {
  for (const item of workItems) {
    if (item.id === id) {
      return item;
    }
    if (item.children && item.children.length > 0) {
      const found = findWorkItemById(item.children, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Get the depth/level of a work item in the hierarchy
 */
export function getWorkItemDepth(workItems: GenericWorkItem[], targetId: string, currentDepth: number = 0): number {
  for (const item of workItems) {
    if (item.id === targetId) {
      return currentDepth;
    }
    if (item.children && item.children.length > 0) {
      const depth = getWorkItemDepth(item.children, targetId, currentDepth + 1);
      if (depth !== -1) return depth;
    }
  }
  return -1;
}