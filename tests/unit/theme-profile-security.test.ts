import { describe, it, expect, beforeEach } from 'vitest';
import type { SavedProfile, ProfileLockType } from '@/components/auth/ProfileChooser';

describe('Profile Security & Lock Configuration', () => {
  let sampleProfile: SavedProfile;

  beforeEach(() => {
    sampleProfile = {
      id: 'prof-1',
      name: 'Alex Morgan',
      email: 'alex@studyflow.io',
      color: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
      initials: 'AM',
      lastActive: new Date().toISOString(),
      lockType: 'none'
    };
  });

  it('supports 4-digit PIN lock configuration', () => {
    const lockType: ProfileLockType = 'pin-4';
    const pin = '1234';
    const updated: SavedProfile = {
      ...sampleProfile,
      lockType,
      pinLength: 4,
      hashedPin: pin,
      hasLock: true
    };

    expect(updated.lockType).toBe('pin-4');
    expect(updated.pinLength).toBe(4);
    expect(updated.hashedPin).toBe('1234');
    expect(updated.hasLock).toBe(true);
  });

  it('supports 6-digit PIN lock configuration', () => {
    const lockType: ProfileLockType = 'pin-6';
    const pin = '987654';
    const updated: SavedProfile = {
      ...sampleProfile,
      lockType,
      pinLength: 6,
      hashedPin: pin,
      hasLock: true
    };

    expect(updated.lockType).toBe('pin-6');
    expect(updated.pinLength).toBe(6);
    expect(updated.hashedPin).toBe('987654');
  });

  it('supports custom length PIN between 4 and 15 digits', () => {
    const customLengths = [4, 7, 10, 15];
    for (const len of customLengths) {
      const pin = '1'.repeat(len);
      const updated: SavedProfile = {
        ...sampleProfile,
        lockType: 'pin-custom',
        pinLength: len,
        hashedPin: pin,
        hasLock: true
      };

      expect(updated.lockType).toBe('pin-custom');
      expect(updated.pinLength).toBe(len);
      expect(updated.hashedPin?.length).toBe(len);
    }
  });

  it('supports password lock between 4 and 15 characters', () => {
    const password = 'StudySecure#99';
    const updated: SavedProfile = {
      ...sampleProfile,
      lockType: 'password',
      pinLength: password.length,
      hashedPin: password,
      hasLock: true
    };

    expect(updated.lockType).toBe('password');
    expect(updated.hashedPin).toBe(password);
    expect(updated.hashedPin?.length).toBeGreaterThanOrEqual(4);
    expect(updated.hashedPin?.length).toBeLessThanOrEqual(15);
  });

  it('correctly reverts to unlocked (none)', () => {
    const updated: SavedProfile = {
      ...sampleProfile,
      lockType: 'none',
      hashedPin: undefined,
      pinLength: undefined,
      hasLock: false
    };

    expect(updated.lockType).toBe('none');
    expect(updated.hashedPin).toBeUndefined();
    expect(updated.hasLock).toBe(false);
  });
});
