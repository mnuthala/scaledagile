import { useState, useEffect } from 'react';
import { fetchWorkItems } from '../services/azure-devops-service';
import { ValueStream } from '../types/timeline.types';

export const useTimelineData = () => {
  const [data, setData] = useState<{ valueStreams: ValueStream[] }>({ valueStreams: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const isDev = process.env.NODE_ENV === 'development' || !window.location.hostname.includes('dev.azure.com');
        
        let valueStreams;
        if (isDev) {
          const orgUrl = process.env.REACT_APP_AZDO_ORG_URL;
          const project = process.env.REACT_APP_AZDO_PROJECT;
          const pat = process.env.REACT_APP_AZDO_PAT;
          
          if (!orgUrl || !project || !pat) {
            throw new Error('Missing Azure DevOps configuration. Please set REACT_APP_AZDO_ORG_URL, REACT_APP_AZDO_PROJECT, and REACT_APP_AZDO_PAT in your .env file.');
          }
          
          console.log('Fetching data from Azure DevOps...');
          valueStreams = await fetchWorkItems({ orgUrl, project, pat });
        } else {
          console.log('Fetching data via Azure DevOps extension SDK...');
          valueStreams = await fetchWorkItems();
        }
        
        console.log('Fetched value streams:', valueStreams);
        
        if (valueStreams.length === 0) {
          setError('No epics found in Azure DevOps. Make sure you have Epics in your project.');
        }
        
        setData({ valueStreams });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        console.error('Error fetching work items:', err);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  return { data, loading, error };
};