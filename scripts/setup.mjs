import { execFileSync, execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

function runNpx(args, options = {}) {
  if (process.platform === 'win32') {
    const cmd = process.env.ComSpec || 'cmd.exe';
    return execFileSync(cmd, ['/d', '/s', '/c', 'npx.cmd', ...args], { encoding: 'utf-8', ...options });
  }
  return execFileSync('npx', args, { encoding: 'utf-8', ...options });
}

function runSql(sql) {
  const tmpFile = path.join(os.tmpdir(), `learnup_query_${Date.now()}_${Math.random().toString(36).substring(2)}.sql`);
  try {
    fs.writeFileSync(tmpFile, sql, 'utf-8');
    return runNpx(['supabase', 'db', 'query', '--local', '--output-format', 'json', '-f', tmpFile]);
  } finally {
    if (fs.existsSync(tmpFile)) {
      try { fs.unlinkSync(tmpFile); } catch (e) {}
    }
  }
}

function parseCliJson(output) {
  const startIdx = output.search(/[\{\[]/);
  if (startIdx === -1) {
    throw new Error('No JSON payload found in CLI output');
  }

  const str = output.substring(startIdx);

  // Try parsing the entire remainder first
  try {
    return JSON.parse(str);
  } catch (e) {
    // If trailing text breaks JSON.parse, structurally extract the first balanced object/array
    let stack = 0;
    let isString = false;
    let escape = false;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (isString) {
        if (escape) escape = false;
        else if (char === '\\') escape = true;
        else if (char === '"') isString = false;
      } else {
        if (char === '"') isString = true;
        else if (char === '{' || char === '[') stack++;
        else if (char === '}' || char === ']') {
          stack--;
          if (stack === 0) {
            const maybeJson = str.substring(0, i + 1);
            try {
              return JSON.parse(maybeJson);
            } catch (err) {
              // Ignore and keep traversing just in case
            }
          }
        }
      }
    }
  }
  throw new Error('Failed to parse CLI JSON output structurally');
}

async function run() {
  console.log('\n==================================================');
  console.log(' LearnUp Setup');
  console.log('==================================================\n');

  function printSuccess(msg) {
    console.log(`   \x1b[32m\u2713\x1b[0m ${msg}`);
  }

  function printError(msg) {
    console.log(`   \x1b[31mx\x1b[0m ${msg}`);
  }

  // 1. Node.js check
  printSuccess(`Node.js detected`);

  // 2. Docker check
  try {
    execSync('docker info', { stdio: 'ignore' });
    printSuccess('Docker detected and running');
  } catch (err) {
    printError('Local Supabase is not running. Start Docker Desktop and run this setup again.');
    process.exit(1);
  }

  // 3. Dependencies
  try {
    execSync('npm install', { stdio: 'ignore' });
    printSuccess('Dependencies installed');
  } catch (err) {
    printError('Failed to install dependencies.');
    process.exit(1);
  }

  // 4. Local Supabase start
  try {
    let started = false;

    // First check if local Supabase is already running
    try {
      const statusCheck = runNpx(['supabase', 'status', '-o', 'json']);
      const statusJson = parseCliJson(statusCheck);
      if (statusJson && statusJson.API_URL && statusJson.ANON_KEY && statusJson._tag !== 'Error') {
        started = true;
      }
    } catch (e) {
      // Not running yet
    }

    if (!started) {
      try {
        const startOut = runNpx(['supabase', 'start']);
        try {
          const startJson = parseCliJson(startOut);
          if (startJson && startJson._tag === 'Error') {
            throw new Error(startJson.error?.message || 'Structured CLI error during supabase start');
          }
        } catch (jsonErr) {
          if (jsonErr.message && jsonErr.message.includes('Structured CLI error')) {
            throw jsonErr;
          }
        }
        started = true;
      } catch (startErr) {
        // If supabase start failed, re-verify with status check in case it actually succeeded or is already running
        try {
          const statusCheck = runNpx(['supabase', 'status', '-o', 'json']);
          const statusJson = parseCliJson(statusCheck);
          if (statusJson && statusJson.API_URL && statusJson.ANON_KEY && statusJson._tag !== 'Error') {
            started = true;
          }
        } catch (e) {}

        if (!started) {
          const detail = startErr.stderr || startErr.stdout || startErr.message || String(startErr);
          throw new Error(`supabase start failed: ${detail.trim()}`);
        }
      }
    }

    printSuccess('Local Supabase started');
  } catch (err) {
    printError(`Failed to start local Supabase. ${err.message}`);
    process.exit(1);
  }

  // 5. Verify migrations
  try {
    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
    const expectedVersions = files.map(f => f.match(/^(\d{14})/)?.[1]).filter(Boolean);

    const listOut = runNpx(['supabase', 'migration', 'list', '--local', '--output-format', 'json']);
    const listJson = parseCliJson(listOut);

    if (listJson._tag === 'Error') {
      throw new Error(listJson.error?.message || 'Structured CLI error');
    }

    const migrationsList = Array.isArray(listJson)
      ? listJson
      : (listJson && Array.isArray(listJson.migrations) ? listJson.migrations : null);

    if (!migrationsList) {
      throw new Error('Expected local migration list to contain a migrations array.');
    }

    const appliedVersions = new Set();
    for (const row of migrationsList) {
      if (row) {
        const ver = row.local || row.version;
        if (ver && /^\d{14}$/.test(String(ver))) {
          if (row.local_status !== 'pending' && row.status !== 'pending') {
            appliedVersions.add(String(ver));
          }
        }
      }
    }

    const missing = expectedVersions.filter(v => !appliedVersions.has(v));
    if (missing.length > 0) {
      throw new Error(`Missing applied local versions: ${missing.join(', ')}`);
    }

    printSuccess('Database migrations verified');
  } catch (err) {
    printError(`Failed to verify migrations. ${err.message}`);
    process.exit(1);
  }

  // 6. Local environment configuration
  let apiUrl, anonKey;
  try {
    const statusOutput = runNpx(['supabase', 'status', '-o', 'json']);
    const status = parseCliJson(statusOutput);

    if (status._tag === 'Error') {
      throw new Error(status.error?.message || 'Structured CLI error');
    }

    apiUrl = status.API_URL;
    anonKey = status.ANON_KEY;

    if (!apiUrl || !anonKey) {
      throw new Error('API_URL or ANON_KEY missing from Supabase status.');
    }

    const envContent = `# Auto-generated by setup script\nNEXT_PUBLIC_SUPABASE_URL=${apiUrl}\nNEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}\n`;
    fs.writeFileSync(path.join(process.cwd(), '.env.local'), envContent);
    printSuccess('Local environment configured');
  } catch (err) {
    printError(`Failed to configure local environment variables. ${err.message}`);
    process.exit(1);
  }

  // 7. Verify Database Reachability
  try {
    const reachOut = runSql('SELECT 1;');
    const reachJson = parseCliJson(reachOut);
    if (reachJson._tag === 'Error') {
      throw new Error(reachJson.error?.message || 'Structured CLI error');
    }
    printSuccess('Database reachable');
  } catch (err) {
    printError('Database verification failed. Local Supabase is running, but PostgreSQL is not reachable.');
    process.exit(1);
  }

  // 8. Verify Authentication
  try {
    const res = await fetch(`${apiUrl}/auth/v1/health`, {
      headers: { 'apikey': anonKey }
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    printSuccess('Authentication available');
  } catch (err) {
    printError('Authentication verification failed. The local Supabase Auth service is not reachable.');
    process.exit(1);
  }

  // 9. Zero-seed verified
  try {
    const query = `
SELECT (SELECT count(*) FROM public.learning_items) AS learning_items,
       (SELECT count(*) FROM public.learning_item_videos) AS learning_item_videos,
       (SELECT count(*) FROM public.video_progress) AS video_progress,
       (SELECT count(*) FROM public.notes) AS notes,
       (SELECT count(*) FROM public.bookmarks) AS bookmarks,
       (SELECT count(*) FROM public.user_settings) AS user_settings,
       (SELECT count(*) FROM public.user_connectors) AS user_connectors,
       (SELECT count(*) FROM public.user_plugins) AS user_plugins,
       (SELECT count(*) FROM public.token_usage_ledger) AS token_usage_ledger,
       (SELECT count(*) FROM public.focus_sessions) AS focus_sessions,
       (SELECT count(*) FROM public.calendars) AS calendars,
       (SELECT count(*) FROM public.calendar_categories) AS calendar_categories,
       (SELECT count(*) FROM public.calendar_events) AS calendar_events,
       (SELECT count(*) FROM public.calendar_event_study_sessions) AS calendar_event_study_sessions,
       (SELECT count(*) FROM public.calendar_sync_state) AS calendar_sync_state;
    `.trim();

    const out = runSql(query);
    const result = parseCliJson(out);

    if (result._tag === 'Error') {
      throw new Error(result.error?.message || 'Structured CLI error');
    }

    const rows = Array.isArray(result) ? result : (result && Array.isArray(result.rows) ? result.rows : null);

    if (!rows || rows.length !== 1) {
      throw new Error('Invalid database query output shape. Expected exactly one row.');
    }

    const row = rows[0];
    const counts = (row.counts || row.json_build_object) ? (row.counts || row.json_build_object) : row;

    if (!counts || typeof counts !== 'object') {
      throw new Error('Could not extract counts from database query output.');
    }

    const expectedTables = [
      'learning_items', 'learning_item_videos', 'video_progress',
      'notes', 'bookmarks', 'user_settings', 'user_connectors',
      'user_plugins', 'token_usage_ledger', 'focus_sessions',
      'calendars', 'calendar_categories', 'calendar_events',
      'calendar_event_study_sessions', 'calendar_sync_state'
    ];

    for (const table of expectedTables) {
      if (!(table in counts)) {
        throw new Error(`Missing count for table '${table}' in database query output.`);
      }
      const c = Number(counts[table]);
      if (!Number.isInteger(c) || c < 0) {
        throw new Error(`Invalid count for table '${table}': ${counts[table]}`);
      }
      if (c !== 0) {
        throw new Error(`Zero-seed verification failed. Table '${table}' has ${c} rows.`);
      }
    }

    printSuccess('Zero-seed verified');
  } catch (err) {
    if (err.status === 1 || err.message) {
      printError(`Failed to verify zero-seed state in database. ${err.message}`);
    }
    process.exit(1);
  }

  console.log('\n   LearnUp is ready:');
  console.log('   http://localhost:3000\n');
  console.log('   Run `npm run dev` to start the development server.');
}

run().catch(err => {
  console.error('\nSetup failed with an unexpected error:', err);
  process.exit(1);
});
