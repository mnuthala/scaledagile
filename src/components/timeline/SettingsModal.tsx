import React, { useState, useEffect } from 'react';
import { X, Settings } from 'lucide-react';
import { useSettings } from '@components/timeline/SettingsContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, resetSettings } = useSettings();
  const [localSettings, setLocalSettings] = useState(settings);

  // Sync local settings with context when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('Modal opened, syncing settings:', settings);
      setLocalSettings(settings);
    }
  }, [isOpen, settings]);

  const handleSave = () => {
    console.log('Save button clicked, saving settings:', localSettings);
    updateSettings(localSettings);
    onClose();
  };

  const handleCancel = () => {
    console.log('Cancel button clicked');
    setLocalSettings(settings); // Reset to saved settings
    onClose();
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults?')) {
      console.log('Reset confirmed');
      resetSettings();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-800">Settings</h2>
            </div>
            <button
              onClick={handleCancel}
              className="p-1 hover:bg-gray-100 rounded-md transition-colors"
              title="Close"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="space-y-6">
              {/* Display Settings Section */}
              <section>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Display Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Show Progress Bars</label>
                      <p className="text-xs text-gray-500">Display completion progress on cards</p>
                    </div>
                    <input 
                      type="checkbox" 
                      className="w-4 h-4" 
                      checked={localSettings.showProgressBars}
                      onChange={(e) => setLocalSettings({...localSettings, showProgressBars: e.target.checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Show Today Indicator</label>
                      <p className="text-xs text-gray-500">Display vertical line for current date</p>
                    </div>
                    <input 
                      type="checkbox" 
                      className="w-4 h-4" 
                      checked={localSettings.showTodayIndicator}
                      onChange={(e) => setLocalSettings({...localSettings, showTodayIndicator: e.target.checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Compact View</label>
                      <p className="text-xs text-gray-500">Reduce spacing between items</p>
                    </div>
                    <input 
                      type="checkbox" 
                      className="w-4 h-4" 
                      checked={localSettings.compactView}
                      onChange={(e) => setLocalSettings({...localSettings, compactView: e.target.checked})}
                    />
                  </div>
                </div>
              </section>

              {/* Timeline Settings Section */}
              <section className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Timeline Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      Default View Range
                    </label>
                    <select 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      value={localSettings.defaultViewRange}
                      onChange={(e) => setLocalSettings({...localSettings, defaultViewRange: Number(e.target.value)})}
                    >
                      <option value="1">1 Quarter</option>
                      <option value="2">2 Quarters</option>
                      <option value="3">3 Quarters</option>
                      <option value="4">4 Quarters (Year)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      Start Week On
                    </label>
                    <select 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      value={localSettings.startWeekOn}
                      onChange={(e) => setLocalSettings({...localSettings, startWeekOn: e.target.value as 'sunday' | 'monday'})}
                    >
                      <option value="sunday">Sunday</option>
                      <option value="monday">Monday</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* Data Settings Section */}
              <section className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Data Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Auto-refresh Data</label>
                      <p className="text-xs text-gray-500">Automatically update timeline data</p>
                    </div>
                    <input 
                      type="checkbox" 
                      className="w-4 h-4" 
                      checked={localSettings.autoRefreshData}
                      onChange={(e) => setLocalSettings({...localSettings, autoRefreshData: e.target.checked})}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      Refresh Interval
                    </label>
                    <select 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      value={localSettings.refreshInterval}
                      onChange={(e) => setLocalSettings({...localSettings, refreshInterval: Number(e.target.value)})}
                      disabled={!localSettings.autoRefreshData}
                    >
                      <option value="5">5 minutes</option>
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="60">1 hour</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* Color Settings Section */}
              <section className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Color Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Epic Color</label>
                    <input 
                      type="color" 
                      value={localSettings.epicColor}
                      onChange={(e) => setLocalSettings({...localSettings, epicColor: e.target.value})}
                      className="w-12 h-8 rounded cursor-pointer" 
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Feature Color</label>
                    <input 
                      type="color" 
                      value={localSettings.featureColor}
                      onChange={(e) => setLocalSettings({...localSettings, featureColor: e.target.value})}
                      className="w-12 h-8 rounded cursor-pointer" 
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Today Indicator Color</label>
                    <input 
                      type="color" 
                      value={localSettings.todayIndicatorColor}
                      onChange={(e) => setLocalSettings({...localSettings, todayIndicatorColor: e.target.value})}
                      className="w-12 h-8 rounded cursor-pointer" 
                    />
                  </div>
                </div>
              </section>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 p-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              Reset to Defaults
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};