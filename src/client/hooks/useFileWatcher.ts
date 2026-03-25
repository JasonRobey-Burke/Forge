import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface FileChangeEvent {
  event: 'add' | 'change' | 'unlink';
  file: string;
}

// ── Derive entity type from file path ──────────────────────────────

function entityTypeFromPath(filePath: string): string | null {
  const normalized = filePath.replace(/\\/g, '/');
  if (normalized.includes('/products/')) return 'product';
  if (normalized.includes('/intentions/')) return 'intention';
  if (normalized.includes('/expectations/')) return 'expectation';
  if (normalized.includes('/specs/')) return 'spec';
  return null;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Main hook ──────────────────────────────────────────────────────

export function useFileWatcher() {
  const queryClient = useQueryClient();
  const retryCount = useRef(0);

  const connect = useCallback(() => {
    const baseUrl = window.location.origin;
    const eventSource = new EventSource(`${baseUrl}/api/events`);

    eventSource.addEventListener('file-change', (e) => {
      retryCount.current = 0;

      let data: FileChangeEvent | undefined;
      try {
        data = JSON.parse(e.data);
      } catch {
        // malformed event, still invalidate
      }

      // Invalidate all queries to refresh data from the YAML store
      queryClient.invalidateQueries();

      if (!data) return;

      const entityType = entityTypeFromPath(data.file);
      if (!entityType) return;

      if (data.event === 'add') {
        toast.info(`New ${entityType} detected`, {
          description: 'The list has been updated.',
          duration: 4000,
        });
      } else if (data.event === 'change') {
        toast.info(`${capitalize(entityType)} updated externally`, {
          description: 'Changes have been refreshed.',
          duration: 3000,
        });
      } else if (data.event === 'unlink') {
        toast.info(`${capitalize(entityType)} removed`, {
          description: 'The list has been updated.',
          duration: 3000,
        });
      }
    });

    eventSource.onerror = () => {
      eventSource.close();
      // Exponential backoff reconnect
      retryCount.current = Math.min(retryCount.current + 1, 5);
      const delay = Math.min(1000 * 2 ** retryCount.current, 30000);
      setTimeout(connect, delay);
    };

    return eventSource;
  }, [queryClient]);

  useEffect(() => {
    const es = connect();
    return () => es.close();
  }, [connect]);
}
