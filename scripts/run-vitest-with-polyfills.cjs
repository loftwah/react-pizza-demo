#!/usr/bin/env node

/* eslint-env node */
/* eslint-disable @typescript-eslint/no-require-imports */
/* global require, __dirname, process */

const { spawn } = require('node:child_process');
const path = require('node:path');

const polyfillPath = path.resolve(__dirname, 'vitest-polyfills.cjs');
const vitestEntrypoint = path.resolve(
  __dirname,
  '../node_modules/vitest/vitest.mjs',
);
const args = process.argv.slice(2);

const existingNodeOptions = process.env.NODE_OPTIONS ?? '';
const polyfillOption = `--require ${polyfillPath}`;
const combinedNodeOptions = [existingNodeOptions, polyfillOption]
  .filter(Boolean)
  .join(' ')
  .trim();

const child = spawn(
  process.execPath,
  ['--require', polyfillPath, vitestEntrypoint, ...args],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_OPTIONS: combinedNodeOptions,
    },
  },
);

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
