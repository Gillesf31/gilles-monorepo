import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const outputPath = process.argv[2];

if (!outputPath) {
  console.error('Usage: node tools/write-build-version.mjs <output-path>');
  process.exit(1);
}

function readGitValue(command) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

const builtAt = new Date().toISOString();
const shortCommit = readGitValue('git rev-parse --short HEAD');

const version = {
  version: process.env.APP_VERSION || `${shortCommit || 'build'}-${builtAt}`,
  builtAt,
  commit: readGitValue('git rev-parse HEAD'),
};

const target = resolve(outputPath);

mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `${JSON.stringify(version, null, 2)}\n`);
