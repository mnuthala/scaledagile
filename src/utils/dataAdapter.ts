/**
 * Data Adapter
 * 
 * Transforms different data formats into the generic work item structure
 */

// Generic work item types (inline to avoid extra file)
export interface GenericWorkItem {
  id: string;
  title: string;
  name?: string;
  iterationStart: string;
  iterationEnd: string;
  state?: string;
  stateCategory?: string;
  workItemType?: string;
  children?: GenericWorkItem[];
  parentId?: string;
  [key: string]: any;
}

export interface ValueStreamData {
  id: string;
  name: string;
  workItems: GenericWorkItem[];
  [key: string]: any;
}

export interface TimelineData {
  valueStreams: ValueStreamData[];
  lastUpdated?: string;
  metadata?: { [key: string]: any };
}

// Legacy format (your current structure)
interface LegacyEpic {
  id: string;
  title: string;
  iterationStart: string;
  iterationEnd: string;
  state?: string;
  features: LegacyFeature[];
  featureCount?: number;
  completedFeatureCount?: number;
}

interface LegacyFeature {
  id: string;
  title: string;
  iterationStart: string;
  iterationEnd: string;
  state?: string;
  userStories?: any[];
  userStoryCount?: number;
  completedUserStoryCount?: number;
}

interface LegacyValueStream {
  id: string;
  name: string;
  epics: LegacyEpic[];
}

interface LegacyTimelineData {
  valueStreams: LegacyValueStream[];
}

/**
 * Transform legacy epic-feature-story structure to generic work items
 */
export function transformLegacyData(legacyData: LegacyTimelineData): TimelineData {
  console.log('transformLegacyData input:', legacyData);
  
  // Defensive checks
  if (!legacyData) {
    console.error('transformLegacyData: legacyData is null or undefined');
    return { valueStreams: [], lastUpdated: new Date().toISOString() };
  }

  if (!legacyData.valueStreams) {
    console.error('transformLegacyData: legacyData.valueStreams is null or undefined');
    return { valueStreams: [], lastUpdated: new Date().toISOString() };
  }

  if (!Array.isArray(legacyData.valueStreams)) {
    console.error('transformLegacyData: legacyData.valueStreams is not an array');
    return { valueStreams: [], lastUpdated: new Date().toISOString() };
  }

  return {
    valueStreams: legacyData.valueStreams.map(vs => {
      if (!vs) {
        console.warn('transformLegacyData: Skipping null/undefined value stream');
        return null;
      }
      return {
        id: vs.id || 'unknown',
        name: vs.name || 'Unnamed Value Stream',
        workItems: (vs.epics && Array.isArray(vs.epics)) 
          ? vs.epics.map(epic => transformEpicToWorkItem(epic)).filter(item => item !== null)
          : []
      };
    }).filter(vs => vs !== null) as ValueStreamData[],
    lastUpdated: new Date().toISOString()
  };
}

function transformEpicToWorkItem(epic: LegacyEpic): GenericWorkItem | null {
  if (!epic) {
    console.warn('transformEpicToWorkItem: epic is null or undefined');
    return null;
  }

  return {
    id: epic.id || `epic-${Date.now()}`,
    title: epic.title || 'Untitled Epic',
    iterationStart: epic.iterationStart || new Date().toISOString(),
    iterationEnd: epic.iterationEnd || new Date().toISOString(),
    state: epic.state,
    workItemType: 'Epic',
    children: (epic.features && Array.isArray(epic.features))
      ? epic.features.map(feature => transformFeatureToWorkItem(feature)).filter(item => item !== null)
      : [],
    // Preserve original data - use these for progress
    featureCount: epic.featureCount,
    completedFeatureCount: epic.completedFeatureCount,
  };
}

function transformFeatureToWorkItem(feature: LegacyFeature): GenericWorkItem | null {
  if (!feature) {
    console.warn('transformFeatureToWorkItem: feature is null or undefined');
    return null;
  }

  return {
    id: feature.id || `feature-${Date.now()}`,
    title: feature.title || 'Untitled Feature',
    iterationStart: feature.iterationStart || new Date().toISOString(),
    iterationEnd: feature.iterationEnd || new Date().toISOString(),
    state: feature.state,
    workItemType: 'Feature',
    children: (feature.userStories && Array.isArray(feature.userStories))
      ? feature.userStories.map(story => {
          if (!story) return null;
          return {
            id: story.id || `story-${Math.random()}`,
            title: story.title || story.name || 'Untitled Story',
            iterationStart: story.iterationStart || feature.iterationStart,
            iterationEnd: story.iterationEnd || feature.iterationEnd,
            state: story.state || story.State,
            stateCategory: story.stateCategory || story.StateCategory,
            workItemType: 'User Story',
          } as GenericWorkItem;
        }).filter((item): item is GenericWorkItem => item !== null)
      : [],
    // Preserve original data
    userStoryCount: feature.userStoryCount,
    completedUserStoryCount: feature.completedUserStoryCount,
  };
}

/**
 * Transform flat list of work items into hierarchical structure
 * Useful when your API returns a flat list with parentId references
 */
export function buildHierarchy(flatItems: GenericWorkItem[]): GenericWorkItem[] {
  const itemMap = new Map<string, GenericWorkItem>();
  const rootItems: GenericWorkItem[] = [];

  // First pass: create map of all items
  flatItems.forEach(item => {
    itemMap.set(item.id, { ...item, children: [] });
  });

  // Second pass: build hierarchy
  flatItems.forEach(item => {
    const workItem = itemMap.get(item.id)!;
    
    if (item.parentId) {
      const parent = itemMap.get(item.parentId);
      if (parent) {
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(workItem);
      } else {
        // Parent not found, treat as root
        rootItems.push(workItem);
      }
    } else {
      // No parent, it's a root item
      rootItems.push(workItem);
    }
  });

  return rootItems;
}

/**
 * Transform Azure DevOps query results
 */
export function transformAzureDevOpsQueryResults(queryResults: any[]): GenericWorkItem[] {
  return queryResults.map(item => ({
    id: item.id?.toString() || item.fields?.['System.Id']?.toString(),
    title: item.fields?.['System.Title'] || 'Untitled',
    iterationStart: item.fields?.['Microsoft.VSTS.Scheduling.StartDate'] || 
                    item.fields?.['System.IterationPath.StartDate'],
    iterationEnd: item.fields?.['Microsoft.VSTS.Scheduling.FinishDate'] || 
                  item.fields?.['System.IterationPath.EndDate'],
    state: item.fields?.['System.State'],
    stateCategory: item.fields?.['System.StateCategory'],
    workItemType: item.fields?.['System.WorkItemType'],
    parentId: item.fields?.['System.Parent']?.toString(),
    assignedTo: item.fields?.['System.AssignedTo']?.displayName,
    priority: item.fields?.['Microsoft.VSTS.Common.Priority'],
    tags: item.fields?.['System.Tags']?.split(';').map((t: string) => t.trim()),
    description: item.fields?.['System.Description'],
    // Include all original fields
    ...item.fields
  }));
}

/**
 * Transform JIRA query results
 */
export function transformJiraQueryResults(jiraIssues: any[]): GenericWorkItem[] {
  return jiraIssues.map(issue => ({
    id: issue.key || issue.id,
    title: issue.fields?.summary || 'Untitled',
    iterationStart: issue.fields?.customfield_startdate || issue.fields?.created,
    iterationEnd: issue.fields?.customfield_enddate || issue.fields?.duedate,
    state: issue.fields?.status?.name,
    stateCategory: issue.fields?.status?.statusCategory?.name,
    workItemType: issue.fields?.issuetype?.name,
    parentId: issue.fields?.parent?.key,
    assignedTo: issue.fields?.assignee?.displayName,
    priority: issue.fields?.priority?.name,
    tags: issue.fields?.labels,
    description: issue.fields?.description,
    // Include all original fields
    ...issue.fields
  }));
}

/**
 * Example usage:
 * 
 * // From legacy format
 * const genericData = transformLegacyData(legacyData);
 * 
 * // From flat Azure DevOps query
 * const adoItems = transformAzureDevOpsQueryResults(queryResults);
 * const hierarchicalItems = buildHierarchy(adoItems);
 * 
 * // From JIRA
 * const jiraItems = transformJiraQueryResults(jiraIssues);
 * const hierarchicalJiraItems = buildHierarchy(jiraItems);
 */