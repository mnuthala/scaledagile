import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronRight, ExternalLink, FileText, CheckSquare, AlertCircle, XCircle } from 'lucide-react';
import { UserStoryProgress } from '../../types/timeline.types';
import { useSettings } from './SettingsContext';

type WorkItemType = 'epic' | 'feature' | 'story' | 'task';

interface WorkItemCardConfig {
  type: WorkItemType;
  borderColor: string;
  progressBarColor: string;
  height: number;
  showChevron?: boolean;
  showProgress?: boolean;
}

interface WorkItemCardProps {
  id: string;
  title: string;
  iterationStart: string;
  iterationEnd: string;
  yOffset: number;
  barStyle: any;
  progress?: UserStoryProgress;
  config: WorkItemCardConfig;
  isExpanded?: boolean;
  onToggle?: () => void;
  onClick?: () => void;
  hasBlockedDescendant?: boolean;
  metadata?: {
    tags?: string[] | string;
    childWorkItemType?: string;
    [key: string]: any;
  };
}

const DEFAULT_CONFIGS: Record<WorkItemType, Partial<WorkItemCardConfig>> = {
  epic: {
    borderColor: 'border-blue-500',
    progressBarColor: 'bg-green-500',
    height: 100,
    showChevron: true,
    showProgress: true,
  },
  feature: {
    borderColor: 'border-green-500',
    progressBarColor: 'bg-green-500',
    height: 80,
    showChevron: false,
    showProgress: true,
  },
  story: {
    borderColor: 'border-yellow-500',
    progressBarColor: 'bg-green-500',
    height: 50,
    showChevron: false,
    showProgress: false,
  },
  task: {
    borderColor: 'border-gray-500',
    progressBarColor: 'bg-green-500',
    height: 35,
    showChevron: false,
    showProgress: false,
  },
};

// Helper function to extract background color from Tailwind class
const getBackgroundStyle = (tailwindClass: string): string => {
  const colorMap: { [key: string]: string } = {
    'bg-blue-500': '#3b82f6',
    'bg-green-500': '#22c55e',
    'bg-yellow-500': '#eab308',
    'bg-red-500': '#ef4444',
    'bg-orange-500': '#f97316',
    'bg-purple-500': '#a855f7',
    'bg-pink-500': '#ec4899',
    'bg-indigo-500': '#6366f1',
    'bg-teal-500': '#14b8a6',
    'bg-cyan-500': '#06b6d4',
    'bg-gray-500': '#6b7280',
    'bg-slate-500': '#64748b',
  };
  return colorMap[tailwindClass] || '#22c55e';
};

// Helper to get work item type icon
const getWorkItemIcon = (workItemType: string) => {
  const type = workItemType?.toLowerCase() || '';
  
  if (type.includes('story') || type.includes('backlog item')) {
    return <FileText className="w-4 h-4" />;
  }
  if (type.includes('task')) {
    return <CheckSquare className="w-4 h-4" />;
  }
  if (type.includes('bug')) {
    return <AlertCircle className="w-4 h-4" />;
  }
  if (type.includes('milestone')) {
    return <span className="w-4 h-4 flex items-center justify-center text-sm">🏁</span>;
  }
  
  return null;
};

// Helper to determine if should show icon badge
const shouldShowIconBadge = (workItemType: string) => {
  const type = workItemType?.toLowerCase() || '';
  return type.includes('story') || 
         type.includes('backlog item') || 
         type.includes('task') || 
         type.includes('bug') ||
         type.includes('milestone');
};

export const WorkItemCard: React.FC<WorkItemCardProps> = ({
  id,
  title,
  iterationStart,
  iterationEnd,
  yOffset,
  barStyle,
  progress = { completed: 0, total: 0 },
  config,
  isExpanded = false,
  onToggle,
  onClick,
  hasBlockedDescendant = false,
  metadata = {},
}) => {
  const { settings } = useSettings();
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  // Update tooltip position when shown
  useEffect(() => {
    if (showTooltip && cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX
      });
    }
  }, [showTooltip]);

  if (barStyle.display === 'none') return null;

  // Merge default config with provided config
  const finalConfig = {
    ...DEFAULT_CONFIGS[config.type],
    ...config,
  } as WorkItemCardConfig;

  const progressPercentage = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

  // Determine child work item type name for progress display
  let childTypeName = 'items';
  
  if (metadata.childWorkItemType) {
    childTypeName = metadata.childWorkItemType.toLowerCase();
  } else {
    // Infer from parent type
    switch (config.type) {
      case 'epic':
        childTypeName = 'features';
        break;
      case 'feature':
        childTypeName = 'stories';
        break;
      case 'story':
        childTypeName = 'tasks';
        break;
      default:
        childTypeName = 'items';
    }
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // Only handle clicks on the card background, not on links
    const target = e.target as HTMLElement;
    if (target.tagName !== 'A' && !target.closest('a')) {
      e.stopPropagation();
      if (onToggle) {
        onToggle();
      } else if (onClick) {
        onClick();
      }
    }
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card toggle when clicking link
    // Link will naturally open in new window via target="_blank"
  };

  // Build Azure DevOps work item URL
  const getWorkItemUrl = () => {
    const orgUrl = process.env.REACT_APP_AZDO_ORG_URL || '';
    const project = process.env.REACT_APP_AZDO_PROJECT || '';
    
    if (orgUrl && project) {
      return `${orgUrl}/${project}/_workitems/edit/${id}`;
    }
    
    // Fallback for extension mode - relative URL
    return `/_workitems/edit/${id}`;
  };

  const isClickable = onToggle || onClick;
  const showIconBadge = shouldShowIconBadge(metadata.workItemType || '');
  
  // Check if work item is blocked
  const isBlocked = () => {
    // Check state
    if (metadata.state?.toLowerCase() === 'blocked') {
      return true;
    }
    
    // Check tags
    if (metadata.tags) {
      const tagsStr = Array.isArray(metadata.tags) 
        ? metadata.tags.join(',').toLowerCase()
        : String(metadata.tags).toLowerCase();
      
      if (tagsStr.includes('blocked') || tagsStr.includes('#blocked')) {
        return true;
      }
    }
    
    return false;
  };
  
  const blocked = isBlocked();
  const borderColor = blocked ? 'border-red-500' : finalConfig.borderColor;

  // Render tooltip in a portal
  const tooltipContent = showTooltip && (
    <div 
      className="fixed w-72 bg-white rounded-lg shadow-xl border border-gray-300 p-4 pointer-events-none"
      style={{ 
        top: `${tooltipPosition.top - 8}px`,
        left: `${tooltipPosition.left}px`,
        transform: 'translateY(-100%)',
        zIndex: 9999
      }}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-semibold text-sm text-gray-900 flex-1">{title}</h4>
          <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded">#{id}</span>
        </div>
        
        <div className="border-t border-gray-200 pt-2 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Start Date:</span>
            <span className="text-gray-900 font-medium">{new Date(iterationStart).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">End Date:</span>
            <span className="text-gray-900 font-medium">{new Date(iterationEnd).toLocaleDateString()}</span>
          </div>
          
          {metadata.state && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">State:</span>
              <span className="text-gray-900 font-medium">{metadata.state}</span>
            </div>
          )}
          
          {metadata.workItemType && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Type:</span>
              <span className="text-gray-900 font-medium">{metadata.workItemType}</span>
            </div>
          )}
          
          {progress.total > 0 && (
            <>
              <div className="border-t border-gray-200 pt-1.5 mt-1.5">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-500">Progress:</span>
                  <span className="text-gray-900 font-semibold">{Math.round(progressPercentage)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ 
                        width: `${progressPercentage}%`,
                        backgroundColor: getBackgroundStyle(finalConfig.progressBarColor)
                      }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-600 whitespace-nowrap">
                    {progress.completed}/{progress.total}
                  </span>
                </div>
              </div>
            </>
          )}
          
          {metadata.childCount !== undefined && metadata.childCount > 0 && (
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-gray-500">Children:</span>
              <span className="text-gray-900 font-medium">{metadata.childCount}</span>
            </div>
          )}
        </div>
        
        <div className="border-t border-gray-200 pt-2">
          <p className="text-xs text-gray-500 italic">Click title or icon to open in new window</p>
          {(blocked || hasBlockedDescendant) && (
            <p className="text-xs text-red-600 font-semibold mt-1">
              ⚠️ {blocked ? 'BLOCKED' : 'HAS BLOCKED CHILD'}
            </p>
          )}
        </div>
      </div>
      
      {/* Tooltip arrow */}
      <div 
        className="absolute left-4 top-full w-3 h-3 bg-white border-r border-b border-gray-300 transform rotate-45 -mt-1.5"
      ></div>
    </div>
  );

  return (
    <>
      {/* Render tooltip via portal */}
      {tooltipContent && createPortal(tooltipContent, document.body)}
      
      <div
        ref={cardRef}
        className={`
          absolute bg-white rounded-lg shadow-md border-l-4 ${borderColor}
          ${isClickable ? 'cursor-pointer hover:shadow-lg' : ''}
          ${blocked ? 'ring-2 ring-red-500 ring-opacity-50' : ''}
          transition-shadow z-10 overflow-visible
        `}
        style={{
          ...barStyle,
          top: `${yOffset}px`,
          height: `${finalConfig.height}px`,
        }}
        onClick={isClickable ? handleCardClick : undefined}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className="px-3 py-2 h-full flex flex-col justify-between">
          {/* For stories, tasks, bugs: Show chevron (if has children) and icon */}
          {showIconBadge ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {/* Chevron if has children */}
                  {onToggle && (
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-600" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-600" />
                      )}
                    </div>
                  )}
                  
                  {/* Icon badge */}
                  <a
                    href={getWorkItemUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleLinkClick}
                    className="text-gray-600 hover:text-blue-600 transition-colors"
                    title={`Open ${metadata.workItemType} ${id}`}
                  >
                    {getWorkItemIcon(metadata.workItemType || '')}
                  </a>
                </div>
                
                {/* Blocked descendant indicator for small cards */}
                {hasBlockedDescendant && !blocked && (
                  <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" title="Has blocked child" />
                )}
              </div>
            </>
          ) : (
            <>
              {/* For Epic/Feature: Show full card with title, chevron, progress */}
              {/* Header with title and chevron */}
              <div className="flex items-start gap-2 min-h-0 mb-2">
                {finalConfig.showChevron && onToggle && (
                  <div className="flex-shrink-0 mt-0.5">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-600" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    )}
                  </div>
                )}
                
                <div className="flex-1 min-w-0 flex items-start gap-2">
                  <a
                    href={getWorkItemUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleLinkClick}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline line-clamp-2 leading-tight flex items-start gap-1 group flex-1"
                  >
                    <span className="flex-1">{title}</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
                  </a>
                  
                  {/* Blocked descendant indicator for Epic/Feature */}
                  {hasBlockedDescendant && !blocked && (
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" title="Has blocked child" />
                  )}
                </div>
              </div>

              {/* Metadata section (state) */}
              {metadata.state && (
                <div className={`mb-1 ${config.type === 'feature' ? 'mt-1' : ''}`}>
                  <span className="text-xs text-gray-500 italic">{metadata.state}</span>
                </div>
              )}

              {/* Progress section - Always at bottom */}
              {settings.showProgressBars && finalConfig.showProgress && (
                <div className="mt-auto pt-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-600 font-medium">
                      {progress.completed}/{progress.total} {childTypeName}
                    </span>
                    {progress.total > 0 && (
                      <span className="text-xs text-gray-600 font-semibold">
                        {Math.round(progressPercentage)}%
                      </span>
                    )}
                  </div>
                  {progress.total > 0 && (
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{ 
                          width: `${progressPercentage}%`,
                          backgroundColor: getBackgroundStyle(finalConfig.progressBarColor)
                        }}
                      ></div>
                    </div>
                  )}
                </div>
              )}

              {/* Alternative: Show progress without bar when showProgressBars is false */}
              {!settings.showProgressBars && finalConfig.showProgress && progress.total > 0 && (
                <div className="mt-auto pt-1">
                  <span className="text-xs text-gray-600 font-medium">
                    {progress.completed}/{progress.total} {childTypeName} ({Math.round(progressPercentage)}%)
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};