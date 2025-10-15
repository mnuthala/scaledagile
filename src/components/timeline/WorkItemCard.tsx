import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
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
  metadata?: {
    childWorkItemType?: string;
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
    if (onToggle) {
      onToggle();
    } else if (onClick) {
      onClick();
    }
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

  return (
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
      title={tooltipLines.join('\n')}
    >
      <div className="px-2 py-2 h-full flex flex-col">
        {/* Header with title and chevron */}
        <div className="flex items-start gap-1 mb-1">
          {finalConfig.showChevron && onToggle && (
            <>
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 text-gray-600 mt-0.5" />
              ) : (
                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 text-gray-600 mt-0.5" />
              )}
            </>
          )}
          <div className="flex-1 min-w-0">
            <span className="text-xs sm:text-sm font-semibold text-gray-800 line-clamp-2 leading-tight">
              {title}
            </span>
          </div>
        </div>

        {/* Metadata section (optional) */}
        {metadata.state && (
          <div className="mb-1">
            <span className="text-xs text-gray-500 italic">{metadata.state}</span>
          </div>
        )}

        {/* Progress section */}
        {settings.showProgressBars && finalConfig.showProgress && (
          <div className="mt-auto">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-600">
                {progress.completed}/{progress.total} {childTypeName}
              </span>
              {progress.total > 0 && (
                <span className="text-xs text-gray-600 font-medium">
                  {Math.round(progressPercentage)}%
                </span>
              )}
            </div>
            {progress.total > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div
                  className={`${finalConfig.progressBarColor} h-1 rounded-full transition-all`}
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            )}
          </div>
        )}

        {/* Alternative: Show progress without bar when showProgressBars is false */}
        {!settings.showProgressBars && finalConfig.showProgress && (
          <div className="mt-auto">
            <span className="text-xs text-gray-600">
              {progress.completed}/{progress.total} {childTypeName}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};