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

export async function addDependency(
  intentionId: string,
  dependsOnId: string,
): Promise<{ success: boolean; error?: string }> {
  if (intentionId === dependsOnId) {
    return { success: false, error: 'Self-reference is not allowed' };
  }

  const store = getStore();
  const intention = store.getIntention(intentionId);
  if (!intention) return { success: false, error: 'Intention not found' };

  const existingEdges = store.getAllDependencyEdges(intention.product_id);

  if (detectCircularDependency(intentionId, dependsOnId, existingEdges)) {
    return { success: false, error: 'Adding this dependency would create a circular reference' };
  }

  store.addIntentionDep(intentionId, dependsOnId);
  return { success: true };
}

export async function removeDependency(
  intentionId: string,
  dependsOnId: string,
): Promise<boolean> {
  return getStore().removeIntentionDep(intentionId, dependsOnId);
}
