import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface BorderColors {
  epic: string;
  feature: string;
  story: string;
  task: string;
  bug: string;
  issue: string;
}

export interface Settings {
  showProgressBars: boolean;
  showTodayIndicator: boolean;
  borderColors: BorderColors;
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  resetSettings: () => void;
}

const defaultBorderColors: BorderColors = {
  epic: 'border-blue-500',
  feature: 'border-green-500',
  story: 'border-yellow-500',
  task: 'border-gray-500',
  bug: 'border-red-500',
  issue: 'border-orange-500',
};

const defaultSettings: Settings = {
  showProgressBars: true,
  showTodayIndicator: true,
  borderColors: defaultBorderColors,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(() => {
    // Try to load settings from localStorage
    const savedSettings = localStorage.getItem('timelineSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        // Merge with defaults to ensure new settings are added
        return {
          ...defaultSettings,
          ...parsed,
          borderColors: {
            ...defaultBorderColors,
            ...(parsed.borderColors || {}),
          },
        };
      } catch (error) {
        console.error('Failed to parse saved settings:', error);
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('timelineSettings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings,
      borderColors: {
        ...prev.borderColors,
        ...(newSettings.borderColors || {}),
      },
    }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};