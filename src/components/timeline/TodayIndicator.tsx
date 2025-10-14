import React from 'react';

interface TodayIndicatorProps {
  position: string;
  showLabel?: boolean;
}

export const TodayIndicator: React.FC<TodayIndicatorProps> = ({ position, showLabel = false }) => {
  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 z-20 pointer-events-none"
      style={{ left: position, backgroundColor: 'rgba(34, 197, 94, 0.2)' }}
    >
      {showLabel && (
        <>
          <div 
            className="absolute -top-2 -left-2 w-4 h-4 rounded-full"
            style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)' }}
          ></div>
          <div 
            className="absolute -top-6 -left-8 sm:-left-12 text-white text-xs px-1 sm:px-2 py-1 rounded whitespace-nowrap"
            style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)' }}
          >
            Today
          </div>
        </>
      )}
    </div>
  );
};