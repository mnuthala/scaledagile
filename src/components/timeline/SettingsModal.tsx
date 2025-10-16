import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useSettings, BorderColors } from './SettingsContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Available Tailwind colors
const AVAILABLE_COLORS = [
  { name: 'Blue', value: 'border-blue-500', bg: 'bg-blue-500' },
  { name: 'Green', value: 'border-green-500', bg: 'bg-green-500' },
  { name: 'Yellow', value: 'border-yellow-500', bg: 'bg-yellow-500' },
  { name: 'Red', value: 'border-red-500', bg: 'bg-red-500' },
  { name: 'Orange', value: 'border-orange-500', bg: 'bg-orange-500' },
  { name: 'Purple', value: 'border-purple-500', bg: 'bg-purple-500' },
  { name: 'Pink', value: 'border-pink-500', bg: 'bg-pink-500' },
  { name: 'Indigo', value: 'border-indigo-500', bg: 'bg-indigo-500' },
  { name: 'Teal', value: 'border-teal-500', bg: 'bg-teal-500' },
  { name: 'Cyan', value: 'border-cyan-500', bg: 'bg-cyan-500' },
  { name: 'Gray', value: 'border-gray-500', bg: 'bg-gray-500' },
  { name: 'Slate', value: 'border-slate-500', bg: 'bg-slate-500' },
];

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ label, value, onChange }) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="grid grid-cols-6 gap-2">
        {AVAILABLE_COLORS.map((color) => (
          <button
            key={color.value}
            onClick={() => onChange(color.value)}
            className={`
              w-10 h-10 rounded-lg ${color.bg} 
              border-2 transition-all
              ${value === color.value ? 'border-gray-900 ring-2 ring-gray-900 ring-offset-2' : 'border-gray-300 hover:border-gray-400'}
            `}
            title={color.name}
            type="button"
          />
        ))}
      </div>
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
            <div className="space-y-4">
              <ColorPicker
                label="Epic Border Color"
                value={localSettings.borderColors.epic}
                onChange={(color) => updateBorderColor('epic', color)}
              />
              
              <ColorPicker
                label="Feature Border Color"
                value={localSettings.borderColors.feature}
                onChange={(color) => updateBorderColor('feature', color)}
              />
              
              <ColorPicker
                label="Story Border Color"
                value={localSettings.borderColors.story}
                onChange={(color) => updateBorderColor('story', color)}
              />
              
              <ColorPicker
                label="Task Border Color"
                value={localSettings.borderColors.task}
                onChange={(color) => updateBorderColor('task', color)}
              />
              
              <ColorPicker
                label="Bug Border Color"
                value={localSettings.borderColors.bug}
                onChange={(color) => updateBorderColor('bug', color)}
              />
              
              <ColorPicker
                label="Issue Border Color"
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