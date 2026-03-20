import { prisma } from '../lib/prisma.js';
import type { Spec, CreateSpecInput, UpdateSpecInput } from '../../shared/types/index.js';

const DEFAULT_CONTEXT = { stack: [], patterns: [], conventions: [], auth: '' };

function serializeSpec(row: any): Spec {
  return {
    id: row.id,
    product_id: row.product_id,
    title: row.title,
    description: row.description,
    phase: row.phase,
    complexity: row.complexity,
    context: JSON.parse(row.context),
    boundaries: JSON.parse(row.boundaries),
    deliverables: JSON.parse(row.deliverables),
    validation_automated: JSON.parse(row.validation_automated),
    validation_human: JSON.parse(row.validation_human),
    peer_reviewed: row.peer_reviewed,
    phase_changed_at: row.phase_changed_at.toISOString(),
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
    archived_at: row.archived_at?.toISOString() ?? null,
  };
}

export async function listSpecs(productId: string): Promise<Spec[]> {
  const rows = await prisma.spec.findMany({
    where: { product_id: productId, archived_at: null },
    orderBy: { created_at: 'desc' },
  });
  return rows.map(serializeSpec);
}

export async function getSpec(id: string): Promise<Spec | null> {
  const row = await prisma.spec.findFirst({
    where: { id, archived_at: null },
  });
  return row ? serializeSpec(row) : null;
}

export async function createSpec(input: CreateSpecInput): Promise<Spec | null> {
  const product = await prisma.product.findFirst({
    where: { id: input.product_id, archived_at: null },
  });
  if (!product) return null;

  // Context inheritance: if no context provided, snapshot the product's context
  let contextStr: string;
  if (input.context) {
    contextStr = JSON.stringify(input.context);
  } else {
    contextStr = product.context; // Already a JSON string in DB
  }

  const expectationIds = input.expectation_ids ?? [];

  const row = await prisma.$transaction(async (tx) => {
    const spec = await tx.spec.create({
      data: {
        product_id: input.product_id,
        title: input.title,
        description: input.description,
        phase: input.phase ?? 'Draft',
        complexity: input.complexity ?? 'Medium',
        context: contextStr,
        boundaries: JSON.stringify(input.boundaries ?? []),
        deliverables: JSON.stringify(input.deliverables ?? []),
        validation_automated: JSON.stringify(input.validation_automated ?? []),
        validation_human: JSON.stringify(input.validation_human ?? []),
        peer_reviewed: false,
      },
    });

    if (expectationIds.length > 0) {
      await tx.specExpectation.createMany({
        data: expectationIds.map((eid) => ({
          spec_id: spec.id,
          expectation_id: eid,
        })),
      });
    }

    return spec;
  });

  return serializeSpec(row);
}

export async function updateSpec(id: string, input: UpdateSpecInput): Promise<Spec | null> {
  const existing = await prisma.spec.findFirst({ where: { id, archived_at: null } });
  if (!existing) return null;

  const data: Record<string, unknown> = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.phase !== undefined) data.phase = input.phase;
  if (input.complexity !== undefined) data.complexity = input.complexity;
  if (input.context !== undefined) data.context = JSON.stringify(input.context);
  if (input.boundaries !== undefined) data.boundaries = JSON.stringify(input.boundaries);
  if (input.deliverables !== undefined) data.deliverables = JSON.stringify(input.deliverables);
  if (input.validation_automated !== undefined) data.validation_automated = JSON.stringify(input.validation_automated);
  if (input.validation_human !== undefined) data.validation_human = JSON.stringify(input.validation_human);
  if (input.peer_reviewed !== undefined) data.peer_reviewed = input.peer_reviewed;

  const row = await prisma.spec.update({ where: { id }, data });
  return serializeSpec(row);
}

export async function deleteSpec(id: string): Promise<boolean> {
  const existing = await prisma.spec.findFirst({ where: { id, archived_at: null } });
  if (!existing) return false;

  await prisma.spec.update({
    where: { id },
    data: { archived_at: new Date() },
  });
  return true;
}

export async function linkExpectations(specId: string, expectationIds: string[]): Promise<boolean> {
  const existing = await prisma.spec.findFirst({ where: { id: specId, archived_at: null } });
  if (!existing) return false;

  await prisma.$transaction(async (tx) => {
    await tx.specExpectation.deleteMany({ where: { spec_id: specId } });
    if (expectationIds.length > 0) {
      await tx.specExpectation.createMany({
        data: expectationIds.map((eid) => ({
          spec_id: specId,
          expectation_id: eid,
        })),
      });
    }
  });

  return true;
}

export async function getSpecExpectations(specId: string) {
  const rows = await prisma.specExpectation.findMany({
    where: { spec_id: specId },
    include: { expectation: true },
  });
  return rows.map((row) => ({
    id: row.expectation.id,
    title: row.expectation.title,
    description: row.expectation.description,
    status: row.expectation.status,
    edge_cases: JSON.parse(row.expectation.edge_cases),
  }));
}

export async function countSpecsByPhase(productId: string, phase: string): Promise<number> {
  return prisma.spec.count({
    where: { product_id: productId, phase, archived_at: null },
  });
}
