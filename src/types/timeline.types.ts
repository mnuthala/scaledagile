// Updated timeline.types.ts - Add featureCount to Epic interface

export interface Feature {
  id: string;
  title: string;
  iterationStart: string;
  iterationEnd: string;
  userStoryCount?: number; // Optional: count of user stories under this feature
}

export interface Epic {
  id: string;
  title: string;
  iterationStart: string;
  iterationEnd: string;
  features: Feature[];
  featureCount?: number; // Optional: count of features under this epic
}

export interface ValueStream {
  id: string;
  name: string;
  epics: Epic[];
}

export interface TimelineMonth {
  year: number;
  quarter: number;
  month: number;
  monthName: string;
  date: Date;
}

export interface Quarter {
  year: number;
  quarter: number;
  months: TimelineMonth[];
}

export interface UserStoryProgress {
  total: number;
  completed: number;
}