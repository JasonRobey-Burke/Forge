import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMssql } from '@prisma/adapter-mssql';

const adapter = new PrismaMssql(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

// Valid RFC 4122 v4 UUIDs (Zod v4 requires variant bits 8/9/a/b at position 19)
const FORGE_ID = 'a0000000-0000-4000-a000-000000000001';
const SAMPLE_ID = 'a0000000-0000-4000-a000-000000000002';

// Intention IDs
const INT_HIERARCHY_ID = '11000000-0000-4000-a000-000000000001';
const INT_KANBAN_ID = '11000000-0000-4000-a000-000000000002';
const INT_AI_READY_ID = '11000000-0000-4000-a000-000000000003';

// Expectation IDs
const EXP_CRUD_ID = '22000000-0000-4000-a000-000000000001';
const EXP_HIERARCHY_NAV_ID = '22000000-0000-4000-a000-000000000002';
const EXP_PHASE_FLOW_ID = '22000000-0000-4000-a000-000000000003';
const EXP_WIP_LIMITS_ID = '22000000-0000-4000-a000-000000000004';
const EXP_CONTEXT_INHERIT_ID = '22000000-0000-4000-a000-000000000005';
const EXP_COMPLETENESS_ID = '22000000-0000-4000-a000-000000000006';

// Spec IDs
const SPEC_001_ID = '33000000-0000-4000-a000-000000000001';
const SPEC_002_ID = '33000000-0000-4000-a000-000000000002';

async function main() {
  // Products
  await prisma.product.upsert({
    where: { id: FORGE_ID },
    update: {},
    create: {
      id: FORGE_ID,
      name: 'Forge',
      problem_statement: 'Teams adopting AI-assisted development need a spec-management tool that reflects how work flows in an AI-augmented environment.',
      vision: 'The first tool purpose-built for Intent-Driven Development.',
      target_audience: 'Development teams (3-12 people) practicing AI-assisted development.',
      status: 'Active',
      context: JSON.stringify({
        stack: ['React 19', 'TypeScript', 'Express 5', 'Prisma v7', 'SQL Server', 'Tailwind CSS', 'shadcn/ui'],
        patterns: ['IDD hierarchy', 'Kanban flow', 'Spec-centric workflow'],
        conventions: ['Soft deletes', 'JSON columns for flexible data', 'Zod validation shared client/server'],
        auth: 'Microsoft Entra ID with JWT validation',
      }),
      wip_limits: JSON.stringify({ draft: 5, ready: 3, in_progress: 3, review: 3, validating: 2 }),
    },
  });

  await prisma.product.upsert({
    where: { id: SAMPLE_ID },
    update: {},
    create: {
      id: SAMPLE_ID,
      name: 'Acme Portal',
      problem_statement: 'Customer-facing portal lacks self-service capabilities, driving 60% of support tickets.',
      vision: 'A self-service portal that reduces support tickets by 50% within 6 months.',
      target_audience: 'Enterprise customers managing accounts and subscriptions.',
      status: 'Discovery',
      context: JSON.stringify({
        stack: ['Next.js', 'TypeScript', 'PostgreSQL', 'Prisma'],
        patterns: ['Server components', 'API routes', 'Role-based access'],
        conventions: ['Feature flags', 'A/B testing', 'Incremental rollout'],
        auth: 'Auth0 with RBAC',
      }),
      wip_limits: JSON.stringify({ draft: 10, ready: 5, in_progress: 5, review: 5, validating: 3 }),
    },
  });

  // Intentions for Forge
  await prisma.intention.upsert({
    where: { id: INT_HIERARCHY_ID },
    update: {},
    create: {
      id: INT_HIERARCHY_ID,
      product_id: FORGE_ID,
      title: 'Teams can organize work in a purpose-driven hierarchy',
      description: 'The IDD hierarchy (Product → Intentions → Expectations → Specs) replaces traditional Epics/Features/Stories with a purpose-decomposition model that maps intent to deliverables.',
      priority: 'Critical',
      status: 'InProgress',
    },
  });

  await prisma.intention.upsert({
    where: { id: INT_KANBAN_ID },
    update: {},
    create: {
      id: INT_KANBAN_ID,
      product_id: FORGE_ID,
      title: 'Teams can track spec progress through a Kanban workflow',
      description: 'Specs flow through phases (Draft → Ready → In Progress → Review → Validating → Done) with WIP limits and validation gates to ensure quality.',
      priority: 'High',
      status: 'Draft',
    },
  });

  await prisma.intention.upsert({
    where: { id: INT_AI_READY_ID },
    update: {},
    create: {
      id: INT_AI_READY_ID,
      product_id: FORGE_ID,
      title: 'Teams can generate AI-ready spec documents',
      description: 'Specs include structured Context, Boundaries, Deliverables, and Validation sections that can be directly consumed by AI coding agents.',
      priority: 'High',
      status: 'Draft',
    },
  });

  // Dependency: Kanban depends on Hierarchy being in place
  try {
    await prisma.intentionDependency.create({
      data: { intention_id: INT_KANBAN_ID, depends_on_id: INT_HIERARCHY_ID },
    });
  } catch { /* already exists */ }

  // Expectations
  await prisma.expectation.upsert({
    where: { id: EXP_CRUD_ID },
    update: {},
    create: {
      id: EXP_CRUD_ID,
      intention_id: INT_HIERARCHY_ID,
      title: 'All hierarchy entities support full CRUD operations',
      description: 'Products, Intentions, Expectations, and Specs can be created, read, updated, and soft-deleted.',
      status: 'Specced',
      edge_cases: JSON.stringify(['Deleting an entity with children should be blocked', 'Archived entities should not appear in lists']),
    },
  });

  await prisma.expectation.upsert({
    where: { id: EXP_HIERARCHY_NAV_ID },
    update: {},
    create: {
      id: EXP_HIERARCHY_NAV_ID,
      intention_id: INT_HIERARCHY_ID,
      title: 'Users can navigate the full hierarchy with breadcrumbs',
      description: 'Breadcrumb navigation shows the full path from Products down to the current entity level.',
      status: 'Specced',
      edge_cases: JSON.stringify(['Deeply nested paths should not overflow', 'Clicking a breadcrumb navigates correctly']),
    },
  });

  await prisma.expectation.upsert({
    where: { id: EXP_PHASE_FLOW_ID },
    update: {},
    create: {
      id: EXP_PHASE_FLOW_ID,
      intention_id: INT_KANBAN_ID,
      title: 'Specs can transition through all phases',
      description: 'Specs move through Draft → Ready → InProgress → Review → Validating → Done with appropriate validation at each gate.',
      status: 'Draft',
      edge_cases: JSON.stringify(['Skipping phases should be blocked', 'Moving backwards should require override reason']),
    },
  });

  await prisma.expectation.upsert({
    where: { id: EXP_WIP_LIMITS_ID },
    update: {},
    create: {
      id: EXP_WIP_LIMITS_ID,
      intention_id: INT_KANBAN_ID,
      title: 'WIP limits are enforced per phase',
      description: 'Each phase has a configurable maximum number of specs that can be in that phase simultaneously.',
      status: 'Draft',
      edge_cases: JSON.stringify(['WIP limit of 0 should block all new entries', 'Override mechanism for urgent specs']),
    },
  });

  await prisma.expectation.upsert({
    where: { id: EXP_CONTEXT_INHERIT_ID },
    update: {},
    create: {
      id: EXP_CONTEXT_INHERIT_ID,
      intention_id: INT_AI_READY_ID,
      title: 'New specs inherit context from their parent product',
      description: 'When creating a spec, the Product\'s context (stack, patterns, conventions, auth) is automatically copied as the spec\'s starting context.',
      status: 'Specced',
      edge_cases: JSON.stringify(['Editing inherited context should not affect the product', 'Product context changes should not retroactively update specs']),
    },
  });

  await prisma.expectation.upsert({
    where: { id: EXP_COMPLETENESS_ID },
    update: {},
    create: {
      id: EXP_COMPLETENESS_ID,
      intention_id: INT_AI_READY_ID,
      title: 'Specs must pass completeness checklist before Ready',
      description: 'An 11-criteria checklist validates that a spec has sufficient detail before it can transition from Draft to Ready.',
      status: 'Draft',
      edge_cases: JSON.stringify(['Partially complete specs should show which criteria fail', 'Override should be possible with documented reason']),
    },
  });

  // Specs linked to expectations
  await prisma.spec.upsert({
    where: { id: SPEC_001_ID },
    update: {},
    create: {
      id: SPEC_001_ID,
      product_id: FORGE_ID,
      title: 'SPEC-001: Project scaffolding and database schema',
      description: 'Set up the monorepo, Docker dev environment, Prisma schema, and basic Express+React scaffolding.',
      phase: 'Done',
      complexity: 'Medium',
      context: JSON.stringify({
        stack: ['React 19', 'TypeScript', 'Express 5', 'Prisma v7', 'SQL Server'],
        patterns: ['Monorepo', 'Docker dev env'],
        conventions: ['Prisma v7 adapter pattern'],
        auth: 'BYPASS_AUTH=true for dev',
      }),
      boundaries: JSON.stringify(['No UI beyond placeholder', 'No business logic', 'Schema only']),
      deliverables: JSON.stringify(['Prisma schema', 'Docker compose', 'Express + Vite scaffold']),
      validation_automated: JSON.stringify(['prisma migrate dev succeeds', 'podman-compose up starts cleanly']),
      validation_human: JSON.stringify(['Health endpoint returns 200']),
      peer_reviewed: true,
    },
  });

  await prisma.spec.upsert({
    where: { id: SPEC_002_ID },
    update: {},
    create: {
      id: SPEC_002_ID,
      product_id: FORGE_ID,
      title: 'SPEC-002: Product CRUD',
      description: 'Implement full CRUD for the Product entity establishing patterns for all subsequent entity CRUDs.',
      phase: 'Done',
      complexity: 'Medium',
      context: JSON.stringify({
        stack: ['React 19', 'TypeScript', 'Express 5', 'Prisma v7', 'SQL Server', 'shadcn/ui'],
        patterns: ['Service layer', 'Zod validation', 'React Query'],
        conventions: ['JSON columns', 'Soft deletes', 'Standard API response shape'],
        auth: 'BYPASS_AUTH=true for dev',
      }),
      boundaries: JSON.stringify(['Product entity only', 'No hierarchy navigation']),
      deliverables: JSON.stringify(['Product service', 'Product routes', 'Product pages', 'ProductForm component']),
      validation_automated: JSON.stringify(['All CRUD operations work via API']),
      validation_human: JSON.stringify(['Create/edit/delete flow works in browser']),
      peer_reviewed: true,
    },
  });

  // Link specs to expectations
  try {
    await prisma.specExpectation.create({
      data: { spec_id: SPEC_002_ID, expectation_id: EXP_CRUD_ID },
    });
  } catch { /* already exists */ }

  console.log('Seeded: 2 products, 3 intentions, 6 expectations, 2 specs, 1 dependency, 1 spec-expectation link');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
