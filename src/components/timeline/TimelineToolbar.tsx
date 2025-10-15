import React from 'react';
import { Eye, Settings } from 'lucide-react';

export type ViewLevel = 'epic' | 'feature';

interface TimelineToolbarProps {
  viewLevel: ViewLevel;
  onViewLevelChange: (level: ViewLevel) => void;
  valueStreamsCount: number;
  workItemsCount: number;
  onOpenSettings: () => void;
}

export const TimelineToolbar: React.FC<TimelineToolbarProps> = ({
  viewLevel,
  onViewLevelChange,
  valueStreamsCount,
  epicsCount,
  featuresCount,
  userStoriesCount,
  onOpenSettings,
}) => {
  const [isViewMenuOpen, setIsViewMenuOpen] = React.useState(false);

  const handleViewLevelChange = (level: ViewLevel) => {
    onViewLevelChange(level);
    setIsViewMenuOpen(false);
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setIsViewMenuOpen(!isViewMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 rounded-md transition-colors"
          >
            <Eye className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">View:</span>
            <span className="text-sm font-semibold text-blue-600">
              {viewLevel === 'epic' ? 'Epic' : 'Feature'}
            </span>
          </button>

          {isViewMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setIsViewMenuOpen(false)}
              />
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[160px]">
                <button
                  onClick={() => handleViewLevelChange('epic')}
                  className={`
                    w-full text-left px-4 py-2 text-sm transition-colors
                    ${viewLevel === 'epic' 
                      ? 'bg-blue-50 text-blue-600 font-medium' 
                      : 'text-gray-700 hover:bg-gray-50'
                    }
                    first:rounded-t-lg last:rounded-b-lg
                  `}
                >
                  Epic Level
                </button>
                <button
                  onClick={() => handleViewLevelChange('feature')}
                  className={`
                    w-full text-left px-4 py-2 text-sm transition-colors
                    ${viewLevel === 'feature' 
                      ? 'bg-blue-50 text-blue-600 font-medium' 
                      : 'text-gray-700 hover:bg-gray-50'
                    }
                    first:rounded-t-lg last:rounded-b-lg
                  `}
                >
                  Feature Level
                </button>
              </div>
            </>
          )}
        </div>

        <button
          onClick={onOpenSettings}
          className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 rounded-md transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Settings</span>
        </button>
      </div>

      <div className="hidden md:flex items-center gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-1.5">
          <span className="font-medium">{valueStreamsCount}</span>
          <span>Value Streams</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-medium">{epicsCount}</span>
          <span>Epics</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-medium">{featuresCount}</span>
          <span>Features</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-medium">{userStoriesCount}</span>
          <span>User Stories</span>
        </div>
      </div>
    </div>
  );
};