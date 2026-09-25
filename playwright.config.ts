import { defineConfig } from '@playwright/test';
import workspace from './playwright.workspace.config';
// All suites share the generated temporary docs root and one isolated server.
export default defineConfig({ ...workspace, testMatch: '**/*.spec.ts' });
