import { useState, useEffect } from 'react';
import type { TimelineData } from '../utils/dataAdapter';
import { transformLegacyData } from '../utils/dataAdapter';

type RootWorkItemType = 'Epic' | 'Feature';

// Small helper to pretty-print available exports if we can't find a fetcher
function listExportedKeys(mod: any) {
  try {
    return Object.keys(mod).sort().join(', ');
  } catch {
    return '(unable to inspect module exports)';
  }
}

// Tries to call the "best" available fetcher in the service
async function fetchValueStreamsAuto(
  isDev: boolean,
  env: Record<string, string | undefined>,
  rootWorkItemType: RootWorkItemType,
  iterationFilter?: any
): Promise<any[]> {
  // Dynamically import the service
  const svc = await import('../services/azure-devops-service');

  const candidates = [
    'fetchWorkItems',
    'fetchValueStreams',
    'fetchWorkItemsLocal',
    'fetchWorkItemsFromQueryId',
    'fetchWorkItemsFromQuery',
    'getValueStreams',
  ] as const;

  const fnName = candidates.find((k) => typeof (svc as any)[k] === 'function');

  if (!fnName) {
    throw new Error(
      `No known fetch function found in azure-devops-service. ` +
      `Tried: ${candidates.join(', ')}. ` +
      `Exports I can see: ${listExportedKeys(svc)}`
    );
  }

  const fn = (svc as any)[fnName];

  if (isDev) {
    const orgUrl = env.REACT_APP_AZDO_ORG_URL;
    const project = env.REACT_APP_AZDO_PROJECT;
    const pat = env.REACT_APP_AZDO_PAT;

    if (!orgUrl || !project || !pat) {
      throw new Error(
        'Missing Azure DevOps config. Set REACT_APP_AZDO_ORG_URL, REACT_APP_AZDO_PROJECT, REACT_APP_AZDO_PAT in .env'
      );
    }

    // Try passing rootLevel and iterationFilter in config object
    try {
      return await fn({ orgUrl, project, pat, rootLevel: rootWorkItemType, iterationFilter });
    } catch {
      // Fallback: try positional parameters
      try {
        return await fn(orgUrl, project, pat, rootWorkItemType, iterationFilter);
      } catch {
        // Last resort: without iterationFilter for backward compatibility
        try {
          return await fn(orgUrl, project, pat, rootWorkItemType);
        } catch {
          return await fn(orgUrl, project, pat);
        }
      }
    }
  } else {
    // Extension/SDK mode
    const queryGuid = env.REACT_APP_AZDO_QUERY_GUID?.trim();

    if (fnName === 'fetchWorkItems') {
      try {
        return await fn({ rootLevel: rootWorkItemType, iterationFilter });
      } catch (e) {
        return await fn({ queryId: queryGuid, rootLevel: rootWorkItemType, iterationFilter });
      }
    }

    if (fnName === 'fetchWorkItemsFromQueryId' || fnName === 'fetchWorkItemsFromQuery') {
      if (!queryGuid) {
        throw new Error(
          `Service expects a Query GUID (env REACT_APP_AZDO_QUERY_GUID) for ${fnName}, but none was provided.`
        );
      }
      try {
        return await fn(queryGuid, rootWorkItemType, iterationFilter);
      } catch {
        const orgUrl = env.REACT_APP_AZDO_ORG_URL;
        const project = env.REACT_APP_AZDO_PROJECT;
        if (!orgUrl || !project) {
          throw new Error(
            `fetch by queryId failed. Also missing org/project. ` +
            `Set REACT_APP_AZDO_ORG_URL and REACT_APP_AZDO_PROJECT or use a service variant that reads SDK context.`
          );
        }
        return await fn(orgUrl!, project!, queryGuid, rootWorkItemType, iterationFilter);
      }
    }

    // Fallback generic call
    return await fn();
  }
}

export const useTimelineData = (rootWorkItemType: RootWorkItemType = 'Epic') => {
  const [data, setData] = useState<TimelineData>({ valueStreams: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);

      try {
        const isDev =
          process.env.NODE_ENV === 'development' ||
          !window.location.hostname.includes('dev.azure.com');

        console.log(`[useTimelineData] Fetching with root type: ${rootWorkItemType}`);

        // Use current iteration context by default (current -1, current, current +1)
        const valueStreams = await fetchValueStreamsAuto(
          isDev, 
          {
            REACT_APP_AZDO_ORG_URL: process.env.REACT_APP_AZDO_ORG_URL,
            REACT_APP_AZDO_PROJECT: process.env.REACT_APP_AZDO_PROJECT,
            REACT_APP_AZDO_PAT: process.env.REACT_APP_AZDO_PAT,
            REACT_APP_AZDO_QUERY_GUID: process.env.REACT_APP_AZDO_QUERY_GUID,
          }, 
          rootWorkItemType,
          { useCurrentIterationContext: true } // Use current iteration context
        );

        console.log('[useTimelineData] Raw valueStreams:', valueStreams);

        if (!Array.isArray(valueStreams)) {
          throw new Error(
            `Invalid data format: expected an array of value streams, got ${typeof valueStreams}`
          );
        }

        const transformed = transformLegacyData({ valueStreams });
        setData(transformed);
      } catch (e: any) {
        const message = e?.message || 'Unknown error';
        console.error('[useTimelineData] Error fetching work items:', e);
        setError(message);
        setData({ valueStreams: [] });
      } finally {
        setLoading(false);
      }
    })();
  }, [rootWorkItemType]); // Re-fetch when rootWorkItemType changes

  return { data, loading, error };
};