#!/usr/bin/env node
import { startServer } from '../dist/server/index.js';

const port = parseInt(process.env.PORT ?? '4000');
const docsDir = process.env.FORGE_DOCS ?? './docs';

startServer({ port, docsDir });
