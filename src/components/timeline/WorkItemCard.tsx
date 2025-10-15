import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { UserStoryProgress } from '../../types/timeline.types';
import { useSettings } from './SettingsContext';
import { getWorkItemUrl } from '../../services/azure-devops-service';

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
  metadata?: {
    childWorkItemType?: string;
    state?: string;
    workItemType?: string;
    assignedTo?: string;
    iterationPath?: string;
    [key: string]: any;
  };
}

const DEFAULT_CONFIGS: Record<WorkItemType, Partial<WorkItemCardConfig>> = {
  epic: {
    borderColor: 'border-blue-500',
    progressBarColor: 'bg-blue-500',
    height: 80,
    showChevron: true,
    showProgress: true,
  },
  feature: {
    borderColor: 'border-green-500',
    progressBarColor: 'bg-green-500',
    height: 60,
    showChevron: false,
    showProgress: true,
  },
  story: {
    borderColor: 'border-yellow-500',
    progressBarColor: 'bg-yellow-500',
    height: 40,
    showChevron: false,
    showProgress: false,
  },
  task: {
    borderColor: 'border-gray-500',
    progressBarColor: 'bg-gray-500',
    height: 30,
    showChevron: false,
    showProgress: false,
  },
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
  metadata = {},
}) => {
  const { settings } = useSettings();
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number; side: 'left' | 'right' }>({ 
    x: 0, 
    y: 0, 
    side: 'right' 
  });

  if (barStyle.display === 'none') return null;

  // Merge default config with provided config
  const finalConfig = {
    ...DEFAULT_CONFIGS[config.type],
    ...config,
  } as WorkItemCardConfig;

  const progressPercentage = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

  // Determine child work item type name for progress display - MUST be before JSX
  let childTypeName = 'items';
  
  // First priority: use metadata if provided
  if (metadata.childWorkItemType) {
    console.log(`Using metadata childWorkItemType: ${metadata.childWorkItemType}`);
    childTypeName = metadata.childWorkItemType.toLowerCase();
  } else {
    console.log(`No metadata.childWorkItemType for ${title}, config.type: ${config.type}`);
    
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
  
  console.log(`Card: ${title} (${config.type}) showing progress as: ${progress.completed}/${progress.total} ${childTypeName}`);
  console.log(`Card config:`, { 
    type: config.type, 
    showProgress: finalConfig.showProgress, 
    showChevron: finalConfig.showChevron,
    settingsShowProgressBars: settings.showProgressBars,
    progressTotal: progress.total
  });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Only toggle if there's an onToggle handler (for items with children)
    if (onToggle) {
      onToggle();
    } else if (onClick) {
      onClick();
    }
  };
  
  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getWorkItemUrl(id);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const tooltipWidth = 320; // max-w-xs is approximately 320px
    
    // Determine if tooltip should appear on left or right
    const spaceOnRight = viewportWidth - rect.right;
    const spaceOnLeft = rect.left;
    
    // Default to right side, but switch to left if not enough space
    const showOnLeft = spaceOnRight < tooltipWidth && spaceOnLeft > spaceOnRight;
    
    // Position at the center of the card's left or right edge
    setTooltipPosition({
      x: showOnLeft ? rect.left : rect.right,
      y: rect.top + rect.height / 2,
      side: showOnLeft ? 'left' : 'right'
    });
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  // Build tooltip content
  const tooltipLines = [
    title,
    `Start: ${new Date(iterationStart).toLocaleDateString()}`,
    `End: ${new Date(iterationEnd).toLocaleDateString()}`,
  ];

  if (progress.total > 0) {
    tooltipLines.push(`Progress: ${progress.completed}/${progress.total} (${Math.round(progressPercentage)}%)`);
  }

  // Add any custom metadata to tooltip
  Object.entries(metadata).forEach(([key, value]) => {
    if (value !== undefined && value !== null && key !== 'childWorkItemType') {
      tooltipLines.push(`${key}: ${value}`);
    }
  });

  const isClickable = onToggle || onClick;

  // Determine font sizes based on card height and width
  const isShortCard = finalConfig.height <= 40;
  
  // Calculate card width from barStyle
  const cardWidth = barStyle.width ? parseFloat(barStyle.width) : 100;
  const isNarrowCard = cardWidth < 5; // Less than 5% width
  
  // Adjust sizes based on both height and width
  const titleFontSize = (isShortCard || isNarrowCard) ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm';
  const iconSize = (isShortCard || isNarrowCard) ? 'w-2.5 h-2.5 sm:w-3 sm:h-3' : 'w-3 h-3 sm:w-4 sm:h-4';
  const progressFontSize = (isShortCard || isNarrowCard) ? 'text-[9px]' : 'text-xs';
  const stateFontSize = (isShortCard || isNarrowCard) ? 'text-[9px]' : 'text-xs';

  return (
    <>
      <div
        className={`
          absolute bg-white rounded-lg shadow-md border-l-4 ${finalConfig.borderColor}
          ${isClickable ? 'cursor-pointer hover:shadow-lg' : ''}
          transition-shadow z-10 overflow-hidden
        `}
        style={{
          ...barStyle,
          top: `${yOffset}px`,
          height: `${finalConfig.height}px`,
        }}
        onClick={isClickable ? handleClick : undefined}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="px-2 py-2 h-full flex flex-col">
          {/* Header with title and chevron */}
          <div className="flex items-start gap-1 mb-1">
            {finalConfig.showChevron && onToggle && (
              <>
                {isExpanded ? (
                  <ChevronDown className={`${iconSize} flex-shrink-0 text-gray-600 mt-0.5`} />
                ) : (
                  <ChevronRight className={`${iconSize} flex-shrink-0 text-gray-600 mt-0.5`} />
                )}
              </>
            )}
            <div className="flex-1 min-w-0">
              <span 
                className={`${titleFontSize} font-semibold text-gray-800 line-clamp-2 leading-tight cursor-pointer hover:text-blue-600 transition-colors`}
                onClick={handleTitleClick}
                title={`Click to open work item ${id}`}
              >
                {title}
              </span>
            </div>
          </div>

          {/* Metadata section (optional) - hide for narrow cards */}
          {metadata.state && !isNarrowCard && (
            <div className="mb-1">
              <span className={`${stateFontSize} text-gray-500 italic`}>{metadata.state}</span>
            </div>
          )}

          {/* Progress section */}
          {finalConfig.showProgress && progress.total > 0 && (
            <div className="mt-auto">
              {!isNarrowCard ? (
                // Full progress display for regular width cards
                <>
                  <div className="flex justify-between items-center mb-1">
                    <span className={`${progressFontSize} text-gray-600`}>
                      {progress.completed}/{progress.total} {childTypeName}
                    </span>
                    <span className={`${progressFontSize} text-gray-600 font-medium`}>
                      {Math.round(progressPercentage)}%
                    </span>
                  </div>
                  {settings.showProgressBars && (
                    <div className="w-full bg-gray-200 rounded-full h-1">
                      <div
                        className={`${finalConfig.progressBarColor} h-1 rounded-full transition-all`}
                        style={{ width: `${progressPercentage}%` }}
                      ></div>
                    </div>
                  )}
                </>
              ) : (
                // Simplified display for narrow cards - just the progress bar
                settings.showProgressBars && (
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <div
                      className={`${finalConfig.progressBarColor} h-1 rounded-full transition-all`}
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* Custom Tooltip Card */}
      {showTooltip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
          }}
        >
          <div 
            className="relative bg-gray-900 text-white rounded-lg shadow-xl p-3 max-w-xs"
            style={{
              transform: tooltipPosition.side === 'left' 
                ? 'translate(-100%, -50%) translateX(-10px)' 
                : 'translate(0, -50%) translateX(10px)'
            }}
          >
            <div className="space-y-2">
              <div className="font-semibold text-sm border-b border-gray-700 pb-2">
                {title}
              </div>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">ID:</span>
                  <span>#{id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Start:</span>
                  <span>{new Date(iterationStart).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">End:</span>
                  <span>{new Date(iterationEnd).toLocaleDateString()}</span>
                </div>
                {progress.total > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Progress:</span>
                    <span>
                      {progress.completed}/{progress.total} ({Math.round(progressPercentage)}%)
                    </span>
                  </div>
                )}
                {metadata.state && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">State:</span>
                    <span>{metadata.state}</span>
                  </div>
                )}
                {metadata.workItemType && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Type:</span>
                    <span>{metadata.workItemType}</span>
                  </div>
                )}
                {metadata.assignedTo && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Assigned:</span>
                    <span className="truncate ml-2">{metadata.assignedTo}</span>
                  </div>
                )}
              </div>
            </div>
            {/* Arrow pointing to the card */}
            <div 
              className="absolute"
              style={{
                top: '50%',
                transform: 'translateY(-50%)',
                ...(tooltipPosition.side === 'left' ? {
                  right: '100%',
                  marginRight: '-10px',
                  borderLeft: '10px solid rgb(17, 24, 39)',
                  borderTop: '8px solid transparent',
                  borderBottom: '8px solid transparent',
                } : {
                  left: '100%',
                  marginLeft: '-10px',
                  borderRight: '10px solid rgb(17, 24, 39)',
                  borderTop: '8px solid transparent',
                  borderBottom: '8px solid transparent',
                }),
                width: 0,
                height: 0,
              }}
            />
          </div>
        </div>
      )}
    </>
  );
};