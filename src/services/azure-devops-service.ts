// azure-devops-service.ts - Optimized with unified query approach

export type { Epic, Feature, ValueStream } from '@types/timeline.types';

import * as SDK from 'azure-devops-extension-sdk';
import { WorkItemTrackingRestClient, TreeStructureGroup } from 'azure-devops-extension-api/WorkItemTracking';
import { getClient } from 'azure-devops-extension-api';

type RootWorkItemType = 'Epic' | 'Feature';
type WorkItemType = 'Epic' | 'Feature' | 'User Story' | 'Task' | 'Bug';

/**
 * Get iterations for the entire current year
 */
async function getCurrentYearIterations(
  orgUrl: string,
  project: string,
  headers: any
): Promise<string[]> {
  try {
    console.log('Fetching current year iterations...');
    
    // Fetch all iterations with dates
    const classificationNodesUrl = `${orgUrl}/${project}/_apis/wit/classificationnodes/iterations?$depth=10&api-version=7.0`;
    const response = await fetch(classificationNodesUrl, { headers });
    const data = await response.json();
    
    const iterationMap = extractIterationsFromNode(data, project);
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Find all iterations in the current year
    const iterationsWithDates: Array<{
      path: string;
      startDate: Date;
      finishDate: Date;
    }> = [];
    
    iterationMap.forEach((dates, path) => {
      // Skip parent/root paths without dates
      if (dates.startDate && dates.finishDate) {
        const startDate = new Date(dates.startDate);
        const finishDate = new Date(dates.finishDate);
        const startYear = startDate.getFullYear();
        const endYear = finishDate.getFullYear();
        
        // Include iteration if it overlaps with current year
        if (startYear === currentYear || endYear === currentYear) {
          iterationsWithDates.push({
            path: path,
            startDate: startDate,
            finishDate: finishDate
          });
        }
      }
    });
    
    // Sort by start date
    iterationsWithDates.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    
    if (iterationsWithDates.length === 0) {
      console.log(`No iterations found for year ${currentYear}`);
      return [];
    }
    
    // Get all iteration paths
    const iterationPaths = iterationsWithDates.map(iter => {
      console.log(`Including iteration: ${iter.path} (${iter.startDate.toISOString().split('T')[0]} to ${iter.finishDate.toISOString().split('T')[0]})`);
      return iter.path;
    });
    
    console.log(`Found ${iterationPaths.length} iterations for year ${currentYear}`);
    return iterationPaths;
    
  } catch (error) {
    console.error('Error fetching current year iterations:', error);
    return [];
  }
}

/**
 * Returns the start of the previous quarter
 * and the end of two quarters after the current one.
 */
export function getQuarterRange(referenceDate: Date = new Date()): {
  previousQuarterStart: Date;
  twoQuartersAfterEnd: Date;
} {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth(); // 0-based

  // Determine current quarter (1–4)
  const currentQuarter = Math.floor(month / 3) + 1;

  // Helper to convert quarter offset to actual year/quarter pair
  const shiftQuarter = (q: number, offset: number) => {
    let newQ = q + offset;
    let newY = year;
    while (newQ < 1) { newQ += 4; newY--; }
    while (newQ > 4) { newQ -= 4; newY++; }
    return { q: newQ, y: newY };
  };

  // 1️⃣ previous quarter start
  const prev = shiftQuarter(currentQuarter, -1);
  const prevStartMonth = (prev.q - 1) * 3;
  const previousQuarterStart = new Date(prev.y, prevStartMonth, 1);

  // 2️⃣ two quarters after end
  const after = shiftQuarter(currentQuarter, +2);
  const afterEndMonth = after.q * 3; // month after the quarter ends
  const twoQuartersAfterEnd = new Date(after.y, afterEndMonth, 0); // day 0 ⇒ last day prev month

  return { previousQuarterStart, twoQuartersAfterEnd };
}


/**
 * Get current, previous, and next iteration paths for filtering
 */
async function getCurrentIterationContext(
  orgUrl: string,
  project: string,
  headers: any
): Promise<string[]> {
  try {
    console.log('Fetching current iteration context...');
    
    // Fetch all iterations with dates
    const classificationNodesUrl = `${orgUrl}/${project}/_apis/wit/classificationnodes/iterations?$depth=10&api-version=7.0`;
    const response = await fetch(classificationNodesUrl, { headers });
    const data = await response.json();
    
    const iterationMap = extractIterationsFromNode(data, project);
    const now = new Date();
    
    // Find all iterations and sort by start date
    const iterationsWithDates: Array<{
      path: string;
      startDate: Date;
      finishDate: Date;
    }> = [];
    
    let { previousQuarterStart, twoQuartersAfterEnd } = getQuarterRange(now);
    let { timelineStart, timelineEnd } = { timelineStart: now, timelineEnd: now };
    const iterationPaths: string[] = [];

    iterationMap.forEach((dates, path) => {
      // Skip parent/root paths without dates
      if (dates.startDate && dates.finishDate) {
        timelineStart = new Date(dates.startDate);
        timelineEnd = new Date(dates.finishDate);
        if (timelineStart >= previousQuarterStart && timelineEnd <= twoQuartersAfterEnd) {
            console.log(`Including iteration for context check: ${path}`);
            iterationPaths.push(path);
        }   
      }
    });
    
    console.log(`Found ${iterationPaths.length} iterations for context (prev, current, next)`);
    return iterationPaths;
    
  } catch (error) {
    console.error('Error fetching current iteration context:', error);
    return [];
  }
}

/**
 * Options for filtering work items by iteration
 */
interface IterationFilterOptions {
  // Filter by specific iteration paths (e.g., "ProjectName\\Sprint 1")
  iterationPaths?: string[];
  
  // Use current iteration context (current -1, current, current +1)
  useCurrentIterationContext?: boolean;
  
  // Use entire current year's iterations
  useCurrentYearIterations?: boolean;
  
  // Filter by date range - only include root items with iterations in this range
  startDate?: Date;
  endDate?: Date;
  
  // Include items with any iteration (not empty)
  requireIteration?: boolean;
}

/**
 * UNIFIED QUERY BUILDER
 * This single function builds a query that fetches the entire work item tree
 * from the root level down to the specified depth, filtering by iteration
 */
function buildWorkItemTreeQuery(
  project: string,
  rootWorkItemType: RootWorkItemType,
  iterationFilter?: IterationFilterOptions,
  maxDepth: number = 3
): string {
  // Build the recursive tree query using WorkItemLinks
  // This fetches ALL levels in a single query
  
  const stateFilter = `AND [Source].[System.State] <> 'Closed' AND [Source].[System.State] <> 'Removed'`;
  
  // Build iteration filter based on options
  let iterationFilterClause = '';
  
  if (iterationFilter) {
    if (iterationFilter.iterationPaths && iterationFilter.iterationPaths.length > 0) {
      // Filter by specific iteration paths
      const pathConditions = iterationFilter.iterationPaths
        .map(path => `[Source].[System.IterationPath] = '${path}'`)
        .join(' OR ');
      iterationFilterClause = `AND (${pathConditions})`;
    } else if (iterationFilter.requireIteration !== false) {
      // Default: require root to have ANY iteration path (not empty)
      iterationFilterClause = `AND [Source].[System.IterationPath] <> ''`;
    }
  }
  
  // Query structure:
  // - Starts with root-level work items (Epic or Feature)
  // - Root must meet iteration filter criteria
  // - Uses recursive mode to get all descendants (regardless of their iteration)
  // - Filters out closed/removed items
  
  return `
    SELECT [System.Id], 
           [System.Title], 
           [System.State], 
           [System.WorkItemType],
           [System.IterationPath],
           [System.AreaPath],
           [System.TeamProject]
    FROM WorkItemLinks
    WHERE [Source].[System.TeamProject] = '${project}'
      AND [Source].[System.WorkItemType] = '${rootWorkItemType}'
      ${stateFilter}
      ${iterationFilterClause}
      AND [System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward'
      AND [Target].[System.TeamProject] = '${project}'
    MODE (Recursive, ReturnMatchingChildren)
  `.trim();
}

/**
 * Helper to get child work item type
 */
function getChildWorkItemType(parentType: WorkItemType): WorkItemType | null {
  const hierarchy: { [key: string]: WorkItemType | null } = {
    'Epic': 'Feature',
    'Feature': 'User Story',
    'User Story': 'Task',
    'Task': null,
    'Bug': null
  };
  return hierarchy[parentType] || null;
}

/**
 * Helper to get completed states for a work item type
 */
function getCompletedStates(workItemType: WorkItemType): string[] {
  const stateMap: { [key: string]: string[] } = {
    'Epic': ['Done', 'Closed'],
    'Feature': ['Done', 'Closed'],
    'User Story': ['Done', 'Closed', 'Resolved'],
    'Task': ['Done', 'Closed'],
    'Bug': ['Done', 'Closed', 'Resolved']
  };
  return stateMap[workItemType] || ['Done', 'Closed'];
}

/**
 * Build a tree structure from flat work item links
 */
interface WorkItemNode {
  id: number;
  title: string;
  state: string;
  workItemType: WorkItemType;
  iterationPath: string;
  areaPath: string;
  children: WorkItemNode[];
  childIds: number[];
}

function buildTreeFromLinks(
  workItemRelations: any[],
  workItemDetails: Map<number, any>
): Map<number, WorkItemNode> {
  
  console.log(`Building tree from ${workItemRelations.length} relations`);
  
  // Create a map of all nodes
  const nodeMap = new Map<number, WorkItemNode>();
  
  // First pass: Create all nodes
  workItemDetails.forEach((wi, id) => {
    nodeMap.set(id, {
      id: id,
      title: wi.fields['System.Title'],
      state: wi.fields['System.State'],
      workItemType: wi.fields['System.WorkItemType'],
      iterationPath: wi.fields['System.IterationPath'],
      areaPath: wi.fields['System.AreaPath'],
      children: [],
      childIds: []
    });
  });
  
  // Second pass: Build parent-child relationships
  workItemRelations.forEach(relation => {
    if (relation.source && relation.target) {
      const parentId = relation.source.id;
      const childId = relation.target.id;
      
      const parentNode = nodeMap.get(parentId);
      const childNode = nodeMap.get(childId);
      
      if (parentNode && childNode && parentId !== childId) {
        parentNode.childIds.push(childId);
        parentNode.children.push(childNode);
      }
    }
  });
  
  console.log(`Built tree with ${nodeMap.size} nodes`);
  return nodeMap;
}

/**
 * Find root nodes (nodes that are not children of any other node)
 * Also apply date-based iteration filtering if specified
 */
function findRootNodes(
  nodeMap: Map<number, WorkItemNode>,
  rootWorkItemType: RootWorkItemType,
  iterationMap: Map<string, { startDate: string; finishDate: string }>,
  projectName: string,
  iterationFilter?: IterationFilterOptions
): WorkItemNode[] {
  
  // Collect all child IDs
  const allChildIds = new Set<number>();
  nodeMap.forEach(node => {
    node.childIds.forEach(childId => allChildIds.add(childId));
  });
  
  // Root nodes are those that are not children AND match the root type
  const rootNodes: WorkItemNode[] = [];
  nodeMap.forEach(node => {
    if (!allChildIds.has(node.id) && node.workItemType === rootWorkItemType) {
      
      // Apply date-based iteration filter if specified
      if (iterationFilter?.startDate || iterationFilter?.endDate) {
        const iterationDates = findIterationDates(node.iterationPath, projectName, iterationMap);
        
        if (!iterationDates) {
          console.log(`Skipping root node ${node.id} - no iteration dates found`);
          return;
        }
        
        const iterStart = new Date(iterationDates.startDate);
        const iterEnd = new Date(iterationDates.finishDate);
        
        // Check if iteration overlaps with filter date range
        if (iterationFilter.startDate && iterEnd < iterationFilter.startDate) {
          console.log(`Skipping root node ${node.id} - iteration ends before filter start`);
          return;
        }
        
        if (iterationFilter.endDate && iterStart > iterationFilter.endDate) {
          console.log(`Skipping root node ${node.id} - iteration starts after filter end`);
          return;
        }
      }
      
      rootNodes.push(node);
    }
  });
  
  console.log(`Found ${rootNodes.length} root nodes of type ${rootWorkItemType}`);
  return rootNodes;
}

/**
 * Calculate progress recursively
 */
function calculateNodeProgress(node: WorkItemNode): { total: number; completed: number } {
  const completedStates = getCompletedStates(node.workItemType);
  
  if (node.children.length === 0) {
    // Leaf node
    const isCompleted = completedStates.includes(node.state);
    return { total: 1, completed: isCompleted ? 1 : 0 };
  }
  
  // Aggregate from children
  let total = 0;
  let completed = 0;
  
  node.children.forEach(child => {
    const childStates = getCompletedStates(child.workItemType);
    total++;
    if (childStates.includes(child.state)) {
      completed++;
    }
  });
  
  return { total, completed };
}

/**
 * Convert tree node to output format
 */
function convertNodeToWorkItem(
  node: WorkItemNode,
  iterationMap: Map<string, { startDate: string; finishDate: string }>,
  projectName: string
): any | null {
  
  const iterationDates = findIterationDates(node.iterationPath, projectName, iterationMap);
  
  if (!iterationDates) {
    console.log(`Skipping work item ${node.id} - no iteration dates found for ${node.iterationPath}`);
    return null;
  }
  
  const progress = calculateNodeProgress(node);
  const childType = getChildWorkItemType(node.workItemType);
  
  const workItem: any = {
    id: node.id.toString(),
    title: node.title,
    state: node.state,
    workItemType: node.workItemType,
    iterationStart: iterationDates.startDate,
    iterationEnd: iterationDates.finishDate,
    children: []
  };
  
  // Add type-specific counts
  if (childType) {
    const childTypeName = childType.toLowerCase().replace(' ', '');
    workItem[`${childTypeName}Count`] = progress.total;
    workItem[`completed${childType.replace(' ', '')}Count`] = progress.completed;
  }
  
  // Recursively convert children
  node.children.forEach(child => {
    const childWorkItem = convertNodeToWorkItem(child, iterationMap, projectName);
    if (childWorkItem) {
      workItem.children.push(childWorkItem);
    }
  });
  
  return workItem;
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
    console.log('Found iteration:', currentPath);
    console.log(node);
    iterationMap.set(currentPath, {
      startDate: node.attributes.startDate,
      finishDate: node.attributes.finishDate
    });
    
    // const pathWithoutProject = currentPath.replace(`${projectName}\\`, '');
    // if (pathWithoutProject !== currentPath) {
    //   iterationMap.set(pathWithoutProject, {
    //     startDate: node.attributes.startDate,
    //     finishDate: node.attributes.finishDate
    //   });
    // }
    
    // iterationMap.set(node.name, {
    //   startDate: node.attributes.startDate,
    //   finishDate: node.attributes.finishDate
    // });
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

/**
 * MAIN FETCH FUNCTION - Uses unified query approach
 */
export async function fetchWorkItemsLocal(
  orgUrl: string,
  project: string,
  pat: string,
  rootLevel: RootWorkItemType = 'Epic',
  iterationFilter?: IterationFilterOptions
): Promise<ValueStream[]> {
  const auth = btoa(`:${pat}`);
  const headers = {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json'
  };

  console.log(`=== Starting Unified Work Items Fetch (Root: ${rootLevel}) ===`);
  
  // Determine iteration filter to use
  let effectiveIterationFilter = iterationFilter;
  
  // If no filter provided or useCurrentIterationContext is true, get current iteration context
  if (!iterationFilter || iterationFilter.useCurrentIterationContext) {
    console.log('Using current iteration context (prev, current, next)');
    const iterationPaths = await getCurrentIterationContext(orgUrl, project, headers);
    
    if (iterationPaths.length > 0) {
      effectiveIterationFilter = {
        ...iterationFilter,
        iterationPaths: iterationPaths,
        requireIteration: true
      };
    } else {
      console.log('No iterations found, falling back to default filter');
      effectiveIterationFilter = {
        requireIteration: true
      };
    }
  }
  
  if (effectiveIterationFilter) {
    console.log('Effective iteration filter:', effectiveIterationFilter);
  }

  // Step 1: Build and execute the unified tree query
  const query = buildWorkItemTreeQuery(project, rootLevel, effectiveIterationFilter, 3);
  console.log('Executing unified tree query:', query);
  
  const wiqlUrl = `${orgUrl}/${project}/_apis/wit/wiql?api-version=7.0`;
  const queryResponse = await fetch(wiqlUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query })
  });

  const queryResult = await queryResponse.json();
  const workItemRelations = queryResult.workItemRelations || [];
  
  console.log(`Query returned ${workItemRelations.length} work item relations`);
  
  if (workItemRelations.length === 0) {
    console.log('No work items found matching criteria');
    return [];
  }

  // Step 2: Extract all unique work item IDs
  const workItemIds = new Set<number>();
  workItemRelations.forEach((relation: any) => {
    if (relation.source) workItemIds.add(relation.source.id);
    if (relation.target) workItemIds.add(relation.target.id);
  });
  
  const ids = Array.from(workItemIds);
  console.log(`Fetching details for ${ids.length} work items`);

  // Step 3: Fetch all work item details in bulk
  const workItemsUrl = `${orgUrl}/${project}/_apis/wit/workitems?ids=${ids.join(',')}&fields=System.Id,System.Title,System.IterationPath,System.AreaPath,System.State,System.WorkItemType,System.TeamProject&api-version=7.0`;
  const workItemsResponse = await fetch(workItemsUrl, { headers });
  const workItemsData = await workItemsResponse.json();
  
  // Filter to project items only
  const projectWorkItems = workItemsData.value.filter((wi: any) => 
    wi.fields['System.TeamProject'] === project
  );

  // Create a map for quick lookup
  const workItemDetailsMap = new Map<number, any>();
  projectWorkItems.forEach((wi: any) => {
    workItemDetailsMap.set(wi.id, wi);
  });

  // Step 4: Fetch iteration dates
  console.log('Fetching iteration dates...');
  const classificationNodesUrl = `${orgUrl}/${project}/_apis/wit/classificationnodes/iterations?$depth=10&api-version=7.0`;
  const classificationResponse = await fetch(classificationNodesUrl, { headers });
  const classificationData = await classificationResponse.json();
  
  const iterationMap = extractIterationsFromNode(classificationData, project);
  console.log(`Loaded ${iterationMap.size} iterations`);

  // Step 5: Build tree structure from flat relations
  const nodeMap = buildTreeFromLinks(workItemRelations, workItemDetailsMap);
  const rootNodes = findRootNodes(nodeMap, rootLevel, iterationMap, project, effectiveIterationFilter);

  // Step 6: Convert to output format and group by area path
  const valueStreamMap = new Map<string, any[]>();

  rootNodes.forEach(rootNode => {
    const workItem = convertNodeToWorkItem(rootNode, iterationMap, project);
    
    if (workItem) {
      const areaPath = rootNode.areaPath;
      
      if (!valueStreamMap.has(areaPath)) {
        valueStreamMap.set(areaPath, []);
      }
      valueStreamMap.get(areaPath)!.push(workItem);
    }
  });

  // Step 7: Format final output
  const result = Array.from(valueStreamMap.entries())
    .filter(([_, items]) => items.length > 0)
    .map(([name, items]) => ({
      id: name.replace(/[^a-zA-Z0-9]/g, '-'),
      name: name.split('\\').pop() || name,
      workItems: items
    }));

  console.log(`=== Completed: ${result.length} value streams with ${rootNodes.length} root items ===`);
  return result;
}

/**
 * Main entry point
 */
export async function fetchWorkItems(
  localConfig?: { 
    orgUrl: string; 
    project: string; 
    pat: string; 
    rootLevel?: RootWorkItemType;
    iterationFilter?: IterationFilterOptions;
  }
): Promise<ValueStream[]> {
  if (localConfig) {
    return fetchWorkItemsLocal(
      localConfig.orgUrl, 
      localConfig.project, 
      localConfig.pat,
      localConfig.rootLevel || 'Epic',
      localConfig.iterationFilter
    );
  } else {
    // For SDK mode, implement similar unified query approach
    throw new Error('SDK mode not yet implemented for unified query');
  }
}

// Settings helpers
async function getQueryGuidFromSettings(): Promise<string> {
  const dataService = await SDK.getService('ms.vss-settings-web.vss-settings-service');
  const settings = await (dataService as any).getValue('timeline-query-guid', { scopeType: 'User' });
  return settings || '';
}

export async function saveQueryGuid(queryGuid: string): Promise<void> {
  const dataService = await SDK.getService('ms.vss-settings-web.vss-settings-service');
  await (dataService as any).setValue('timeline-query-guid', queryGuid, { scopeType: 'User' });
}