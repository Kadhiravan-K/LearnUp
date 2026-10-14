import { describe, it, expect, beforeEach } from 'vitest';
import {
  addOrUpdateSavedProfile,
  getStoredProfiles,
  saveStoredProfiles,
  PROFILE_COOKIE_KEY,
  PROFILE_STORAGE_KEY,
  type SavedProfile,
} from '@/lib/auth/profileCookies';

// Mock localStorage and document for node test environment
let cookieStore = '';
let localStorageStore: Record<string, string> = {};

const localStorageMock = {
  getItem: (key: string) => localStorageStore[key] || null,
  setItem: (key: string, value: string) => {
    localStorageStore[key] = value.toString();
  },
  removeItem: (key: string) => {
    delete localStorageStore[key];
  },
  clear: () => {
    localStorageStore = {};
  },
};

const documentMock = {
  get cookie() {
    return cookieStore;
  },
  set cookie(val: string) {
    if (val.includes('max-age=0')) {
      cookieStore = '';
    } else {
      // Split on semicolon to mimic simple cookie name=val
      const parts = val.split(';')[0];
      cookieStore = parts;
    }
  },
};

Object.defineProperty(globalThis, 'window', {
  value: globalThis,
  writable: true,
});

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

Object.defineProperty(globalThis, 'document', {
  value: documentMock,
  writable: true,
});

describe('Security: Password Non-Persistence in Profiles', () => {
  beforeEach(() => {
    cookieStore = '';
    localStorageStore = {};
  });

  it('never stores raw passwords in localStorage or document.cookie when adding a profile', () => {
    const profile = addOrUpdateSavedProfile({
      email: 'alex@example.com',
      name: 'Alex Developer',
      color: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
      // Attacker or legacy code attempting to pass a password:
      ...({ password: 'SuperSecretPassword123!' } as any),
    });

    expect(profile).toBeDefined();
    expect(profile.email).toBe('alex@example.com');
    expect(profile.name).toBe('Alex Developer');
    expect((profile as any).password).toBeUndefined();

    // Verify localStorage contains NO password
    const rawLocal = localStorage.getItem(PROFILE_STORAGE_KEY);
    expect(rawLocal).toBeTruthy();
    expect(rawLocal).not.toContain('SuperSecretPassword123!');
    expect(rawLocal).not.toContain('"password"');

    // Verify document.cookie contains NO password
    expect(document.cookie).not.toContain('SuperSecretPassword123!');
    expect(document.cookie).not.toContain('password');
  });

  it('safely sanitizes legacy profile passwords in cookies/localStorage while preserving legitimate metadata', () => {
    // Simulate legacy storage with raw password persisted
    const legacyProfiles = [
      {
        id: 'prof-legacy-1',
        name: 'Legacy User',
        email: 'legacy@example.com',
        password: 'LegacyPlaintextPassword!',
        color: 'linear-gradient(135deg, #10B981 0%, #047857 100%)',
        initials: 'LU',
        lastActive: '2026-01-01T00:00:00.000Z',
        lockType: 'none',
      },
      {
        id: 'prof-legacy-2',
        name: 'Safe User',
        email: 'safe@example.com',
        color: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
        initials: 'SU',
        lastActive: '2026-01-01T00:00:00.000Z',
        lockType: 'none',
      },
    ];

    // Seed localStorage and cookies with legacy profile data
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(legacyProfiles));
    document.cookie = `${PROFILE_COOKIE_KEY}=${encodeURIComponent(JSON.stringify(legacyProfiles))}; path=/; max-age=31536000; SameSite=Lax`;

    // Retrieve profiles through sanitized getter
    const profiles = getStoredProfiles();

    expect(profiles).toHaveLength(2);

    // Legitimate metadata is preserved
    expect(profiles[0].id).toBe('prof-legacy-1');
    expect(profiles[0].name).toBe('Legacy User');
    expect(profiles[0].email).toBe('legacy@example.com');
    expect(profiles[0].initials).toBe('LU');
    expect(profiles[0].color).toBe('linear-gradient(135deg, #10B981 0%, #047857 100%)');

    // Password must be completely removed from returned object
    expect((profiles[0] as any).password).toBeUndefined();

    // Storage is cleaned up in-place
    const cleanedLocal = localStorage.getItem(PROFILE_STORAGE_KEY);
    expect(cleanedLocal).not.toContain('LegacyPlaintextPassword!');
    expect(cleanedLocal).not.toContain('"password"');

    // Cookie is cleaned up in-place
    expect(document.cookie).not.toContain('LegacyPlaintextPassword!');
  });

  it('saveStoredProfiles guarantees passwords are never serialized', () => {
    const taintedProfiles: any[] = [
      {
        id: 'prof-test',
        name: 'Tester',
        email: 'tester@example.com',
        password: 'InjectedPassword999',
        color: '#fff',
        initials: 'TE',
        lastActive: new Date().toISOString(),
      },
    ];

    saveStoredProfiles(taintedProfiles as SavedProfile[]);

    const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
    expect(stored).not.toContain('InjectedPassword999');
    expect(stored).not.toContain('"password"');
  });

  it('updating an existing profile strips password and keeps non-sensitive metadata intact', () => {
    addOrUpdateSavedProfile({
      email: 'member@example.com',
      name: 'Original Name',
      color: '#111',
    });

    // Update with new name and attempt to supply password
    const updated = addOrUpdateSavedProfile({
      email: 'member@example.com',
      name: 'Updated Name',
      ...({ password: 'NewAttemptedPassword' } as any),
    });

    expect(updated.name).toBe('Updated Name');
    expect((updated as any).password).toBeUndefined();

    const stored = getStoredProfiles();
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe('Updated Name');
    expect((stored[0] as any).password).toBeUndefined();
  });
});
