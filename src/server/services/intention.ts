import { prisma } from '../lib/prisma.js';
import type { Intention, CreateIntentionInput, UpdateIntentionInput } from '../../shared/types/index.js';

function serializeIntention(row: any): Intention {
  return {
    id: row.id,
    product_id: row.product_id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
    archived_at: row.archived_at?.toISOString() ?? null,
  };
}

export async function listIntentions(productId: string): Promise<Intention[]> {
  const rows = await prisma.intention.findMany({
    where: { product_id: productId, archived_at: null },
    orderBy: { created_at: 'desc' },
  });
  return rows.map(serializeIntention);
}

export async function getIntention(id: string): Promise<(Intention & { dependencies?: any[] }) | null> {
  const row = await prisma.intention.findFirst({
    where: { id, archived_at: null },
    include: {
      dependencies_as_source: {
        include: { depends_on: true },
      },
    },
  });
  if (!row) return null;
  const serialized = serializeIntention(row);
  return {
    ...serialized,
    dependencies: (row as any).dependencies_as_source?.map((dep: any) => ({
      id: dep.depends_on.id,
      title: dep.depends_on.title,
    })) ?? [],
  };
}

export async function createIntention(input: CreateIntentionInput): Promise<Intention | null> {
  const product = await prisma.product.findFirst({
    where: { id: input.product_id, archived_at: null },
  });
  if (!product) return null;

  const row = await prisma.intention.create({
    data: {
      product_id: input.product_id,
      title: input.title,
      description: input.description,
      priority: input.priority ?? 'Medium',
      status: input.status ?? 'Draft',
    },
  });
  return serializeIntention(row);
}

export async function updateIntention(id: string, input: UpdateIntentionInput): Promise<Intention | null> {
  const existing = await prisma.intention.findFirst({ where: { id, archived_at: null } });
  if (!existing) return null;

  const data: Record<string, unknown> = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.status !== undefined) data.status = input.status;

  const row = await prisma.intention.update({ where: { id }, data });
  return serializeIntention(row);
}

export async function deleteIntention(id: string): Promise<{ success: boolean; error?: string }> {
  const existing = await prisma.intention.findFirst({ where: { id, archived_at: null } });
  if (!existing) return { success: false, error: 'not_found' };

  const childCount = await prisma.expectation.count({
    where: { intention_id: id, archived_at: null },
  });
  if (childCount > 0) {
    return { success: false, error: 'has_children' };
  }

  await prisma.intention.update({
    where: { id },
    data: { archived_at: new Date() },
  });
  return { success: true };
}
