import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useFileWatcher() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const baseUrl = window.location.origin;
    const eventSource = new EventSource(`${baseUrl}/api/events`);

    eventSource.addEventListener('file-change', () => {
      // Invalidate all queries to refresh data from the YAML store
      queryClient.invalidateQueries();
    });

    eventSource.onerror = () => {
      // SSE connection lost — will auto-reconnect
    };

    return () => {
      eventSource.close();
    };
  }, [queryClient]);
}
