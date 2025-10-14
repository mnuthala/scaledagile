import React from 'react';
import { Calendar, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

interface TimelineHeaderProps {
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onPreviousQuarter: () => void;
  onNextQuarter: () => void;
  onToday: () => void;
}

export const TimelineHeader: React.FC<TimelineHeaderProps> = ({
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onPreviousQuarter,
  onNextQuarter,
  onToday,
}) => {
  return (
    <div className="bg-white border-b border-gray-200 p-2 sm:p-4 shadow-sm flex-shrink-0">
      <div className="flex items-center justify-between">
        <h1 className="text-lg sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="hidden sm:inline">Value Stream Timeline</span>
          <span className="sm:hidden">Timeline</span>
        </h1>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border-r pr-2 mr-2">
            <button
              onClick={onPreviousQuarter}
              className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-md transition-colors"
              title="Previous Quarter"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={onToday}
              className="px-2 py-1 text-xs sm:text-sm bg-blue-100 hover:bg-blue-200 rounded-md transition-colors font-medium"
              title="Go to Current Quarter"
            >
              Today
            </button>
            <button
              onClick={onNextQuarter}
              className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-md transition-colors"
              title="Next Quarter"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          <button
            onClick={onZoomOut}
            className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-md transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <span className="text-xs sm:text-sm text-gray-600 hidden sm:inline">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={onZoomIn}
            className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-md transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};