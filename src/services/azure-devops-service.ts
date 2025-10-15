// azure-devops-service.ts - Refactored with reusable functions

export type { Epic, Feature, ValueStream } from '@types/timeline.types';

import * as SDK from 'azure-devops-extension-sdk';
import { WorkItemTrackingRestClient, TreeStructureGroup } from 'azure-devops-extension-api/WorkItemTracking';
import { getClient } from 'azure-devops-extension-api';

// ============================================================================
// CONSTANTS
// ============================================================================

const COMPLETED_STATES = new Set([
  'Done', 
  'Closed', 
  'Resolved', 
  'Completed'
]);

const WORK_ITEM_FIELDS = [
  'System.Id',
  'System.Title',
  'System.State',
  'System.IterationPath',
  'System.AreaPath',
  'System.WorkItemType',
  'System.TeamProject'
];

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface WorkItemHierarchy {
  id: string;
  title: string;
  state: string;
  iterationStart: string;
  iterationEnd: string;
  children?: WorkItemHierarchy[];
  [key: string]: any;
}

interface IterationDates {
  startDate: string;
  finishDate: string;
}

// ============================================================================
// COMPLETION CALCULATION
// ============================================================================

function isCompletedState(state: string): boolean {
  return COMPLETED_STATES.has(state);
}

function calculateCompletionFromChildren(workItem: any): { total: number; completed: number } {
  // If this item has children (features or user stories), calculate from them
  if (workItem.features && workItem.features.length > 0) {
    let completed = 0;
    for (const feature of workItem.features) {
      if (feature.state && isCompletedState(feature.state)) {
        completed++;
      }
    }
    return { total: workItem.features.length, completed };
  }
  
  if (workItem.userStories && workItem.userStories.length > 0) {
    let completed = 0;
    for (const story of workItem.userStories) {
      if (story.state && isCompletedState(story.state)) {
        completed++;
      }
    }
    return { total: workItem.userStories.length, completed };
  }
  
  // Leaf node - check if it's completed
  const isCompleted = workItem.state && isCompletedState(workItem.state);
  return { total: 1, completed: isCompleted ? 1 : 0 };
}

function updateCompletionCounts(valueStreams: any[]): void {
  for (const vs of valueStreams) {
    if (vs.epics && vs.epics.length > 0) {
      for (const epic of vs.epics) {
        // Update feature completion counts
        const epicCounts = calculateCompletionFromChildren(epic);
        epic.featureCount = epicCounts.total;
        epic.completedFeatureCount = epicCounts.completed;
        
        // Update user story completion counts for each feature
        if (epic.features && epic.features.length > 0) {
          for (const feature of epic.features) {
            const featureCounts = calculateCompletionFromChildren(feature);
            feature.userStoryCount = featureCounts.total;
            feature.completedUserStoryCount = featureCounts.completed;
          }
        }
      }
    }
  }
}

// ============================================================================
// ITERATION HELPERS
// ============================================================================

function extractIterationsFromNode(
  node: any, 
  projectName: string, 
  parentPath: string = ''
): Map<string, IterationDates> {
  const iterationMap = new Map<string, IterationDates>();
  
  if (!node) return iterationMap;
  
  let currentPath: string;
  if (!parentPath) {
    currentPath = node.name;
  } else {
    currentPath = `${parentPath}\\${node.name}`;
  }
  
  if (node.attributes && node.attributes.startDate && node.attributes.finishDate) {
    const dates: IterationDates = {
      startDate: node.attributes.startDate,
      finishDate: node.attributes.finishDate
    };
    
    iterationMap.set(currentPath, dates);
    
    const pathWithoutProject = currentPath.replace(`${projectName}\\`, '');
    if (pathWithoutProject !== currentPath) {
      iterationMap.set(pathWithoutProject, dates);
    }
    
    iterationMap.set(node.name, dates);
  }
  
  if (node.children && Array.isArray(node.children)) {
    for (const child of node.children) {
      const childIterations = extractIterationsFromNode(child, projectName, currentPath);
      childIterations.forEach((value, key) => {
        iterationMap.set(key, value);
      });
    }
  }
  
  return iterationMap;
}

function normalizeIterationPath(iterationPath: string, projectName: string): string[] {
  const variations: string[] = [];
  variations.push(iterationPath);
  
  if (!iterationPath.startsWith(projectName)) {
    variations.push(`${projectName}\\${iterationPath}`);
  }
  
  if (iterationPath.startsWith(`${projectName}\\`)) {
    variations.push(iterationPath.substring(projectName.length + 1));
  }
  
  return variations;
}

function findIterationDates(
  iterationPath: string, 
  projectName: string, 
  iterationMap: Map<string, IterationDates>
): IterationDates | undefined {
  const variations = normalizeIterationPath(iterationPath, projectName);
  
  for (const variation of variations) {
    const dates = iterationMap.get(variation);
    if (dates) {
      return dates;
    }
  }
  
  return undefined;
}

// ============================================================================
// WIQL QUERY BUILDERS
// ============================================================================

function buildChildWorkItemQuery(
  parentId: number,
  childWorkItemType: string,
  projectName: string
): any {
  return {
    query: `SELECT [System.Id]
            FROM WorkItemLinks
            WHERE [Source].[System.Id] = ${parentId}
            AND [System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward'
            AND [Target].[System.WorkItemType] = '${childWorkItemType}'
            AND [Target].[System.TeamProject] = '${projectName}'
            MODE (MustContain)`
  };
}

function buildEpicFeatureQuery(projectName: string): any {
  return {
    /** query: `SELECT [System.Id]
            FROM WorkItemLinks
            WHERE [Source].[System.TeamProject] = '${projectName}'
            AND [Source].[System.WorkItemType] = 'Epic'
            AND [Source].[System.State] <> 'Closed'
            AND [System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward'
            AND [Target].[System.WorkItemType] = 'Feature'
            AND [Target].[System.TeamProject] = '${projectName}'
            MODE (MustContain)` */
    query: `SELECT [System.Id]
            FROM WorkItemLinks
            WHERE 
              (
                [Source].[System.WorkItemType] = 'Epic'
                AND [Source].[System.State] <> 'Closed'
                AND [Source].[System.TeamProject] = '${projectName}'
              )
              AND (
                [System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward'
              )
              AND (
                [Target].[System.WorkItemType] <> ''
                AND [Target].[System.TeamProject] = '${projectName}'
              )
            MODE (Recursive, ReturnMatchingChildren)`
  };
}

// ============================================================================
// REST API FUNCTIONS (Local/PAT Mode)
// ============================================================================

async function fetchWorkItemsByIds(
  orgUrl: string,
  project: string,
  ids: number[],
  headers: any
): Promise<any[]> {
  if (ids.length === 0) return [];
  
  const url = `${orgUrl}/${project}/_apis/wit/workitems?ids=${ids.join(',')}&fields=${WORK_ITEM_FIELDS.join(',')}&api-version=7.0`;
  const response = await fetch(url, { headers });
  const data = await response.json();
  
  return data.value || [];
}

async function queryChildWorkItemIds(
  orgUrl: string,
  project: string,
  parentId: number,
  childWorkItemType: string,
  headers: any
): Promise<number[]> {
  const wiqlUrl = `${orgUrl}/${project}/_apis/wit/wiql?api-version=7.0`;
  const query = buildChildWorkItemQuery(parentId, childWorkItemType, project);
  
  const response = await fetch(wiqlUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(query)
  });
  
  const result = await response.json();
  const relations = result.workItemRelations || [];
  
  const childIds: number[] = [];
  for (const rel of relations) {
    if (rel.target && rel.target.id !== parentId) {
      childIds.push(rel.target.id);
    }
  }
  
  return childIds;
}

async function fetchChildWorkItems(
  orgUrl: string,
  project: string,
  parentId: number,
  childWorkItemType: string,
  headers: any,
  iterationMap: Map<string, IterationDates>
): Promise<any[]> {
  const childIds = await queryChildWorkItemIds(orgUrl, project, parentId, childWorkItemType, headers);
  if (childIds.length === 0) return [];
  
  const workItems = await fetchWorkItemsByIds(orgUrl, project, childIds, headers);
  const projectWorkItems = workItems.filter(wi => wi.fields['System.TeamProject'] === project);
  
  const result: any[] = [];
  
  for (const wi of projectWorkItems) {
    const iterationPath = wi.fields['System.IterationPath'];
    if (!iterationPath) continue;
    
    const iterationDates = findIterationDates(iterationPath, project, iterationMap);
    if (!iterationDates) continue;
    
    result.push({
      id: wi.id.toString(),
      title: wi.fields['System.Title'],
      state: wi.fields['System.State'],
      iterationStart: iterationDates.startDate,
      iterationEnd: iterationDates.finishDate
    });
  }
  
  return result;
}

async function fetchClassificationNodes(
  orgUrl: string,
  project: string,
  headers: any
): Promise<Map<string, IterationDates>> {
  const url = `${orgUrl}/${project}/_apis/wit/classificationnodes/iterations?$depth=10&api-version=7.0`;
  const response = await fetch(url, { headers });
  const data = await response.json();
  
  return extractIterationsFromNode(data, project);
}

// ============================================================================
// SDK FUNCTIONS (Extension Mode)
// ============================================================================

async function fetchWorkItemsByIdsSDK(
  client: WorkItemTrackingRestClient,
  projectId: string,
  ids: number[]
): Promise<any[]> {
  if (ids.length === 0) return [];
  
  return await client.getWorkItems(ids, projectId, WORK_ITEM_FIELDS);
}

async function queryChildWorkItemIdsSDK(
  client: WorkItemTrackingRestClient,
  projectId: string,
  parentId: number,
  childWorkItemType: string,
  projectName: string
): Promise<number[]> {
  const query = buildChildWorkItemQuery(parentId, childWorkItemType, projectName);
  const result = await client.queryByWiql(query, projectId);
  const relations = result.workItemRelations || [];
  
  const childIds: number[] = [];
  for (const rel of relations) {
    if (rel.target && rel.target.id && rel.target.id !== parentId) {
      childIds.push(rel.target.id);
    }
  }
  
  return childIds;
}

async function fetchChildWorkItemsSDK(
  client: WorkItemTrackingRestClient,
  projectId: string,
  projectName: string,
  parentId: number,
  childWorkItemType: string,
  iterationMap: Map<string, IterationDates>
): Promise<any[]> {
  const childIds = await queryChildWorkItemIdsSDK(client, projectId, parentId, childWorkItemType, projectName);
  if (childIds.length === 0) return [];
  
  const workItems = await fetchWorkItemsByIdsSDK(client, projectId, childIds);
  
  const result: any[] = [];
  
  for (const wi of workItems) {
    const iterationPath = wi.fields['System.IterationPath'];
    if (!iterationPath) continue;
    
    const iterationDates = findIterationDates(iterationPath, projectName, iterationMap);
    if (!iterationDates) continue;
    
    result.push({
      id: wi.id!.toString(),
      title: wi.fields['System.Title'],
      state: wi.fields['System.State'],
      iterationStart: iterationDates.startDate,
      iterationEnd: iterationDates.finishDate
    });
  }
  
  return result;
}

async function fetchClassificationNodesSDK(
  client: WorkItemTrackingRestClient,
  projectId: string,
  projectName: string
): Promise<Map<string, IterationDates>> {
  try {
    const classificationNode = await client.getClassificationNode(
      projectId, 
      TreeStructureGroup.Iterations, 
      undefined, 
      10
    );
    
    return extractIterationsFromNode(classificationNode, projectName);
  } catch (error) {
    console.error('Error fetching classification nodes:', error);
    return new Map();
  }
}

// ============================================================================
// MAIN FETCH FUNCTIONS
// ============================================================================

export async function fetchWorkItemsLocal(
  orgUrl: string,
  project: string,
  pat: string
): Promise<ValueStream[]> {
  const auth = btoa(`:${pat}`);
  const headers = {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json'
  };

  console.log('=== Starting Work Items Fetch (Local) ===');

  // Fetch iteration dates
  const iterationMap = await fetchClassificationNodes(orgUrl, project, headers);

  // Query for Epic-Feature relationships
  const wiqlUrl = `${orgUrl}/${project}/_apis/wit/wiql?api-version=7.0`;
  const epicFeatureQuery = buildEpicFeatureQuery(project);
  
  const queryResponse = await fetch(wiqlUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(epicFeatureQuery)
  });

  const queryResult = await queryResponse.json();
  const epicRelations = queryResult.workItemRelations || [];
  
  if (epicRelations.length === 0) {
    return [];
  }

  // Extract Epic IDs and Epic-Feature mappings
  const epicIdsSet = new Set<number>();
  const epicFeatureMap = new Map<number, number[]>();
  
  for (const rel of epicRelations) {
    if (rel.source) {
      const epicId = rel.source.id;
      epicIdsSet.add(epicId);
      
      if (!epicFeatureMap.has(epicId)) {
        epicFeatureMap.set(epicId, []);
      }
      
      if (rel.target && rel.target.id !== epicId) {
        epicFeatureMap.get(epicId)!.push(rel.target.id);
      }
    }
  }
  
  // Fetch Epic details
  const epicIds = Array.from(epicIdsSet);
  const epics = await fetchWorkItemsByIds(orgUrl, project, epicIds, headers);
  const projectEpics = epics.filter(wi => wi.fields['System.TeamProject'] === project);

  const valueStreamMap = new Map<string, any[]>();

  // Build Epic hierarchy
  for (const wi of projectEpics) {
    const iterationPath = wi.fields['System.IterationPath'];
    const areaPath = wi.fields['System.AreaPath'];
    const state = wi.fields['System.State'];
    
    if (!iterationPath) continue;
    
    const iterationDates = findIterationDates(iterationPath, project, iterationMap);
    if (!iterationDates) continue;
    
    const epic: any = {
      id: wi.id.toString(),
      title: wi.fields['System.Title'],
      state: state,
      iterationStart: iterationDates.startDate,
      iterationEnd: iterationDates.finishDate,
      features: [],
      featureCount: 0,
      completedFeatureCount: 0
    };

    // Fetch Features for this Epic
    const featureIds = epicFeatureMap.get(wi.id) || [];
    if (featureIds.length > 0) {
      const features = await fetchWorkItemsByIds(orgUrl, project, featureIds, headers);
      const projectFeatures = features.filter(f => f.fields['System.TeamProject'] === project);

      for (const f of projectFeatures) {
        const featureIterationPath = f.fields['System.IterationPath'];
        const featureState = f.fields['System.State'];
        
        if (!featureIterationPath) continue;
        
        const featureIterationDates = findIterationDates(featureIterationPath, project, iterationMap);
        if (!featureIterationDates) continue;
        
        const feature: any = {
          id: f.id.toString(),
          title: f.fields['System.Title'],
          state: featureState,
          iterationStart: featureIterationDates.startDate,
          iterationEnd: featureIterationDates.finishDate,
          userStories: [],
          userStoryCount: 0,
          completedUserStoryCount: 0
        };
        
        // Fetch User Stories for this Feature
        feature.userStories = await fetchChildWorkItems(
          orgUrl,
          project,
          f.id,
          'User Story',
          headers,
          iterationMap
        );
        
        epic.features.push(feature);
      }
    }

    if (!valueStreamMap.has(areaPath)) {
      valueStreamMap.set(areaPath, []);
    }
    valueStreamMap.get(areaPath)!.push(epic);
  }

  const result = Array.from(valueStreamMap.entries())
    .filter(([_, epics]) => epics.length > 0)
    .map(([name, epics]) => ({
      id: name.replace(/[^a-zA-Z0-9]/g, '-'),
      name: name.split('\\').pop() || name,
      epics
    }));

  // Calculate completion counts
  console.log('=== Calculating completion counts ===');
  updateCompletionCounts(result);

  return result;
}

export async function fetchWorkItemsFromQuery(queryGuid: string): Promise<ValueStream[]> {
  const client = getClient(WorkItemTrackingRestClient);
  const projectService = await SDK.getService('ms.vss-tfs-web.tfs-page-data-service');
  const projectData = await (projectService as any).getPageData();
  const projectId = projectData.project.id;
  const projectName = projectData.project.name;

  console.log('=== Starting Work Items Fetch (SDK) ===');

  // Fetch iteration dates
  const iterationMap = await fetchClassificationNodesSDK(client, projectId, projectName);

  // Get work items from query
  const queryResult = await client.queryById(queryGuid, projectId);
  
  if (!queryResult.workItems || queryResult.workItems.length === 0) {
    return [];
  }

  const workItemIds = queryResult.workItems.map(wi => wi.id!);
  const workItems = await fetchWorkItemsByIdsSDK(client, projectId, workItemIds);

  const projectWorkItems = workItems.filter(wi => wi.fields['System.TeamProject'] === projectName);
  const epics = projectWorkItems.filter(wi => wi.fields['System.WorkItemType'] === 'Epic');
  
  const valueStreamMap = new Map<string, any[]>();

  // Build Epic hierarchy
  for (const epicWi of epics) {
    const iterationPath = epicWi.fields['System.IterationPath'];
    const areaPath = epicWi.fields['System.AreaPath'];
    const state = epicWi.fields['System.State'];
    
    if (!iterationPath) continue;
    
    const iterationData = findIterationDates(iterationPath, projectName, iterationMap);
    if (!iterationData) continue;
    
    const epic: any = {
      id: epicWi.id!.toString(),
      title: epicWi.fields['System.Title'],
      state: state,
      iterationStart: iterationData.startDate,
      iterationEnd: iterationData.finishDate,
      features: [],
      featureCount: 0,
      completedFeatureCount: 0
    };

    // Fetch Features for this Epic
    const features = await fetchChildWorkItemsSDK(
      client,
      projectId,
      projectName,
      epicWi.id!,
      'Feature',
      iterationMap
    );

    for (const feature of features) {
      feature.userStories = [];
      feature.userStoryCount = 0;
      feature.completedUserStoryCount = 0;
      
      // Fetch User Stories for this Feature
      feature.userStories = await fetchChildWorkItemsSDK(
        client,
        projectId,
        projectName,
        parseInt(feature.id),
        'User Story',
        iterationMap
      );
      
      epic.features.push(feature);
    }

    if (!valueStreamMap.has(areaPath)) {
      valueStreamMap.set(areaPath, []);
    }
    valueStreamMap.get(areaPath)!.push(epic);
  }

  const result = Array.from(valueStreamMap.entries())
    .filter(([_, epics]) => epics.length > 0)
    .map(([name, epics]) => ({
      id: name.replace(/[^a-zA-Z0-9]/g, '-'),
      name: name.split('\\').pop() || name,
      epics
    }));

  // Calculate completion counts
  console.log('=== Calculating completion counts ===');
  updateCompletionCounts(result);

  return result;
}

export async function fetchWorkItems(
  localConfig?: { orgUrl: string; project: string; pat: string }
): Promise<ValueStream[]> {
  if (localConfig) {
    return fetchWorkItemsLocal(localConfig.orgUrl, localConfig.project, localConfig.pat);
  } else {
    const config = SDK.getConfiguration();
    const queryGuid = (config as any).queryGuid || await getQueryGuidFromSettings();
    return fetchWorkItemsFromQuery(queryGuid);
  }
}

async function getQueryGuidFromSettings(): Promise<string> {
  const dataService = await SDK.getService('ms.vss-settings-web.vss-settings-service');
  const settings = await (dataService as any).getValue('timeline-query-guid', { scopeType: 'User' });
  return settings || '';
}

export async function saveQueryGuid(queryGuid: string): Promise<void> {
  const dataService = await SDK.getService('ms.vss-settings-web.vss-settings-service');
  await (dataService as any).setValue('timeline-query-guid', queryGuid, { scopeType: 'User' });
}