import { defineConfig } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
const marker = process.env.FORGE_E2E_STATE ?? path.join(os.tmpdir(), `forge-workspace-state-${randomUUID()}.json`);
process.env.FORGE_E2E_STATE = marker;
export default defineConfig({
  testDir: './e2e', testMatch: 'workspace-*.spec.ts', workers: 1, fullyParallel: false,
  timeout: 30000, expect: { timeout: 10000 },
  use: { baseURL: 'http://127.0.0.1:4181', browserName: 'chromium', trace: 'retain-on-failure' },
  webServer: { command: 'node e2e/start-workspace-server.mjs', url: 'http://127.0.0.1:4181/api/health', reuseExistingServer: false, timeout: 30000, env: { FORGE_E2E_STATE: marker } },
});
