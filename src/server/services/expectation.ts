import { prisma } from '../lib/prisma.js';
import type { Expectation, CreateExpectationInput, UpdateExpectationInput } from '../../shared/types/index.js';

function serializeExpectation(row: any): Expectation {
  return {
    id: row.id,
    intention_id: row.intention_id,
    title: row.title,
    description: row.description,
    status: row.status,
    edge_cases: JSON.parse(row.edge_cases),
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
    archived_at: row.archived_at?.toISOString() ?? null,
  };
}

export async function listExpectations(intentionId: string): Promise<Expectation[]> {
  const rows = await prisma.expectation.findMany({
    where: { intention_id: intentionId, archived_at: null },
    orderBy: { created_at: 'desc' },
  });
  return rows.map(serializeExpectation);
}

export async function getExpectation(id: string): Promise<Expectation | null> {
  const row = await prisma.expectation.findFirst({
    where: { id, archived_at: null },
  });
  return row ? serializeExpectation(row) : null;
}

export async function createExpectation(input: CreateExpectationInput): Promise<Expectation | null> {
  const intention = await prisma.intention.findFirst({
    where: { id: input.intention_id, archived_at: null },
  });
  if (!intention) return null;

  const row = await prisma.expectation.create({
    data: {
      intention_id: input.intention_id,
      title: input.title,
      description: input.description,
      status: input.status ?? 'Draft',
      edge_cases: JSON.stringify(input.edge_cases),
    },
  });
  return serializeExpectation(row);
}

export async function updateExpectation(id: string, input: UpdateExpectationInput): Promise<Expectation | null> {
  const existing = await prisma.expectation.findFirst({ where: { id, archived_at: null } });
  if (!existing) return null;

  const data: Record<string, unknown> = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.status !== undefined) data.status = input.status;
  if (input.edge_cases !== undefined) data.edge_cases = JSON.stringify(input.edge_cases);

  const row = await prisma.expectation.update({ where: { id }, data });
  return serializeExpectation(row);
}

export async function deleteExpectation(id: string): Promise<boolean> {
  const existing = await prisma.expectation.findFirst({ where: { id, archived_at: null } });
  if (!existing) return false;

  await prisma.expectation.update({
    where: { id },
    data: { archived_at: new Date() },
  });
  return true;
}
