import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface TimelineSettings {
  // Display Settings
  showProgressBars: boolean;
  showTodayIndicator: boolean;
  compactView: boolean;
  
  // Timeline Settings
  defaultViewRange: number; // quarters
  startWeekOn: 'sunday' | 'monday';
  
  // Data Settings
  autoRefreshData: boolean;
  refreshInterval: number; // minutes
  
  // Color Settings
  epicColor: string;
  featureColor: string;
  todayIndicatorColor: string;
}

const defaultSettings: TimelineSettings = {
  showProgressBars: true,
  showTodayIndicator: false,
  compactView: false,
  defaultViewRange: 2,
  startWeekOn: 'monday',
  autoRefreshData: true,
  refreshInterval: 15,
  epicColor: '#3B82F6',
  featureColor: '#10B981',
  todayIndicatorColor: '#22C55E',
};

interface SettingsContextType {
  settings: TimelineSettings;
  updateSettings: (newSettings: Partial<TimelineSettings>) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Try to load settings from localStorage on initial render
  const [settings, setSettings] = useState<TimelineSettings>(() => {
    try {
      const savedSettings = localStorage.getItem('timelineSettings');
      console.log('Loading settings from localStorage:', savedSettings);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        console.log('Parsed settings:', parsed);
        return { ...defaultSettings, ...parsed };
      }
    } catch (error) {
      console.error('Error loading settings from localStorage:', error);
    }
    console.log('Using default settings');
    return defaultSettings;
  });

  const updateSettings = (newSettings: Partial<TimelineSettings>) => {
    console.log('updateSettings called with:', newSettings);
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      console.log('Updated settings:', updated);
      // Save to localStorage
      try {
        localStorage.setItem('timelineSettings', JSON.stringify(updated));
        console.log('Settings saved to localStorage');
      } catch (error) {
        console.error('Error saving settings to localStorage:', error);
      }
      return updated;
    });
  };

  const resetSettings = () => {
    console.log('resetSettings called');
    setSettings(defaultSettings);
    try {
      localStorage.removeItem('timelineSettings');
      console.log('Settings removed from localStorage');
    } catch (error) {
      console.error('Error removing settings from localStorage:', error);
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};