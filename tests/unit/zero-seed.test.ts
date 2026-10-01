import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('SF-051 — Zero-Seed Production Invariants', () => {
  const projectRoot = path.resolve(__dirname, '../..');

  it('verifies supabase/config.toml disables automatic seed execution', () => {
    const configPath = path.join(projectRoot, 'supabase', 'config.toml');
    expect(fs.existsSync(configPath)).toBe(true);

    const configContent = fs.readFileSync(configPath, 'utf8');
    
    // Check [db.seed] section
    const dbSeedMatch = configContent.match(/\[db\.seed\][\s\S]*?(?=\n\[|$)/);
    expect(dbSeedMatch).not.toBeNull();
    
    const dbSeedSection = dbSeedMatch![0];
    expect(dbSeedSection).toMatch(/enabled\s*=\s*false/);
    expect(dbSeedSection).toMatch(/sql_paths\s*=\s*\[\s*\]/);
  });

  it('verifies default supabase/seed/seed.sql contains zero INSERT DML statements', () => {
    const seedSqlPath = path.join(projectRoot, 'supabase', 'seed', 'seed.sql');
    expect(fs.existsSync(seedSqlPath)).toBe(true);

    const seedContent = fs.readFileSync(seedSqlPath, 'utf8');
    expect(seedContent.toUpperCase()).not.toContain('INSERT INTO');
  });

  it('verifies supabase migrations contain DDL only with no demo user/content seeding', () => {
    const migrationsDir = path.join(projectRoot, 'supabase', 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'));

    for (const file of migrationFiles) {
      const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      // Migrations must not contain demo items or mock users
      expect(content).not.toContain('Rick Astley');
      expect(content).not.toContain('Sample Playlist');
      expect(content).not.toContain('00000000-0000-0000-0000-000000000001');
    }
  });

  it('verifies scripts/seed-demo.mjs contains strict fail-closed production guards', () => {
    const seederPath = path.join(projectRoot, 'scripts', 'seed-demo.mjs');
    expect(fs.existsSync(seederPath)).toBe(true);

    const seederContent = fs.readFileSync(seederPath, 'utf8');
    expect(seederContent).toContain('NODE_ENV');
    expect(seederContent).toContain('production');
    expect(seederContent).toContain('supabase.co');
  });

  it('verifies demo.sql exists for explicit developer seeding only', () => {
    const demoSqlPath = path.join(projectRoot, 'supabase', 'seed', 'demo.sql');
    expect(fs.existsSync(demoSqlPath)).toBe(true);

    const demoContent = fs.readFileSync(demoSqlPath, 'utf8');
    expect(demoContent).toContain('LearnUp Demo');
  });

  it('verifies calendar system migration contains zero auto-inserted default rows', () => {
    const calMigrationPath = path.join(projectRoot, 'supabase', 'migrations', '20231002000000_calendar_system.sql');
    expect(fs.existsSync(calMigrationPath)).toBe(true);

    const content = fs.readFileSync(calMigrationPath, 'utf8');
    expect(content.toUpperCase()).not.toContain('INSERT INTO');
  });
});
