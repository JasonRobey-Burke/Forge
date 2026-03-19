import { prisma } from '../lib/prisma.js';
import type { Product, CreateProductInput, UpdateProductInput, ProductContext, WipLimits } from '../../shared/types/index.js';

const DEFAULT_CONTEXT: ProductContext = { stack: [], patterns: [], conventions: [], auth: '' };
const DEFAULT_WIP_LIMITS: WipLimits = { draft: 5, ready: 3, in_progress: 3, review: 3, validating: 2 };

function serializeProduct(row: any): Product {
  return {
    id: row.id,
    name: row.name,
    problem_statement: row.problem_statement,
    vision: row.vision,
    target_audience: row.target_audience,
    status: row.status,
    context: JSON.parse(row.context),
    wip_limits: JSON.parse(row.wip_limits),
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
    archived_at: row.archived_at?.toISOString() ?? null,
  };
}

export async function listProducts(): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    where: { archived_at: null },
    orderBy: { created_at: 'desc' },
  });
  return rows.map(serializeProduct);
}

export async function getProduct(id: string): Promise<Product | null> {
  const row = await prisma.product.findFirst({
    where: { id, archived_at: null },
  });
  return row ? serializeProduct(row) : null;
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  const row = await prisma.product.create({
    data: {
      name: input.name,
      problem_statement: input.problem_statement,
      vision: input.vision,
      target_audience: input.target_audience,
      status: input.status ?? 'Discovery',
      context: JSON.stringify(input.context ?? DEFAULT_CONTEXT),
      wip_limits: JSON.stringify(input.wip_limits ?? DEFAULT_WIP_LIMITS),
    },
  });
  return serializeProduct(row);
}

export async function updateProduct(id: string, input: UpdateProductInput): Promise<Product | null> {
  const existing = await prisma.product.findFirst({ where: { id, archived_at: null } });
  if (!existing) return null;

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.problem_statement !== undefined) data.problem_statement = input.problem_statement;
  if (input.vision !== undefined) data.vision = input.vision;
  if (input.target_audience !== undefined) data.target_audience = input.target_audience;
  if (input.status !== undefined) data.status = input.status;
  if (input.context !== undefined) data.context = JSON.stringify(input.context);
  if (input.wip_limits !== undefined) data.wip_limits = JSON.stringify(input.wip_limits);

  const row = await prisma.product.update({ where: { id }, data });
  return serializeProduct(row);
}

export async function deleteProduct(id: string): Promise<boolean> {
  const existing = await prisma.product.findFirst({ where: { id, archived_at: null } });
  if (!existing) return false;

  await prisma.product.update({
    where: { id },
    data: { archived_at: new Date() },
  });
  return true;
}
