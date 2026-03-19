import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMssql } from '@prisma/adapter-mssql';

const adapter = new PrismaMssql(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const FORGE_ID = '00000000-0000-0000-0000-000000000001';
const SAMPLE_ID = '00000000-0000-0000-0000-000000000002';

async function main() {
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

  console.log('Seeded 2 products: Forge, Acme Portal');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
