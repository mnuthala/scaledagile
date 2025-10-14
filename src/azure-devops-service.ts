import * as SDK from 'azure-devops-extension-sdk';
import { WorkItemTrackingRestClient, TreeStructureGroup } from 'azure-devops-extension-api/WorkItemTracking';
import { getClient } from 'azure-devops-extension-api';

export interface Epic {
  id: string;
  title: string;
  iterationStart: string;
  iterationEnd: string;
  features: Feature[];
}

export interface Feature {
  id: string;
  title: string;
  iterationStart: string;
  iterationEnd: string;
}

export interface ValueStream {
  id: string;
  name: string;
  epics: Epic[];
}

// Helper function to recursively extract iterations from classification nodes
function extractIterationsFromNode(node: any, projectName: string, parentPath: string = ''): Map<string, { startDate: string; finishDate: string }> {
  const iterationMap = new Map<string, { startDate: string; finishDate: string }>();
  
  if (!node) return iterationMap;
  
  // Build the full path - don't duplicate project name if it's already in parentPath
  let currentPath: string;
  if (!parentPath) {
    // Root node - this is the project name itself
    currentPath = node.name;
  } else {
    // Child node - append to parent path
    currentPath = `${parentPath}\\${node.name}`;
  }
  
  // If this node has attributes (dates), add it to the map
  if (node.attributes && node.attributes.startDate && node.attributes.finishDate) {
    console.log(`    Found iteration: ${currentPath}`);
    console.log(`      Start: ${node.attributes.startDate}`);
    console.log(`      End: ${node.attributes.finishDate}`);
    
    // Store with full path
    iterationMap.set(currentPath, {
      startDate: node.attributes.startDate,
      finishDate: node.attributes.finishDate
    });
    
    // Also store without project prefix for backward compatibility
    // Work items might have paths like "ProjectName\Sprint 1" or just "Sprint 1"
    const pathWithoutProject = currentPath.replace(`${projectName}\\`, '');
    if (pathWithoutProject !== currentPath) {
      iterationMap.set(pathWithoutProject, {
        startDate: node.attributes.startDate,
        finishDate: node.attributes.finishDate
      });
    }
    
    // Also map by just the name for maximum flexibility
    iterationMap.set(node.name, {
      startDate: node.attributes.startDate,
      finishDate: node.attributes.finishDate
    });
  }
  
  // Recursively process child nodes
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

// Helper function to normalize iteration path
function normalizeIterationPath(iterationPath: string, projectName: string): string[] {
  // Return multiple possible variations of the path
  const variations: string[] = [];
  
  // Original path
  variations.push(iterationPath);
  
  // If path doesn't start with project name, prepend it
  if (!iterationPath.startsWith(projectName)) {
    variations.push(`${projectName}\\${iterationPath}`);
  }
  
  // If path starts with project name, also try without it
  if (iterationPath.startsWith(`${projectName}\\`)) {
    variations.push(iterationPath.substring(projectName.length + 1));
  }
  
  return variations;
}

// Helper function to find iteration dates with multiple path variations
function findIterationDates(
  iterationPath: string, 
  projectName: string, 
  iterationMap: Map<string, { startDate: string; finishDate: string }>
): { startDate: string; finishDate: string } | undefined {
  
  const variations = normalizeIterationPath(iterationPath, projectName);
  
  for (const variation of variations) {
    const dates = iterationMap.get(variation);
    if (dates) {
      console.log(`    Matched iteration path '${iterationPath}' as '${variation}'`);
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
  console.log(`Organization URL: ${orgUrl}`);
  console.log(`Project: ${project}`);

  // Query for Epics - PROJECT SCOPED
  const wiqlUrl = `${orgUrl}/${project}/_apis/wit/wiql?api-version=7.0`;
  const wiqlQuery = {
    query: `SELECT [System.Id], [System.Title], [System.IterationPath], [System.AreaPath]
            FROM WorkItems 
            WHERE [System.TeamProject] = '${project}'
            AND [System.WorkItemType] = 'Epic' 
            AND [System.State] <> 'Closed'
            ORDER BY [System.AreaPath]`
  };

  console.log('\n--- Query 1: Fetch Epics (Project Scoped) ---');
  console.log('URL:', wiqlUrl);
  console.log('WIQL Query:', wiqlQuery.query);
  console.log(`Scope: Project '${project}' ONLY`);

  const queryResponse = await fetch(wiqlUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(wiqlQuery)
  });

  const queryResult = await queryResponse.json();
  console.log(`Found ${queryResult.workItems?.length || 0} epics in project '${project}'`);
  
  if (!queryResult.workItems || queryResult.workItems.length === 0) {
    console.log('No epics found, returning empty array');
    return [];
  }

  const workItemIds = queryResult.workItems.map((wi: any) => wi.id);
  console.log('Epic IDs:', workItemIds);
  
  // Get Epic details - EXPLICIT PROJECT SCOPE
  const epicsUrl = `${orgUrl}/${project}/_apis/wit/workitems?ids=${workItemIds.join(',')}&fields=System.Id,System.Title,System.IterationPath,System.AreaPath,System.TeamProject&api-version=7.0`;
  console.log('\n--- Query 2: Get Epic Details (Project Scoped) ---');
  console.log('URL:', epicsUrl);
  
  const epicsResponse = await fetch(epicsUrl, { headers });
  const epicsData = await epicsResponse.json();
  
  // Filter to ensure only project-specific epics
  const projectEpics = epicsData.value.filter((wi: any) => wi.fields['System.TeamProject'] === project);
  console.log(`Retrieved ${epicsData.value?.length || 0} epics, ${projectEpics.length} belong to project '${project}'`);
  
  if (projectEpics.length === 0) {
    console.warn(`WARNING: All epics filtered out - they don't belong to project '${project}'`);
  }

  // Fetch iterations from project classification nodes (Project Configuration)
  const classificationNodesUrl = `${orgUrl}/${project}/_apis/wit/classificationnodes/iterations?$depth=10&api-version=7.0`;
  console.log('\n--- Query 3: Fetch Project Iteration Configuration ---');
  console.log('URL:', classificationNodesUrl);
  console.log(`Scope: Project '${project}' classification nodes (Project Settings)`);
  console.log('Fetching iteration tree with depth=10');
  
  const classificationResponse = await fetch(classificationNodesUrl, { headers });
  const classificationData = await classificationResponse.json();
  
  console.log('Classification node structure:', classificationData.structureType);
  console.log('Root iteration:', classificationData.name);
  console.log('Has children:', classificationData.hasChildren);
  
  // Extract all iterations recursively from the classification tree
  const iterationMap = extractIterationsFromNode(classificationData, project);
  
  console.log(`\nTotal iterations found in project configuration: ${iterationMap.size}`);
  console.log('\nAll iteration path variations mapped:');
  iterationMap.forEach((dates, path) => {
    console.log(`  "${path}": ${dates.startDate} to ${dates.finishDate}`);
  });

  const valueStreamMap = new Map<string, Epic[]>();
  let skippedEpics = 0;
  let processedEpics = 0;

  console.log('\n=== Processing Epics (Project Scoped) ===');
  
  for (const wi of projectEpics) {
    const teamProject = wi.fields['System.TeamProject'];
    const areaPath = wi.fields['System.AreaPath'];
    const iterationPath = wi.fields['System.IterationPath'];
    
    console.log(`\nEpic ${wi.id}: ${wi.fields['System.Title']}`);
    console.log(`  Team Project: ${teamProject}`);
    console.log(`  Area Path: ${areaPath}`);
    console.log(`  Iteration Path: ${iterationPath}`);
    
    // Double-check project scope
    if (teamProject !== project) {
      console.log(`  ❌ SKIPPED: Belongs to different project '${teamProject}' (expected '${project}')`);
      skippedEpics++;
      continue;
    }
    
    // Skip if no iteration path
    if (!iterationPath) {
      console.log(`  ❌ SKIPPED: No iteration path`);
      skippedEpics++;
      continue;
    }
    
    // Look up iteration dates with path normalization
    const iterationDates = findIterationDates(iterationPath, project, iterationMap);
    
    // Skip if iteration dates not found
    if (!iterationDates) {
      console.log(`  ❌ SKIPPED: Iteration '${iterationPath}' not found in project configuration`);
      console.log(`  Tried variations: ${normalizeIterationPath(iterationPath, project).join(', ')}`);
      skippedEpics++;
      continue;
    }
    
    console.log(`  ✅ Valid iteration: ${iterationDates.startDate} to ${iterationDates.finishDate}`);
    processedEpics++;
    
    const epic: Epic = {
      id: wi.id.toString(),
      title: wi.fields['System.Title'],
      iterationStart: iterationDates.startDate,
      iterationEnd: iterationDates.finishDate,
      features: []
    };

    // Query for Features - PROJECT SCOPED WITH EXPLICIT FILTER
    const featureWiqlUrl = `${orgUrl}/${project}/_apis/wit/wiql?api-version=7.0`;
    const featureQuery = {
      query: `SELECT [System.Id], [System.Title] 
              FROM WorkItemLinks 
              WHERE [Source].[System.Id] = ${wi.id}
              AND [Source].[System.TeamProject] = '${project}'
              AND [Target].[System.TeamProject] = '${project}'
              AND [System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward'
              AND [Target].[System.WorkItemType] = 'Feature'
              MODE (Recursive)`
    };

    console.log(`  --- Query: Fetch Features for Epic ${wi.id} (Project Scoped) ---`);
    console.log(`  WIQL:`, featureQuery.query);

    const featureQueryResponse = await fetch(featureWiqlUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(featureQuery)
    });

    const featureResult = await featureQueryResponse.json();
    console.log(`  Found ${featureResult.workItemRelations?.length || 0} feature links in project '${project}'`);
    
    if (featureResult.workItemRelations && featureResult.workItemRelations.length > 0) {
      const featureIds = featureResult.workItemRelations
        .filter((rel: any) => rel.target)
        .map((rel: any) => rel.target.id);
      
      console.log(`  Feature IDs:`, featureIds);
      
      if (featureIds.length > 0) {
        const featuresUrl = `${orgUrl}/${project}/_apis/wit/workitems?ids=${featureIds.join(',')}&fields=System.Id,System.Title,System.IterationPath,System.TeamProject&api-version=7.0`;
        console.log(`  --- Query: Get Feature Details (Project Scoped) ---`);
        console.log(`  URL:`, featuresUrl);
        
        const featuresResponse = await fetch(featuresUrl, { headers });
        const featuresData = await featuresResponse.json();
        
        // Filter to ensure only project-specific features
        const projectFeatures = featuresData.value.filter((f: any) => f.fields['System.TeamProject'] === project);
        console.log(`  Retrieved ${featuresData.value?.length || 0} features, ${projectFeatures.length} belong to project '${project}'`);

        for (const f of projectFeatures) {
          const featureProject = f.fields['System.TeamProject'];
          const featureIterationPath = f.fields['System.IterationPath'];
          
          console.log(`    Feature ${f.id}: ${f.fields['System.Title']}`);
          console.log(`      Team Project: ${featureProject}`);
          console.log(`      Iteration Path: ${featureIterationPath}`);
          
          // Double-check project scope
          if (featureProject !== project) {
            console.log(`      ❌ SKIPPED: Belongs to different project '${featureProject}' (expected '${project}')`);
            continue;
          }
          
          // Skip feature if no iteration path
          if (!featureIterationPath) {
            console.log(`      ❌ SKIPPED: No iteration path`);
            continue;
          }
          
          const featureIterationDates = findIterationDates(featureIterationPath, project, iterationMap);
          
          // Skip feature if iteration dates not found
          if (!featureIterationDates) {
            console.log(`      ❌ SKIPPED: Iteration '${featureIterationPath}' not found in project configuration`);
            continue;
          }
          
          console.log(`      ✅ Valid iteration: ${featureIterationDates.startDate} to ${featureIterationDates.finishDate}`);
          
          epic.features.push({
            id: f.id.toString(),
            title: f.fields['System.Title'],
            iterationStart: featureIterationDates.startDate,
            iterationEnd: featureIterationDates.finishDate
          });
        }
      }
    }

    console.log(`  Total features added: ${epic.features.length}`);

    if (!valueStreamMap.has(areaPath)) {
      valueStreamMap.set(areaPath, []);
    }
    valueStreamMap.get(areaPath)!.push(epic);
  }

  console.log('\n=== Summary ===');
  console.log(`Project Scope: '${project}' ONLY`);
  console.log(`Iterations fetched from: Project Configuration (Classification Nodes)`);
  console.log(`Total epics processed: ${processedEpics}`);
  console.log(`Total epics skipped: ${skippedEpics}`);
  console.log(`Value streams found: ${valueStreamMap.size}`);
  
  valueStreamMap.forEach((epics, vsName) => {
    console.log(`  ${vsName}: ${epics.length} epics, ${epics.reduce((sum, e) => sum + e.features.length, 0)} features`);
  });

  // Filter out value streams with no epics
  const result = Array.from(valueStreamMap.entries())
    .filter(([_, epics]) => epics.length > 0)
    .map(([name, epics]) => ({
      id: name.replace(/[^a-zA-Z0-9]/g, '-'),
      name: name.split('\\').pop() || name,
      epics
    }));

  console.log(`\nReturning ${result.length} value streams from project '${project}'`);
  console.log('=== End Work Items Fetch ===\n');

  return result;
}

export async function fetchWorkItemsFromQuery(queryGuid: string): Promise<ValueStream[]> {
  console.log('=== Starting Work Items Fetch (Query GUID) ===');
  console.log(`Query GUID: ${queryGuid}`);
  
  const client = getClient(WorkItemTrackingRestClient);
  const projectService = await SDK.getService('ms.vss-tfs-web.tfs-page-data-service');
  const projectData = await (projectService as any).getPageData();
  const projectId = projectData.project.id;
  const projectName = projectData.project.name;

  console.log(`Project ID: ${projectId}`);
  console.log(`Project Name: ${projectName}`);
  console.log(`Scope: Project '${projectName}' ONLY`);

  console.log('\n--- Query: Execute saved query (Project Scoped) ---');
  const queryResult = await client.queryById(queryGuid, projectId);
  console.log(`Query returned ${queryResult.workItems?.length || 0} work items from project '${projectName}'`);
  
  if (!queryResult.workItems || queryResult.workItems.length === 0) {
    console.log('No work items found, returning empty array');
    return [];
  }

  const workItemIds = queryResult.workItems.map(wi => wi.id!);
  console.log('Work Item IDs:', workItemIds);

  console.log('\n--- Query: Get work item details (Project Scoped) ---');
  const workItems = await client.getWorkItems(
    workItemIds,
    projectId,
    ['System.Id', 'System.Title', 'System.IterationPath', 'System.AreaPath', 'System.WorkItemType', 'System.TeamProject']
  );
  console.log(`Retrieved ${workItems.length} work items`);

  // Filter to ensure only project-specific work items
  const projectWorkItems = workItems.filter(wi => wi.fields['System.TeamProject'] === projectName);
  console.log(`${projectWorkItems.length} work items belong to project '${projectName}'`);

  const epics = projectWorkItems.filter(wi => wi.fields['System.WorkItemType'] === 'Epic');
  const features = projectWorkItems.filter(wi => wi.fields['System.WorkItemType'] === 'Feature');
  
  console.log(`Epics: ${epics.length}, Features: ${features.length}`);

  // Fetch iterations from project classification nodes using SDK
  console.log('\n--- Query: Fetch Project Iteration Configuration (SDK) ---');
  console.log(`Fetching classification nodes for project '${projectName}'`);
  
  const iterationMap = new Map<string, { startDate: string; finishDate: string }>();
  
  try {
    // Get classification nodes (iterations) from the project
    const classificationNode = await client.getClassificationNode(
      projectId, 
      TreeStructureGroup.Iterations, 
      undefined, 
      10
    );
    console.log('Classification node structure:', classificationNode.structureType);
    console.log('Root iteration:', classificationNode.name);
    
    // Extract iterations recursively
    const extractedIterations = extractIterationsFromNode(classificationNode, projectName);
    extractedIterations.forEach((value, key) => {
      iterationMap.set(key, value);
    });
    
    console.log(`Total iterations found in project configuration: ${iterationMap.size}`);
    console.log('\nAll iteration path variations mapped:');
    iterationMap.forEach((dates, path) => {
      console.log(`  "${path}": ${dates.startDate} to ${dates.finishDate}`);
    });
  } catch (error) {
    console.error('Error fetching classification nodes:', error);
    console.log('Continuing without iteration dates - all items will be skipped');
  }
  
  const valueStreamMap = new Map<string, Epic[]>();
  let skippedEpics = 0;
  let processedEpics = 0;

  console.log('\n=== Processing Epics (Project Scoped) ===');

  for (const epicWi of epics) {
    const teamProject = epicWi.fields['System.TeamProject'];
    const areaPath = epicWi.fields['System.AreaPath'];
    const iterationPath = epicWi.fields['System.IterationPath'];
    
    console.log(`\nEpic ${epicWi.id}: ${epicWi.fields['System.Title']}`);
    console.log(`  Team Project: ${teamProject}`);
    console.log(`  Area Path: ${areaPath}`);
    console.log(`  Iteration Path: ${iterationPath}`);
    
    // Double-check project scope
    if (teamProject !== projectName) {
      console.log(`  ❌ SKIPPED: Belongs to different project '${teamProject}' (expected '${projectName}')`);
      skippedEpics++;
      continue;
    }
    
    // Skip if no iteration path
    if (!iterationPath) {
      console.log(`  ❌ SKIPPED: No iteration path`);
      skippedEpics++;
      continue;
    }
    
    // Try to get iteration dates from map with path normalization
    const iterationData = findIterationDates(iterationPath, projectName, iterationMap);
    
    // Skip if iteration dates not found
    if (!iterationData) {
      console.log(`  ❌ SKIPPED: Iteration '${iterationPath}' not found in project configuration`);
      console.log(`  Tried variations: ${normalizeIterationPath(iterationPath, projectName).join(', ')}`);
      skippedEpics++;
      continue;
    }
    
    console.log(`  ✅ Valid iteration: ${iterationData.startDate} to ${iterationData.finishDate}`);
    processedEpics++;
    
    const epic: Epic = {
      id: epicWi.id!.toString(),
      title: epicWi.fields['System.Title'],
      iterationStart: iterationData.startDate,
      iterationEnd: iterationData.finishDate,
      features: []
    };

    const epicRelations = epicWi.relations || [];
    const childFeatureIds = epicRelations
      .filter(rel => rel.rel === 'System.LinkTypes.Hierarchy-Forward')
      .map(rel => parseInt(rel.url.split('/').pop()!));

    console.log(`  Child feature IDs: ${childFeatureIds.length > 0 ? childFeatureIds : 'none'}`);

    for (const f of features.filter(feat => childFeatureIds.includes(feat.id!))) {
      const featureProject = f.fields['System.TeamProject'];
      const featureIterationPath = f.fields['System.IterationPath'];
      
      console.log(`    Feature ${f.id}: ${f.fields['System.Title']}`);
      console.log(`      Team Project: ${featureProject}`);
      console.log(`      Iteration Path: ${featureIterationPath}`);
      
      // Double-check project scope
      if (featureProject !== projectName) {
        console.log(`      ❌ SKIPPED: Belongs to different project '${featureProject}' (expected '${projectName}')`);
        continue;
      }
      
      // Skip feature if no iteration path
      if (!featureIterationPath) {
        console.log(`      ❌ SKIPPED: No iteration path`);
        continue;
      }
      
      const featureIterationData = findIterationDates(featureIterationPath, projectName, iterationMap);
      
      // Skip feature if iteration dates not found
      if (!featureIterationData) {
        console.log(`      ❌ SKIPPED: Iteration '${featureIterationPath}' not found in project configuration`);
        continue;
      }
      
      console.log(`      ✅ Valid iteration: ${featureIterationData.startDate} to ${featureIterationData.finishDate}`);
      
      epic.features.push({
        id: f.id!.toString(),
        title: f.fields['System.Title'],
        iterationStart: featureIterationData.startDate,
        iterationEnd: featureIterationData.finishDate
      });
    }

    console.log(`  Total features added: ${epic.features.length}`);

    if (!valueStreamMap.has(areaPath)) {
      valueStreamMap.set(areaPath, []);
    }
    valueStreamMap.get(areaPath)!.push(epic);
  }

  console.log('\n=== Summary ===');
  console.log(`Project Scope: '${projectName}' ONLY`);
  console.log(`Iterations fetched from: Project Configuration (Classification Nodes)`);
  console.log(`Total epics processed: ${processedEpics}`);
  console.log(`Total epics skipped: ${skippedEpics}`);
  console.log(`Value streams found: ${valueStreamMap.size}`);
  
  valueStreamMap.forEach((epics, vsName) => {
    console.log(`  ${vsName}: ${epics.length} epics, ${epics.reduce((sum, e) => sum + e.features.length, 0)} features`);
  });

  // Filter out value streams with no epics
  const result = Array.from(valueStreamMap.entries())
    .filter(([_, epics]) => epics.length > 0)
    .map(([name, epics]) => ({
      id: name.replace(/[^a-zA-Z0-9]/g, '-'),
      name: name.split('\\').pop() || name,
      epics
    }));

  console.log(`\nReturning ${result.length} value streams from project '${projectName}'`);
  console.log('=== End Work Items Fetch (Query GUID) ===\n');

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