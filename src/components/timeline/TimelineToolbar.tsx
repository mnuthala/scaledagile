import React from 'react';
import { Eye, Settings } from 'lucide-react';

// ViewLevel now controls BOTH the root type AND the expand/collapse behavior
export type ViewLevel = 'epic' | 'feature' | 'story';

interface TimelineToolbarProps {
  viewLevel: ViewLevel;
  onViewLevelChange: (level: ViewLevel) => void;
  valueStreamsCount: number;
  workItemsCount: number;
  epicsCount?: number;
  featuresCount?: number;
  userStoriesCount?: number;
  onOpenSettings: () => void;
}

export const TimelineToolbar: React.FC<TimelineToolbarProps> = ({
  viewLevel,
  onViewLevelChange,
  valueStreamsCount,
  workItemsCount,
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

  const getViewLevelDisplay = () => {
    switch (viewLevel) {
      case 'epic':
        return 'Epics (Root)';
      case 'feature':
        return 'Features (Root)';
      case 'story':
        return 'Stories';
      default:
        return 'Epics (Root)';
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* View Level Selector - Controls Root Type */}
        <div className="relative">
          <button
            onClick={() => setIsViewMenuOpen(!isViewMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 rounded-md transition-colors"
            title={`Current view: ${getViewLevelDisplay()}`}
          >
            <Eye className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">View:</span>
            <span className="text-sm font-semibold text-blue-600">
              {getViewLevelDisplay()}
            </span>
          </button>

          {isViewMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setIsViewMenuOpen(false)}
              />
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[200px]">
                <button
                  onClick={() => handleViewLevelChange('epic')}
                  className={`
                    w-full text-left px-4 py-2 text-sm transition-colors
                    ${viewLevel === 'epic' 
                      ? 'bg-blue-50 text-blue-600 font-medium' 
                      : 'text-gray-700 hover:bg-gray-50'
                    }
                    first:rounded-t-lg
                  `}
                  title="Show Epics as root items (collapsed)"
                >
                  <div className="font-medium">Epics</div>
                  <div className="text-xs text-gray-500">Start from Epics (collapsed)</div>
                </button>
                <button
                  onClick={() => handleViewLevelChange('feature')}
                  className={`
                    w-full text-left px-4 py-2 text-sm transition-colors
                    ${viewLevel === 'feature' 
                      ? 'bg-blue-50 text-blue-600 font-medium' 
                      : 'text-gray-700 hover:bg-gray-50'
                    }
                  `}
                  title="Show Features as root items (collapsed)"
                >
                  <div className="font-medium">Features</div>
                  <div className="text-xs text-gray-500">Start from Features (root level)</div>
                </button>
                <button
                  onClick={() => handleViewLevelChange('story')}
                  className={`
                    w-full text-left px-4 py-2 text-sm transition-colors
                    ${viewLevel === 'story' 
                      ? 'bg-blue-50 text-blue-600 font-medium' 
                      : 'text-gray-700 hover:bg-gray-50'
                    }
                    last:rounded-b-lg
                  `}
                  title="Show all levels expanded (Epics → Features → Stories)"
                >
                  <div className="font-medium">Stories</div>
                  <div className="text-xs text-gray-500">Show all levels expanded</div>
                </button>
              </div>
            </>
          )}
        </div>

        <button
          onClick={onOpenSettings}
          className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 rounded-md transition-colors"
          title="Open settings to configure timeline display options"
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
        {epicsCount !== undefined && (
          <div className="flex items-center gap-1.5">
            <span className="font-medium">{epicsCount}</span>
            <span>Epics</span>
          </div>
        )}
        {featuresCount !== undefined && (
          <div className="flex items-center gap-1.5">
            <span className="font-medium">{featuresCount}</span>
            <span>Features</span>
          </div>
        )}
        {userStoriesCount !== undefined && (
          <div className="flex items-center gap-1.5">
            <span className="font-medium">{userStoriesCount}</span>
            <span>User Stories</span>
          </div>
        )}
      </div>
    </div>
  );
};