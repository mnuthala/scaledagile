import React from 'react';
import { Flag } from 'lucide-react';

interface MilestoneIndicatorProps {
  date: string;          // "YYYY-MM-DD"
  timelineStart: Date;
  timelineEnd: Date;
  milestoneName: string;
  color?: string;        // NEW: hex or CSS colour
}

// Simple contrast picker for tooltip text
function getContrastText(hex?: string) {
  if (!hex) return '#ffffff';
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) || 0;
  const g = parseInt(h.substring(2, 4), 16) || 0;
  const b = parseInt(h.substring(4, 6), 16) || 0;
  // WCAG-ish luminance
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#111827' /* gray-900 */ : '#ffffff';
}

const toDateOnly = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const MilestoneIndicator: React.FC<MilestoneIndicatorProps> = ({
  date,
  timelineStart,
  timelineEnd,
  milestoneName,
  color = '#7C3AED', // default to your old purple
}) => {
  // Robust parse + date-only compare
  const parsed = new Date(`${date}T00:00:00`);
  const milestoneDate = toDateOnly(parsed);
  const start = toDateOnly(timelineStart);
  const end = toDateOnly(timelineEnd);

  if (milestoneDate < start || milestoneDate > end) return null;

  const totalDuration = Math.max(1, end.getTime() - start.getTime());
  const milestoneOffset = milestoneDate.getTime() - start.getTime();
  const position = (milestoneOffset / totalDuration) * 100;

  const tooltipBg = color;
  const tooltipText = getContrastText(color);

  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 z-50"
      style={{ left: `${position}%`, marginLeft: '-10px' }}
    >
      <div className="relative group pointer-events-auto">
        {/* Lucide icons use stroke=currentColor by default; set currentColor via style */}
        <Flag
          className="w-5 h-5 drop-shadow-lg transition-transform group-hover:scale-110"
          style={{ color,
                   fill: color,
           }}
        />
        {/* Optional thin guide line to read across the row */}
        <div className="absolute -top-2 bottom-2 left-1/2 -translate-x-1/2 w-px opacity-30"
             style={{ backgroundColor: color }} />

        {/* Tooltip */}
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-50"
          style={{ backgroundColor: tooltipBg, color: tooltipText }}
        >
          <div className="font-semibold">{milestoneName}</div>
          <div style={{ opacity: 0.8, marginTop: '2px' }}>
            {new Date(date).toLocaleDateString('en-GB', {
              weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
            })}
          </div>
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2">
            <div
              className="border-4 border-transparent"
              style={{ borderTopColor: tooltipBg }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
