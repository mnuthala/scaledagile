// Complete updated azure-devops-service.ts with User Story counts

// At the top of the file, add:
export type { Epic, Feature, ValueStream } from '../types/timeline.types';

import * as SDK from 'azure-devops-extension-sdk';
import { WorkItemTrackingRestClient, TreeStructureGroup } from 'azure-devops-extension-api/WorkItemTracking';
import { getClient } from 'azure-devops-extension-api';

// Helper function to recursively extract iterations from classification nodes
function extractIterationsFromNode(node: any, projectName: string, parentPath: string = ''): Map<string, { startDate: string; finishDate: string }> {
  const iterationMap = new Map<string, { startDate: string; finishDate: string }>();
  
  if (!node) return iterationMap;
  
  // Build the full path
  let currentPath: string;
  if (!parentPath) {
    currentPath = node.name;
  } else {
    currentPath = `${parentPath}\\${node.name}`;
  }
  
  // If this node has attributes (dates), add it to the map
  if (node.attributes && node.attributes.startDate && node.attributes.finishDate) {
    console.log(`    Found iteration: ${currentPath}`);
    console.log(`      Start: ${node.attributes.startDate}`);
    console.log(`      End: ${node.attributes.finishDate}`);
    
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

  // Query for Epics with their Features - PROJECT SCOPED
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
            MODE (MustContain)
            ORDER BY [System.AreaPath]`
  };

  console.log('\n--- Query 1: Fetch Epics with Features (Project Scoped) ---');
  console.log('URL:', wiqlUrl);
  console.log('WIQL Query:', wiqlQuery.query);

  const queryResponse = await fetch(wiqlUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(wiqlQuery)
  });

  const queryResult = await queryResponse.json();
  const epicRelations = queryResult.workItemRelations || [];
  console.log(`Found ${epicRelations.length} epic-feature relationships in project '${project}'`);
  
  if (epicRelations.length === 0) {
    console.log('No epics with features found, returning empty array');
    return [];
  }

  // Extract unique Epic IDs from the relations
  const epicIdsSet = new Set<number>();
  const epicFeatureMap = new Map<number, number[]>();
  
  for (const rel of epicRelations) {
    if (rel.source) {
      const epicId = rel.source.id;
      epicIdsSet.add(epicId);
      
      if (!epicFeatureMap.has(epicId)) {
        epicFeatureMap.set(epicId, []);
      }
      
      // Add feature ID if it's a target
      if (rel.target && rel.target.id !== epicId) {
        epicFeatureMap.get(epicId)!.push(rel.target.id);
      }
    }
  }
  
  const workItemIds = Array.from(epicIdsSet);
  console.log(`Unique Epic IDs: ${workItemIds.length}`);
  console.log('Epic IDs:', workItemIds);
  
  // Log feature counts per epic
  console.log('\nFeature counts per Epic:');
  epicFeatureMap.forEach((featureIds, epicId) => {
    console.log(`  Epic ${epicId}: ${featureIds.length} features`);
  });
  
  if (workItemIds.length === 0) {
    console.log('No epic IDs found, returning empty array');
    return [];
  }
  
  // Get Epic details
  const epicsUrl = `${orgUrl}/${project}/_apis/wit/workitems?ids=${workItemIds.join(',')}&fields=System.Id,System.Title,System.IterationPath,System.AreaPath,System.TeamProject&api-version=7.0`;
  console.log('\n--- Query 2: Get Epic Details (Project Scoped) ---');
  
  const epicsResponse = await fetch(epicsUrl, { headers });
  const epicsData = await epicsResponse.json();
  
  const projectEpics = epicsData.value.filter((wi: any) => wi.fields['System.TeamProject'] === project);
  console.log(`Retrieved ${epicsData.value?.length || 0} epics, ${projectEpics.length} belong to project '${project}'`);

  // Fetch iterations from project classification nodes
  const classificationNodesUrl = `${orgUrl}/${project}/_apis/wit/classificationnodes/iterations?$depth=10&api-version=7.0`;
  console.log('\n--- Query 3: Fetch Project Iteration Configuration ---');
  
  const classificationResponse = await fetch(classificationNodesUrl, { headers });
  const classificationData = await classificationResponse.json();
  
  const iterationMap = extractIterationsFromNode(classificationData, project);
  console.log(`\nTotal iterations found in project configuration: ${iterationMap.size}`);

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
    
    if (teamProject !== project) {
      console.log(`  ❌ SKIPPED: Belongs to different project`);
      skippedEpics++;
      continue;
    }
    
    if (!iterationPath) {
      console.log(`  ❌ SKIPPED: No iteration path`);
      skippedEpics++;
      continue;
    }
    
    const iterationDates = findIterationDates(iterationPath, project, iterationMap);
    
    if (!iterationDates) {
      console.log(`  ❌ SKIPPED: Iteration not found in project configuration`);
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
      features: [],
      featureCount: epicFeatureMap.get(wi.id)?.length || 0
    };

    console.log(`  Feature count (from initial query): ${epic.featureCount}`);

    // Get the feature IDs for this epic from our map
    const featureIds = epicFeatureMap.get(wi.id) || [];
    
    if (featureIds.length > 0) {
      console.log(`  Feature IDs:`, featureIds);
      
      const featuresUrl = `${orgUrl}/${project}/_apis/wit/workitems?ids=${featureIds.join(',')}&fields=System.Id,System.Title,System.IterationPath,System.TeamProject&api-version=7.0`;
        const featuresResponse = await fetch(featuresUrl, { headers });
        const featuresData = await featuresResponse.json();
        
        const projectFeatures = featuresData.value.filter((f: any) => f.fields['System.TeamProject'] === project);
        console.log(`  Retrieved ${featuresData.value?.length || 0} features, ${projectFeatures.length} belong to project`);

        for (const f of projectFeatures) {
          const featureProject = f.fields['System.TeamProject'];
          const featureIterationPath = f.fields['System.IterationPath'];
          
          console.log(`    Feature ${f.id}: ${f.fields['System.Title']}`);
          console.log(`      Team Project: ${featureProject}`);
          console.log(`      Iteration Path: ${featureIterationPath}`);
          
          if (featureProject !== project) {
            console.log(`      ❌ SKIPPED: Different project`);
            continue;
          }
          
          if (!featureIterationPath) {
            console.log(`      ❌ SKIPPED: No iteration path`);
            continue;
          }
          
          const featureIterationDates = findIterationDates(featureIterationPath, project, iterationMap);
          
          if (!featureIterationDates) {
            console.log(`      ❌ SKIPPED: Iteration not found`);
            continue;
          }
          
          console.log(`      ✅ Valid iteration: ${featureIterationDates.startDate} to ${featureIterationDates.finishDate}`);
          
          // Query for User Stories count under this Feature
          const userStoryWiqlUrl = `${orgUrl}/${project}/_apis/wit/wiql?api-version=7.0`;
          const userStoryQuery = {
            query: `SELECT [System.Id] 
                    FROM WorkItemLinks 
                    WHERE [Source].[System.Id] = ${f.id}
                    AND [System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward'
                    AND [Target].[System.WorkItemType] = 'User Story'
                    AND [Target].[System.TeamProject] = '${project}'
                    MODE (MustContain)`
          };

          console.log(`      --- Query: Fetch User Stories for Feature ${f.id} ---`);
          
          const userStoryQueryResponse = await fetch(userStoryWiqlUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(userStoryQuery)
          });

          const userStoryResult = await userStoryQueryResponse.json();
          const userStoryRelations = userStoryResult.workItemRelations || [];
          
          // Filter out the source Feature itself and count targets
          const userStoryCount = userStoryRelations
            .filter((rel: any) => rel.target && rel.target.id !== f.id)
            .length;
          
          console.log(`      User Stories count: ${userStoryCount}`);
          
          epic.features.push({
            id: f.id.toString(),
            title: f.fields['System.Title'],
            iterationStart: featureIterationDates.startDate,
            iterationEnd: featureIterationDates.finishDate,
            userStoryCount: userStoryCount
          });
        }
      }
    } else {
      console.log(`  No features found for this epic`);
    }

    console.log(`  Total features added: ${epic.features.length}`);

    if (!valueStreamMap.has(areaPath)) {
      valueStreamMap.set(areaPath, []);
    }
    valueStreamMap.get(areaPath)!.push(epic);
  }

  console.log('\n=== Summary ===');
  console.log(`Total epics processed: ${processedEpics}`);
  console.log(`Total epics skipped: ${skippedEpics}`);
  console.log(`Value streams found: ${valueStreamMap.size}`);

  const result = Array.from(valueStreamMap.entries())
    .filter(([_, epics]) => epics.length > 0)
    .map(([name, epics]) => ({
      id: name.replace(/[^a-zA-Z0-9]/g, '-'),
      name: name.split('\\').pop() || name,
      epics
    }));

  console.log(`\nReturning ${result.length} value streams`);
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

  console.log('\n--- Query: Execute saved query ---');
  const queryResult = await client.queryById(queryGuid, projectId);
  console.log(`Query returned ${queryResult.workItems?.length || 0} work items`);
  
  if (!queryResult.workItems || queryResult.workItems.length === 0) {
    console.log('No work items found, returning empty array');
    return [];
  }

  const workItemIds = queryResult.workItems.map(wi => wi.id!);
  console.log('Work Item IDs:', workItemIds);

  console.log('\n--- Query: Get work item details ---');
  const workItems = await client.getWorkItems(
    workItemIds,
    projectId,
    ['System.Id', 'System.Title', 'System.IterationPath', 'System.AreaPath', 'System.WorkItemType', 'System.TeamProject']
  );
  console.log(`Retrieved ${workItems.length} work items`);

  const projectWorkItems = workItems.filter(wi => wi.fields['System.TeamProject'] === projectName);
  console.log(`${projectWorkItems.length} work items belong to project`);

  const epics = projectWorkItems.filter(wi => wi.fields['System.WorkItemType'] === 'Epic');
  const features = projectWorkItems.filter(wi => wi.fields['System.WorkItemType'] === 'Feature');
  
  console.log(`Epics: ${epics.length}, Features: ${features.length}`);

  // Fetch iterations
  console.log('\n--- Query: Fetch Project Iteration Configuration ---');
  
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
    
    console.log(`Total iterations found: ${iterationMap.size}`);
  } catch (error) {
    console.error('Error fetching classification nodes:', error);
  }
  
  const valueStreamMap = new Map<string, Epic[]>();
  let skippedEpics = 0;
  let processedEpics = 0;

  console.log('\n=== Processing Epics ===');

  for (const epicWi of epics) {
    const teamProject = epicWi.fields['System.TeamProject'];
    const areaPath = epicWi.fields['System.AreaPath'];
    const iterationPath = epicWi.fields['System.IterationPath'];
    
    console.log(`\nEpic ${epicWi.id}: ${epicWi.fields['System.Title']}`);
    console.log(`  Iteration Path: ${iterationPath}`);
    
    if (teamProject !== projectName) {
      console.log(`  ❌ SKIPPED: Different project`);
      skippedEpics++;
      continue;
    }
    
    if (!iterationPath) {
      console.log(`  ❌ SKIPPED: No iteration path`);
      skippedEpics++;
      continue;
    }
    
    const iterationData = findIterationDates(iterationPath, projectName, iterationMap);
    
    if (!iterationData) {
      console.log(`  ❌ SKIPPED: Iteration not found`);
      skippedEpics++;
      continue;
    }
    
    console.log(`  ✅ Valid iteration`);
    processedEpics++;
    
    // Get child feature IDs from relations
    const epicRelations = epicWi.relations || [];
    const childFeatureIds = epicRelations
      .filter(rel => rel.rel === 'System.LinkTypes.Hierarchy-Forward')
      .map(rel => parseInt(rel.url.split('/').pop()!));

    console.log(`  Child feature IDs: ${childFeatureIds.length > 0 ? childFeatureIds : 'none'}`);
    
    const epic: Epic = {
      id: epicWi.id!.toString(),
      title: epicWi.fields['System.Title'],
      iterationStart: iterationData.startDate,
      iterationEnd: iterationData.finishDate,
      features: [],
      featureCount: childFeatureIds.length
    };

    console.log(`  Feature count: ${epic.featureCount}`);

    for (const f of features.filter(feat => childFeatureIds.includes(feat.id!))) {
      const featureProject = f.fields['System.TeamProject'];
      const featureIterationPath = f.fields['System.IterationPath'];
      
      console.log(`    Feature ${f.id}: ${f.fields['System.Title']}`);
      
      if (featureProject !== projectName) {
        console.log(`      ❌ SKIPPED: Different project`);
        continue;
      }
      
      if (!featureIterationPath) {
        console.log(`      ❌ SKIPPED: No iteration path`);
        continue;
      }
      
      const featureIterationData = findIterationDates(featureIterationPath, projectName, iterationMap);
      
      if (!featureIterationData) {
        console.log(`      ❌ SKIPPED: Iteration not found`);
        continue;
      }
      
      console.log(`      ✅ Valid iteration`);
      
      // Query for User Stories count using SDK
      try {
        const userStoryQuery = {
          query: `SELECT [System.Id] 
                  FROM WorkItemLinks 
                  WHERE [Source].[System.Id] = ${f.id}
                  AND [System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward'
                  AND [Target].[System.WorkItemType] = 'User Story'
                  AND [Target].[System.TeamProject] = '${projectName}'
                  MODE (MustContain)`
        };
        
        const userStoryResult = await client.queryByWiql(userStoryQuery, projectId);
        const userStoryRelations = userStoryResult.workItemRelations || [];
        
        // Count actual user stories (exclude source)
        const userStoryCount = userStoryRelations
          .filter(rel => rel.target && rel.target.id !== f.id)
          .length;
        
        console.log(`      User Stories count: ${userStoryCount}`);
        
        epic.features.push({
          id: f.id!.toString(),
          title: f.fields['System.Title'],
          iterationStart: featureIterationData.startDate,
          iterationEnd: featureIterationData.finishDate,
          userStoryCount: userStoryCount
        });
      } catch (error) {
        console.error(`      Error fetching user stories: ${error}`);
        // Add feature without user story count
        epic.features.push({
          id: f.id!.toString(),
          title: f.fields['System.Title'],
          iterationStart: featureIterationData.startDate,
          iterationEnd: featureIterationData.finishDate,
          userStoryCount: 0
        });
      }
    }

    console.log(`  Total features added: ${epic.features.length}`);

    if (!valueStreamMap.has(areaPath)) {
      valueStreamMap.set(areaPath, []);
    }
    valueStreamMap.get(areaPath)!.push(epic);
  }

  console.log('\n=== Summary ===');
  console.log(`Total epics processed: ${processedEpics}`);
  console.log(`Total epics skipped: ${skippedEpics}`);

  const result = Array.from(valueStreamMap.entries())
    .filter(([_, epics]) => epics.length > 0)
    .map(([name, epics]) => ({
      id: name.replace(/[^a-zA-Z0-9]/g, '-'),
      name: name.split('\\').pop() || name,
      epics
    }));

  console.log(`\nReturning ${result.length} value streams`);
  console.log('=== End Work Items Fetch ===\n');

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