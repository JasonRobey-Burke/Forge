import { defineConfig } from 'prisma/config';
import { PrismaSqlServer } from '@prisma/adapter-mssql';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  earlyAccess: true,
  schema: 'prisma/schema.prisma',
  migrate: {
    adapter(env: NodeJS.ProcessEnv) {
      return new PrismaSqlServer(env.DATABASE_URL!);
    },
  },
});
