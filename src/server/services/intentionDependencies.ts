import { prisma } from '../lib/prisma.js';

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

  // DFS: can we reach intentionId starting from dependsOnId?
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

  // Fetch the intention to get its product_id
  const intention = await prisma.intention.findFirst({
    where: { id: intentionId, archived_at: null },
  });
  if (!intention) return { success: false, error: 'Intention not found' };

  // Fetch all dependency edges for this product's intentions
  const productIntentions = await prisma.intention.findMany({
    where: { product_id: intention.product_id, archived_at: null },
    select: { id: true },
  });
  const intentionIds = productIntentions.map((i) => i.id);

  const existingEdges = await prisma.intentionDependency.findMany({
    where: { intention_id: { in: intentionIds } },
  });

  if (detectCircularDependency(intentionId, dependsOnId, existingEdges)) {
    return { success: false, error: 'Adding this dependency would create a circular reference' };
  }

  await prisma.intentionDependency.create({
    data: { intention_id: intentionId, depends_on_id: dependsOnId },
  });

  return { success: true };
}

export async function removeDependency(
  intentionId: string,
  dependsOnId: string,
): Promise<boolean> {
  try {
    await prisma.intentionDependency.delete({
      where: {
        intention_id_depends_on_id: {
          intention_id: intentionId,
          depends_on_id: dependsOnId,
        },
      },
    });
    return true;
  } catch {
    return false;
  }
}
