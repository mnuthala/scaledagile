// azure-devops-service.ts - With completion tracking

export type { Epic, Feature, ValueStream } from '../types/timeline.types';

import * as SDK from 'azure-devops-extension-sdk';
import { WorkItemTrackingRestClient, TreeStructureGroup } from 'azure-devops-extension-api/WorkItemTracking';
import { getClient } from 'azure-devops-extension-api';

type WorkItemType = 'Epic' | 'Feature';
type ChildWorkItemType = 'Feature' | 'User Story';

interface ChildWorkItemCounts {
  total: number;
  completed: number;
  childIds: number[];
}

/**
 * Fetch child work items with completion status using a SINGLE query
 * @param workItemId - ID of the parent work item (Epic or Feature)
 * @param workItemType - Type of the parent work item ('Epic' or 'Feature')
 * @param orgUrl - Organization URL
 * @param project - Project name
 * @param headers - Auth headers
 * @returns Object with total, completed counts and child IDs
 */
async function fetchChildWorkItemsWithCompletion(
  workItemId: number,
  workItemType: WorkItemType,
  orgUrl: string,
  project: string,
  headers: any
): Promise<ChildWorkItemCounts> {
  
  // Determine child work item type
  const childType: ChildWorkItemType = workItemType === 'Epic' ? 'Feature' : 'User Story';
  
  // Completed states vary by work item type
  const completedStates = childType === 'Feature' 
    ? ['Done', 'Closed'] 
    : ['Done', 'Closed', 'Resolved'];
  
  console.log(`      --- Fetching ${childType}s for ${workItemType} ${workItemId} with completion status ---`);
  
  // SINGLE QUERY: Get all child work items WITH their states
  const query = {
    query: `SELECT [System.Id], [System.State]
            FROM WorkItemLinks
            WHERE [Source].[System.Id] = ${workItemId}
            AND [System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward'
            AND [Target].[System.WorkItemType] = '${childType}'
            AND [Target].[System.TeamProject] = '${project}'
            MODE (MustContain)`
  };
  
  const wiqlUrl = `${orgUrl}/${project}/_apis/wit/wiql?api-version=7.0`;
  
  try {
    const response = await fetch(wiqlUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(query)
    });
    
    const result = await response.json();
    const relations = result.workItemRelations || [];
    
    // Extract child IDs and states from the single query result
    const children: Array<{ id: number; state: string }> = [];
    
    for (const rel of relations) {
      // Skip the source work item (the parent)
      if (rel.target && rel.target.id !== workItemId) {
        children.push({
          id: rel.target.id,
          state: rel.attributes?.['System.State'] || 'Unknown'
        });
      }
    }
    
    if (children.length === 0) {
      console.log(`      No ${childType}s found`);
      return { total: 0, completed: 0, childIds: [] };
    }
    
    // Count completed items based on state
    const completedCount = children.filter(child => 
      completedStates.includes(child.state)
    ).length;
    
    const childIds = children.map(c => c.id);
    
    console.log(`      ${childType}s: ${completedCount} completed out of ${children.length} total`);
    console.log(`      States: ${children.map(c => `${c.id}:${c.state}`).join(', ')}`);
    
    return {
      total: children.length,
      completed: completedCount,
      childIds: childIds
    };
    
  } catch (error) {
    console.error(`      Error fetching ${childType}s with completion:`, error);
    return { total: 0, completed: 0, childIds: [] };
  }
}

/**
 * SDK version - Fetch child work items with completion status using a SINGLE query
 */
async function fetchChildWorkItemsWithCompletionSDK(
  workItemId: number,
  workItemType: WorkItemType,
  client: WorkItemTrackingRestClient,
  projectId: string,
  projectName: string
): Promise<ChildWorkItemCounts> {
  
  const childType: ChildWorkItemType = workItemType === 'Epic' ? 'Feature' : 'User Story';
  
  const completedStates = childType === 'Feature' 
    ? ['Done', 'Closed'] 
    : ['Done', 'Closed', 'Resolved'];
  
  console.log(`      --- Fetching ${childType}s for ${workItemType} ${workItemId} with completion status (SDK) ---`);
  
  try {
    // SINGLE QUERY: Get all child work items WITH their states
    const query = {
      query: `SELECT [System.Id], [System.State]
              FROM WorkItemLinks
              WHERE [Source].[System.Id] = ${workItemId}
              AND [System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward'
              AND [Target].[System.WorkItemType] = '${childType}'
              AND [Target].[System.TeamProject] = '${projectName}'
              MODE (MustContain)`
    };
    
    const result = await client.queryByWiql(query, projectId);
    const relations = result.workItemRelations || [];
    
    // Extract child IDs and states from the single query result
    const children: Array<{ id: number; state: string }> = [];
    
    for (const rel of relations) {
      if (rel.target && rel.target.id !== workItemId) {
        children.push({
          id: rel.target.id!,
          state: (rel as any).attributes?.['System.State'] || 'Unknown'
        });
      }
    }
    
    if (children.length === 0) {
      console.log(`      No ${childType}s found`);
      return { total: 0, completed: 0, childIds: [] };
    }
    
    // Count completed items based on state
    const completedCount = children.filter(child => 
      completedStates.includes(child.state)
    ).length;
    
    const childIds = children.map(c => c.id);
    
    console.log(`      ${childType}s: ${completedCount} completed out of ${children.length} total`);
    console.log(`      States: ${children.map(c => `${c.id}:${c.state}`).join(', ')}`);
    
    return {
      total: children.length,
      completed: completedCount,
      childIds: childIds
    };
    
  } catch (error) {
    console.error(`      Error fetching ${childType}s with completion:`, error);
    return { total: 0, completed: 0, childIds: [] };
  }
}

// Helper function to recursively extract iterations from classification nodes
function extractIterationsFromNode(node: any, projectName: string, parentPath: string = ''): Map<string, { startDate: string; finishDate: string }> {
  const iterationMap = new Map<string, { startDate: string; finishDate: string }>();
  
  if (!node) return iterationMap;
  
  let currentPath: string;
  if (!parentPath) {
    currentPath = node.name;
  } else {
    currentPath = `${parentPath}\\${node.name}`;
  }
  
  if (node.attributes && node.attributes.startDate && node.attributes.finishDate) {
    iterationMap.set(currentPath, {
      startDate: node.attributes.startDate,
      finishDate: node.attributes.finishDate
    });
    
    const pathWithoutProject = currentPath.replace(`${projectName}\\`, '');
    if (pathWithoutProject !== currentPath) {
      iterationMap.set(pathWithoutProject, {
        startDate: node.attributes.startDate,
        finishDate: node.attributes.finishDate
      });
    }
    
    iterationMap.set(node.name, {
      startDate: node.attributes.startDate,
      finishDate: node.attributes.finishDate
    });
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
  iterationMap: Map<string, { startDate: string; finishDate: string }>
): { startDate: string; finishDate: string } | undefined {
  
  const variations = normalizeIterationPath(iterationPath, projectName);
  
  for (const variation of variations) {
    const dates = iterationMap.get(variation);
    if (dates) {
      return dates;
    }
  }
  
  return undefined;
}

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

  console.log('=== Starting Work Items Fetch ===');

  const wiqlUrl = `${orgUrl}/${project}/_apis/wit/wiql?api-version=7.0`;
  const wiqlQuery = {
    query: `SELECT [System.Id]
            FROM WorkItemLinks
            WHERE [Source].[System.TeamProject] = '${project}'
            AND [Source].[System.WorkItemType] = 'Epic'
            AND [Source].[System.State] <> 'Closed'
            AND [System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward'
            AND [Target].[System.WorkItemType] = 'Feature'
            AND [Target].[System.TeamProject] = '${project}'
            MODE (MustContain)`
  };

  const queryResponse = await fetch(wiqlUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(wiqlQuery)
  });

  const queryResult = await queryResponse.json();
  const epicRelations = queryResult.workItemRelations || [];
  
  if (epicRelations.length === 0) {
    return [];
  }

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
  
  const workItemIds = Array.from(epicIdsSet);
  
  const epicsUrl = `${orgUrl}/${project}/_apis/wit/workitems?ids=${workItemIds.join(',')}&fields=System.Id,System.Title,System.IterationPath,System.AreaPath,System.TeamProject&api-version=7.0`;
  const epicsResponse = await fetch(epicsUrl, { headers });
  const epicsData = await epicsResponse.json();
  
  const projectEpics = epicsData.value.filter((wi: any) => wi.fields['System.TeamProject'] === project);

  const classificationNodesUrl = `${orgUrl}/${project}/_apis/wit/classificationnodes/iterations?$depth=10&api-version=7.0`;
  const classificationResponse = await fetch(classificationNodesUrl, { headers });
  const classificationData = await classificationResponse.json();
  
  const iterationMap = extractIterationsFromNode(classificationData, project);

  const valueStreamMap = new Map<string, any[]>();

  for (const wi of projectEpics) {
    const iterationPath = wi.fields['System.IterationPath'];
    const areaPath = wi.fields['System.AreaPath'];
    
    if (!iterationPath) continue;
    
    const iterationDates = findIterationDates(iterationPath, project, iterationMap);
    if (!iterationDates) continue;
    
    // Fetch Epic's child Features with completion status
    const epicCompletion = await fetchChildWorkItemsWithCompletion(
      wi.id,
      'Epic',
      orgUrl,
      project,
      headers
    );
    
    const epic: any = {
      id: wi.id.toString(),
      title: wi.fields['System.Title'],
      iterationStart: iterationDates.startDate,
      iterationEnd: iterationDates.finishDate,
      features: [],
      featureCount: epicCompletion.total,
      completedFeatureCount: epicCompletion.completed
    };

    const featureIds = epicCompletion.childIds;
    
    if (featureIds.length > 0) {
      const featuresUrl = `${orgUrl}/${project}/_apis/wit/workitems?ids=${featureIds.join(',')}&fields=System.Id,System.Title,System.IterationPath,System.TeamProject&api-version=7.0`;
      const featuresResponse = await fetch(featuresUrl, { headers });
      const featuresData = await featuresResponse.json();
      
      const projectFeatures = featuresData.value.filter((f: any) => f.fields['System.TeamProject'] === project);

      for (const f of projectFeatures) {
        const featureIterationPath = f.fields['System.IterationPath'];
        
        if (!featureIterationPath) continue;
        
        const featureIterationDates = findIterationDates(featureIterationPath, project, iterationMap);
        if (!featureIterationDates) continue;
        
        // Fetch Feature's child User Stories with completion status
        const featureCompletion = await fetchChildWorkItemsWithCompletion(
          f.id,
          'Feature',
          orgUrl,
          project,
          headers
        );
        
        epic.features.push({
          id: f.id.toString(),
          title: f.fields['System.Title'],
          iterationStart: featureIterationDates.startDate,
          iterationEnd: featureIterationDates.finishDate,
          userStoryCount: featureCompletion.total,
          completedUserStoryCount: featureCompletion.completed
        });
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

  return result;
}

export async function fetchWorkItemsFromQuery(queryGuid: string): Promise<ValueStream[]> {
  const client = getClient(WorkItemTrackingRestClient);
  const projectService = await SDK.getService('ms.vss-tfs-web.tfs-page-data-service');
  const projectData = await (projectService as any).getPageData();
  const projectId = projectData.project.id;
  const projectName = projectData.project.name;

  const queryResult = await client.queryById(queryGuid, projectId);
  
  if (!queryResult.workItems || queryResult.workItems.length === 0) {
    return [];
  }

  const workItemIds = queryResult.workItems.map(wi => wi.id!);
  const workItems = await client.getWorkItems(
    workItemIds,
    projectId,
    ['System.Id', 'System.Title', 'System.IterationPath', 'System.AreaPath', 'System.WorkItemType', 'System.TeamProject']
  );

  const projectWorkItems = workItems.filter(wi => wi.fields['System.TeamProject'] === projectName);
  const epics = projectWorkItems.filter(wi => wi.fields['System.WorkItemType'] === 'Epic');
  const features = projectWorkItems.filter(wi => wi.fields['System.WorkItemType'] === 'Feature');
  
  const iterationMap = new Map<string, { startDate: string; finishDate: string }>();
  
  try {
    const classificationNode = await client.getClassificationNode(
      projectId, 
      TreeStructureGroup.Iterations, 
      undefined, 
      10
    );
    
    const extractedIterations = extractIterationsFromNode(classificationNode, projectName);
    extractedIterations.forEach((value, key) => {
      iterationMap.set(key, value);
    });
  } catch (error) {
    console.error('Error fetching classification nodes:', error);
  }
  
  const valueStreamMap = new Map<string, any[]>();

  for (const epicWi of epics) {
    const iterationPath = epicWi.fields['System.IterationPath'];
    const areaPath = epicWi.fields['System.AreaPath'];
    
    if (!iterationPath) continue;
    
    const iterationData = findIterationDates(iterationPath, projectName, iterationMap);
    if (!iterationData) continue;
    
    // Fetch Epic's child Features with completion status using SDK
    const epicCompletion = await fetchChildWorkItemsWithCompletionSDK(
      epicWi.id!,
      'Epic',
      client,
      projectId,
      projectName
    );
    
    const epic: any = {
      id: epicWi.id!.toString(),
      title: epicWi.fields['System.Title'],
      iterationStart: iterationData.startDate,
      iterationEnd: iterationData.finishDate,
      features: [],
      featureCount: epicCompletion.total,
      completedFeatureCount: epicCompletion.completed
    };

    for (const f of features.filter(feat => epicCompletion.childIds.includes(feat.id!))) {
      const featureIterationPath = f.fields['System.IterationPath'];
      
      if (!featureIterationPath) continue;
      
      const featureIterationData = findIterationDates(featureIterationPath, projectName, iterationMap);
      if (!featureIterationData) continue;
      
      // Fetch Feature's child User Stories with completion status using SDK
      const featureCompletion = await fetchChildWorkItemsWithCompletionSDK(
        f.id!,
        'Feature',
        client,
        projectId,
        projectName
      );
      
      epic.features.push({
        id: f.id!.toString(),
        title: f.fields['System.Title'],
        iterationStart: featureIterationData.startDate,
        iterationEnd: featureIterationData.finishDate,
        userStoryCount: featureCompletion.total,
        completedUserStoryCount: featureCompletion.completed
      });
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