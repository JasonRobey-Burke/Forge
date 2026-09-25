import { getStore } from '../lib/yamlStore.js';

interface Edge {
  intention_id: string;
  depends_on_id: string;
}

/**
 * Pure function: DFS from dependsOnId through the graph.
 * If we can reach intentionId, adding this edge would create a cycle.
 */
export function detectCircularDependency(
  intentionId: string,
  dependsOnId: string,
  edges: Edge[],
): boolean {
  if (intentionId === dependsOnId) return true;

  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const targets = adjacency.get(edge.intention_id) ?? [];
    targets.push(edge.depends_on_id);
    adjacency.set(edge.intention_id, targets);
  }

  const visited = new Set<string>();
  const stack = [dependsOnId];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === intentionId) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    const neighbors = adjacency.get(current) ?? [];
    for (const neighbor of neighbors) {
      stack.push(neighbor);
    }
  }

  return false;
}

export async function addDependency(intentionId: string, dependsOnId: string, expectedRevision: string): Promise<{success:boolean;error?:string}> {
  await getStore().addIntentionDep(intentionId,dependsOnId,expectedRevision);
  return {success:true};
}
export async function removeDependency(intentionId: string, dependsOnId: string, expectedRevision: string): Promise<boolean> {
  return getStore().removeIntentionDep(intentionId,dependsOnId,expectedRevision);
}
