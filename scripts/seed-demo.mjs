#!/usr/bin/env node

/**
 * LearnUp Development Demo Seeder
 * 
 * Applies synthetic demo data to local development PostgreSQL database.
 * STRICTLY BLOCKED in production environments.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// 1. Fail-Closed Environment Security Verification
function verifySafeEnvironment() {
  const envLocalPath = path.join(projectRoot, '.env.local');
  const envPath = path.join(projectRoot, '.env');
  
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl && fs.existsSync(envLocalPath)) {
    const content = fs.readFileSync(envLocalPath, 'utf8');
    const match = content.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/);
    if (match) supabaseUrl = match[1].trim();
  } else if (!supabaseUrl && fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/);
    if (match) supabaseUrl = match[1].trim();
  }

  // Check 1: Explicit Production Flags
  const nodeEnv = (process.env.NODE_ENV || '').toLowerCase();
  const vercelEnv = (process.env.VERCEL_ENV || '').toLowerCase();
  if (nodeEnv === 'production' || vercelEnv === 'production') {
    console.error('\n❌ FATAL: Demo seeding is strictly blocked in production environments (NODE_ENV=production).\n');
    process.exit(1);
  }

  // Check 2: Remote / Hosted Supabase Domain Guard
  if (supabaseUrl && (supabaseUrl.includes('supabase.co') || !supabaseUrl.match(/^(https?:\/\/)?(127\.0\.0\.1|localhost)(:\d+)?/))) {
    console.error(`\n❌ FATAL: Demo seeding refused. Target database URL [${supabaseUrl}] is not a recognized local development instance.\n`);
    process.exit(1);
  }

  // Check 3: Default Local Host Verification
  const isLocalHost = !supabaseUrl || supabaseUrl.includes('127.0.0.1') || supabaseUrl.includes('localhost');
  if (!isLocalHost) {
    console.error('\n❌ FATAL: Environment cannot be confidently verified as a local sandbox.\n');
    process.exit(1);
  }

  return true;
}

async function main() {
  console.log('\n🌱 [LearnUp] Validating environment safety...');
  verifySafeEnvironment();
  console.log('   ✓ Safe local development environment confirmed.');

  const demoSqlPath = path.join(projectRoot, 'supabase', 'seed', 'demo.sql');
  if (!fs.existsSync(demoSqlPath)) {
    console.error(`\n❌ Error: Demo SQL seed file not found at ${demoSqlPath}\n`);
    process.exit(1);
  }

  console.log('🌱 [LearnUp] Applying synthetic development demo fixtures...');

  try {
    // Execute SQL directly against local Supabase database via CLI
    execSync(`npx supabase db query --file "${demoSqlPath}"`, {
      cwd: projectRoot,
      stdio: 'inherit'
    });

    console.log('\n✨ [LearnUp] Synthetic demo data successfully seeded!');
    console.log('   • 1 Demo Course & 1 Demo Playlist created');
    console.log('   • 3 Video Chapters, 1 LaTeX Note, 1 Bookmark generated');
    console.log('   • User ID: 00000000-0000-0000-0000-000000000001\n');
    console.log('💡 To reset back to an empty database at any time, run:');
    console.log('   npx supabase db reset\n');
  } catch (err) {
    console.error('\n❌ Failed to execute demo seed SQL via Supabase CLI.');
    console.error(err.message);
    process.exit(1);
  }
}

main();
