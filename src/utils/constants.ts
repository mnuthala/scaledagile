export const CARD_HEIGHTS = {
  EPIC: 52,
  FEATURE: 52,
  EPIC_SPACING: 60,
  FEATURE_SPACING: 60,
  BOTTOM_PADDING: 20,
  MIN_ROW_HEIGHT: 100,
} as const;

export const COLORS = {
  EPIC_BORDER: 'border-orange-500',
  EPIC_PROGRESS: 'bg-orange-500',
  FEATURE_BORDER: 'border-purple-500',
  FEATURE_PROGRESS: 'bg-purple-500',
  TODAY_LINE: 'bg-gray-400',
} as const;

export const RESPONSIVE_WIDTHS = {
  MOBILE: 'w-32',
  TABLET: 'w-40',
  DESKTOP: 'w-56',
} as const;

export const BREAKPOINTS = {
  MOBILE: 640,
  TABLET: 1024,
} as const;

export const ZOOM = {
  MIN: 0.5,
  MAX: 2,
  STEP: 0.2,
  DEFAULT: 1,
} as const;

export const QUARTERS_TO_DISPLAY = 4;
export const QUARTERS_OFFSET_START = -1;