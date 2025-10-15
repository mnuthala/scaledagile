/**
 * Generic Work Item Types
 * 
 * These types support any hierarchy of work items from Azure DevOps
 * or any other project management system.
 */

export interface GenericWorkItem {
  // Core properties
  id: string;
  title: string;
  name?: string;
  
  // Timeline properties
  iterationStart: string;
  iterationEnd: string;
  
  // Status and categorization
  state?: string;
  stateCategory?: string; // 'Proposed', 'InProgress', 'Completed', etc.
  workItemType?: string; // 'Epic', 'Feature', 'User Story', 'Task', 'Bug', etc.
  
  // Hierarchy
  children?: GenericWorkItem[];
  parentId?: string;
  
  // Progress tracking (optional - can be calculated from children)
  completedCount?: number;
  totalCount?: number;
  
  // Additional metadata
  assignedTo?: string;
  priority?: string | number;
  tags?: string[];
  description?: string;
  
  // Allow any additional properties from the source system
  [key: string]: any;
}

export interface ValueStreamData {
  id: string;
  name: string;
  workItems: GenericWorkItem[];
  
  // Optional metadata
  description?: string;
  owner?: string;
  color?: string;
  
  [key: string]: any;
}

export interface TimelineData {
  valueStreams: ValueStreamData[];
  lastUpdated?: string;
  metadata?: {
    [key: string]: any;
  };
}

/**
 * Example data structure:
 * 
 * {
 *   valueStreams: [
 *     {
 *       id: "vs-1",
 *       name: "Platform Engineering",
 *       workItems: [
 *         {
 *           id: "epic-1",
 *           title: "Modernize Infrastructure",
 *           workItemType: "Epic",
 *           iterationStart: "2024-01-01",
 *           iterationEnd: "2024-06-30",
 *           state: "In Progress",
 *           children: [
 *             {
 *               id: "feature-1",
 *               title: "Migrate to Kubernetes",
 *               workItemType: "Feature",
 *               iterationStart: "2024-01-01",
 *               iterationEnd: "2024-03-31",
 *               state: "In Progress",
 *               children: [
 *                 {
 *                   id: "story-1",
 *                   title: "Setup K8s cluster",
 *                   workItemType: "User Story",
 *                   iterationStart: "2024-01-01",
 *                   iterationEnd: "2024-01-15",
 *                   state: "Done"
 *                 }
 *               ]
 *             }
 *           ]
 *         }
 *       ]
 *     }
 *   ]
 * }
 */