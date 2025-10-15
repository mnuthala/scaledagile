import { useState, useEffect } from 'react';
import type { TimelineData } from '../utils/dataAdapter';
import { transformLegacyData } from '../utils/dataAdapter';

// Small helper to pretty-print available exports if we can't find a fetcher
function listExportedKeys(mod: any) {
  try {
    return Object.keys(mod).sort().join(', ');
  } catch {
    return '(unable to inspect module exports)';
  }
}

// Tries to call the “best” available fetcher in the service
async function fetchValueStreamsAuto(
  isDev: boolean,
  env: Record<string, string | undefined>
): Promise<any[]> {
  // 🚀 Dynamically import the service so we can inspect exports safely
  // (prevents “is not a function” at import time)
  const svc = await import('../services/azure-devops-service');

  // Common candidates we’ve seen across iterations of this repo
  const candidates = [
    'fetchWorkItems',                // (orgUrl, project, pat?) or () with SDK
    'fetchValueStreams',             // () -> valueStreams[]
    'fetchWorkItemsFromQueryId',     // (orgUrl, project, queryId, headers?) or (queryId)
    'fetchWorkItemsFromQuery',       // (queryId) -> ids then items
    'getValueStreams',               // generic
  ] as const;

  // Pick the first available function name
  const fnName = candidates.find((k) => typeof (svc as any)[k] === 'function');

  if (!fnName) {
    throw new Error(
      `No known fetch function found in azure-devops-service. ` +
      `Tried: ${candidates.join(', ')}. ` +
      `Exports I can see: ${listExportedKeys(svc)}`
    );
  }

  const fn = (svc as any)[fnName];

  // Build arguments based on mode + function signature we found
  if (isDev) {
    // Local dev (PAT flow)
    const orgUrl = env.REACT_APP_AZDO_ORG_URL;
    const project = env.REACT_APP_AZDO_PROJECT;
    const pat = env.REACT_APP_AZDO_PAT;

    if (!orgUrl || !project || !pat) {
      throw new Error(
        'Missing Azure DevOps config. Set REACT_APP_AZDO_ORG_URL, REACT_APP_AZDO_PROJECT, REACT_APP_AZDO_PAT in .env'
      );
    }

    // Try common signatures for dev
    // - fetchWorkItems({ orgUrl, project, pat })
    // - fetchWorkItems(orgUrl, project, pat)
    // - fetchValueStreams({ orgUrl, project, pat })
    try {
      return await fn({ orgUrl, project, pat });
    } catch {
      return await fn(orgUrl, project, pat);
    }
  } else {
    // Extension/SDK mode (Query GUID optional)
    const queryGuid = env.REACT_APP_AZDO_QUERY_GUID?.trim();

    if (fnName === 'fetchWorkItems') {
      // Many service versions accept no args in SDK mode
      try {
        return await fn();
      } catch (e) {
        // Some variants accept (options)
        return await fn({ queryId: queryGuid });
      }
    }

    if (fnName === 'fetchWorkItemsFromQueryId' || fnName === 'fetchWorkItemsFromQuery') {
      if (!queryGuid) {
        throw new Error(
          `Service expects a Query GUID (env REACT_APP_AZDO_QUERY_GUID) for ${fnName}, but none was provided.`
        );
      }
      // Try (queryId) first; if that fails, try with org/project if the service requires them
      try {
        return await fn(queryGuid);
      } catch {
        const orgUrl = env.REACT_APP_AZDO_ORG_URL;
        const project = env.REACT_APP_AZDO_PROJECT;
        if (!orgUrl || !project) {
          throw new Error(
            `fetch by queryId failed with (queryId). Also missing org/project. ` +
            `Set REACT_APP_AZDO_ORG_URL and REACT_APP_AZDO_PROJECT or use a service variant that reads SDK context.`
          );
        }
        return await fn(orgUrl!, project!, queryGuid);
      }
    }

    // Fallback generic call (no args)
    return await fn();
  }
}

export const useTimelineData = () => {
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

        const valueStreams = await fetchValueStreamsAuto(isDev, {
          REACT_APP_AZDO_ORG_URL: process.env.REACT_APP_AZDO_ORG_URL,
          REACT_APP_AZDO_PROJECT: process.env.REACT_APP_AZDO_PROJECT,
          REACT_APP_AZDO_PAT: process.env.REACT_APP_AZDO_PAT,
          REACT_APP_AZDO_QUERY_GUID: process.env.REACT_APP_AZDO_QUERY_GUID,
        });

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
  }, []);

  return { data, loading, error };
};
