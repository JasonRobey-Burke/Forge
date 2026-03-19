import { vi } from 'vitest';

function createModelMock() {
  return {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    upsert: vi.fn(),
  };
}

export const prismaMock = {
  product: createModelMock(),
  intention: createModelMock(),
  expectation: createModelMock(),
  spec: createModelMock(),
  specExpectation: createModelMock(),
  intentionDependency: createModelMock(),
  phaseTransition: createModelMock(),
  $transaction: vi.fn((fn: (tx: any) => Promise<any>) => fn(prismaMock)),
  $queryRaw: vi.fn(),
};
