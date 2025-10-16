import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useSettings, BorderColors } from './SettingsContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

// Extended color options
const COLOR_OPTIONS = [
  { name: 'Blue', value: 'border-blue-500', hex: '#3b82f6' },
  { name: 'Sky', value: 'border-sky-500', hex: '#0ea5e9' },
  { name: 'Cyan', value: 'border-cyan-500', hex: '#06b6d4' },
  { name: 'Teal', value: 'border-teal-500', hex: '#14b8a6' },
  { name: 'Emerald', value: 'border-emerald-500', hex: '#10b981' },
  { name: 'Green', value: 'border-green-500', hex: '#22c55e' },
  { name: 'Lime', value: 'border-lime-500', hex: '#84cc16' },
  { name: 'Yellow', value: 'border-yellow-500', hex: '#eab308' },
  { name: 'Amber', value: 'border-amber-500', hex: '#f59e0b' },
  { name: 'Orange', value: 'border-orange-500', hex: '#f97316' },
  { name: 'Red', value: 'border-red-500', hex: '#ef4444' },
  { name: 'Rose', value: 'border-rose-500', hex: '#f43f5e' },
  { name: 'Pink', value: 'border-pink-500', hex: '#ec4899' },
  { name: 'Fuchsia', value: 'border-fuchsia-500', hex: '#d946ef' },
  { name: 'Purple', value: 'border-purple-500', hex: '#a855f7' },
  { name: 'Violet', value: 'border-violet-500', hex: '#8b5cf6' },
  { name: 'Indigo', value: 'border-indigo-500', hex: '#6366f1' },
  { name: 'Slate', value: 'border-slate-500', hex: '#64748b' },
  { name: 'Gray', value: 'border-gray-500', hex: '#6b7280' },
  { name: 'Zinc', value: 'border-zinc-500', hex: '#71717a' },
  { name: 'Neutral', value: 'border-neutral-500', hex: '#737373' },
  { name: 'Stone', value: 'border-stone-500', hex: '#78716c' },
];

const ColorPicker: React.FC<ColorPickerProps> = ({ label, value, onChange }) => {
  const selectedColor = COLOR_OPTIONS.find(c => c.value === value) || COLOR_OPTIONS[0];

  return (
    <div className="flex items-center gap-2">
      {label && <label className="text-xs font-medium text-gray-700 w-16 flex-shrink-0">{label}</label>}
      <div 
        className="w-8 h-8 rounded border-2 border-gray-300 flex-shrink-0"
        style={{ backgroundColor: selectedColor.hex }}
      ></div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {COLOR_OPTIONS.map((color) => (
          <option key={color.value} value={color.value}>
            {color.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, resetSettings } = useSettings();
  const [localSettings, setLocalSettings] = useState(settings);

  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    updateSettings(localSettings);
    onClose();
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      resetSettings();
      onClose();
    }
  };

  const updateBorderColor = (type: keyof BorderColors, color: string) => {
    setLocalSettings(prev => ({
      ...prev,
      borderColors: {
        ...prev.borderColors,
        [type]: color,
      },
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Display Options */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Display Options</h3>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.showProgressBars}
                  onChange={(e) => setLocalSettings({ ...localSettings, showProgressBars: e.target.checked })}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Show Progress Bars</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.showTodayIndicator}
                  onChange={(e) => setLocalSettings({ ...localSettings, showTodayIndicator: e.target.checked })}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Show Today Indicator</span>
              </label>
            </div>
          </div>

          {/* Border Colors */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Work Item Border Colors</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <ColorPicker
                label="Epic"
                value={localSettings.borderColors.epic}
                onChange={(color) => updateBorderColor('epic', color)}
              />
              
              <ColorPicker
                label="Feature"
                value={localSettings.borderColors.feature}
                onChange={(color) => updateBorderColor('feature', color)}
              />
              
              <ColorPicker
                label="Story"
                value={localSettings.borderColors.story}
                onChange={(color) => updateBorderColor('story', color)}
              />
              
              <ColorPicker
                label="Task"
                value={localSettings.borderColors.task}
                onChange={(color) => updateBorderColor('task', color)}
              />
              
              <ColorPicker
                label="Bug"
                value={localSettings.borderColors.bug}
                onChange={(color) => updateBorderColor('bug', color)}
              />
              
              <ColorPicker
                label="Issue"
                value={localSettings.borderColors.issue}
                onChange={(color) => updateBorderColor('issue', color)}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          >
            Reset to Defaults
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};