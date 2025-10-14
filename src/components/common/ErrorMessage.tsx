import React from 'react';

interface ErrorMessageProps {
  message: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
        <h2 className="text-red-800 font-semibold mb-2">Error Loading Data</h2>
        <p className="text-red-700 text-sm">{message}</p>
      </div>
    </div>
  );
};