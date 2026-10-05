#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demoSqlPath = path.join(projectRoot, 'supabase', 'seed', 'demo.sql');

function readConfiguredSupabaseUrl() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return process.env.NEXT_PUBLIC_SUPABASE_URL.trim();
  }

  for (const fileName of ['.env.local', '.env']) {
    const envPath = path.join(projectRoot, fileName);
    if (!fs.existsSync(envPath)) continue;

    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/^\s*NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.*?)\s*$/m);
    if (match) return match[1].replace(/^(['"])(.*)\1$/, '$2').trim();
  }

  return '';
}

function assertLocalDevelopmentEnvironment() {
  const nodeEnv = (process.env.NODE_ENV || '').toLowerCase();
  const deploymentEnv = (process.env.VERCEL_ENV || '').toLowerCase();
  if (nodeEnv === 'production' || deploymentEnv === 'production') {
    throw new Error('Demo seeding is blocked in production environments.');
  }

  const configuredUrl = readConfiguredSupabaseUrl();
  if (!configuredUrl || configuredUrl.toLowerCase().includes('supabase.co')) {
    throw new Error('Demo seeding requires an explicitly configured local Supabase URL.');
  }

  let host;
  try {
    host = new URL(configuredUrl).hostname.toLowerCase();
  } catch {
    throw new Error('Demo seeding refused an invalid Supabase URL.');
  }

  if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
    throw new Error('Demo seeding is permitted only against a local Supabase instance.');
  }
}

function runLocalSeed() {
  const args = ['supabase', 'db', 'query', '--local', '-f', demoSqlPath];
  if (process.platform === 'win32') {
    execFileSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'npx.cmd', ...args], {
      cwd: projectRoot,
      stdio: 'inherit'
    });
    return;
  }
  execFileSync('npx', args, { cwd: projectRoot, stdio: 'inherit' });
}

assertLocalDevelopmentEnvironment();
if (!fs.existsSync(demoSqlPath)) {
  throw new Error('The optional development demo SQL file is missing.');
}

console.log('Applying optional LearnUp demo fixtures to the local Supabase database.');
runLocalSeed();
console.log('Local development demo fixtures were applied.');
