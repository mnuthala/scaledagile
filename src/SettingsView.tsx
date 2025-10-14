import React, { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { saveQueryGuid } from './azure-devops-service';

const SettingsView: React.FC = () => {
  const [queryGuid, setQueryGuid] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    await saveQueryGuid(queryGuid);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
        <Settings className="w-8 h-8" />
        Timeline Settings
      </h1>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2">
            Query GUID
          </label>
          <input
            type="text"
            value={queryGuid}
            onChange={(e) => setQueryGuid(e.target.value)}
            placeholder="Enter your Azure DevOps query GUID"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-2 text-sm text-gray-600">
            Create a query in Azure DevOps that returns Epics and Features, then copy its GUID from the URL.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Save Settings
        </button>

        {saved && (
          <div className="mt-4 p-3 bg-green-100 text-green-800 rounded-md">
            Settings saved successfully!
          </div>
        )}

        <div className="mt-8 p-4 bg-blue-50 rounded-md">
          <h3 className="font-semibold mb-2">How to get Query GUID:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Go to Azure Boards → Queries</li>
            <li>Create or open a query that returns your Epics and Features</li>
            <li>Look at the URL: <code className="bg-white px-1">...queries/&#123;GUID&#125;/?...</code></li>
            <li>Copy the GUID and paste it above</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;