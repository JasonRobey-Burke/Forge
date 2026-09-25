export type ArtifactType = 'products' | 'intentions' | 'expectations' | 'specs';
export interface ArtifactRef { type: ArtifactType; id: string }
export interface SourceMeta {
  repository_id: string;
  revision: string;
  path: string;
  read_only_fields: Record<string, string>;
}
export interface Versioned<T> { data: T; source: SourceMeta }
export type Sourced<T> = T & { source: SourceMeta };
