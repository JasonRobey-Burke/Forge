import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { WorkspaceProjection } from '@shared/types';
export const workspaceKey = (id: string) => ['workspace', id] as const;
export function useWorkspace(id: string) {
  return useQuery({ queryKey: workspaceKey(id),
    queryFn: () => apiFetch<WorkspaceProjection>(`/products/${encodeURIComponent(id)}/workspace`),
    enabled: id !== '' });
}

export function useEvidenceSource(id: string, path: string) {
  return useQuery({queryKey:['workspace-evidence',id,path], enabled:!!id && !!path, retry:false,
    queryFn:() => apiFetch<{path:string;content:string}>(`/products/${encodeURIComponent(id)}/evidence?path=${encodeURIComponent(path)}`)});
}
