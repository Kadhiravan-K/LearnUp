'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/lib/hooks/useTheme';
import { ProfileUnlockModal } from './ProfileUnlockModal';
import { ProfileSecurityModal } from './ProfileSecurityModal';
import styles from './ProfileChooser.module.css';

export type ProfileLockType = 'none' | 'pin-4' | 'pin-6' | 'pin-custom' | 'password';

export interface SavedProfile {
  id: string;
  name: string;
  email: string;
  color: string;
  initials: string;
  lastActive: string;
  lockType?: ProfileLockType;
  pinLength?: number;
  hashedPin?: string;
  hasLock?: boolean;
}

export interface ProfileChooserProps {
  onSelectSignIn: (email?: string) => void;
  onSelectSignUp: () => void;
  onSelectGuest: () => void;
}

const AVATAR_COLORS = [
  'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
  'linear-gradient(135deg, #10B981 0%, #047857 100%)',
  'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
  'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
  'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)',
  'linear-gradient(135deg, #06B6D4 0%, #0E7490 100%)',
];

export function ProfileChooser({
  onSelectSignIn,
  onSelectSignUp,
  onSelectGuest
}: ProfileChooserProps) {
  const { isDark, toggleTheme } = useTheme();
  const [profiles, setProfiles] = useState<SavedProfile[]>([]);
  const [showGuestInfo, setShowGuestInfo] = useState(false);

  // Security modals state
  const [unlockTargetProfile, setUnlockTargetProfile] = useState<SavedProfile | null>(null);
  const [securityEditProfile, setSecurityEditProfile] = useState<SavedProfile | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('LearnUp_saved_profiles');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setProfiles(parsed);
        }
      }
    } catch {
      // Ignore parse error
    }
  }, []);

  const saveProfilesToStorage = (updated: SavedProfile[]) => {
    setProfiles(updated);
    try {
      localStorage.setItem('LearnUp_saved_profiles', JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  const handleProfileClick = (profile: SavedProfile) => {
    if (profile.lockType && profile.lockType !== 'none') {
      setUnlockTargetProfile(profile);
    } else {
      onSelectSignIn(profile.email);
    }
  };

  const handleUnlockSuccess = (profile: SavedProfile) => {
    setUnlockTargetProfile(null);
    onSelectSignIn(profile.email);
  };

  const handleRemoveProfile = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = profiles.filter((p) => p.id !== id);
    saveProfilesToStorage(updated);
  };

  const handleOpenSecurityModal = (e: React.MouseEvent, profile: SavedProfile) => {
    e.stopPropagation();
    setSecurityEditProfile(profile);
  };

  const handleSaveSecurity = (updatedProfile: SavedProfile) => {
    const updated = profiles.map((p) => (p.id === updatedProfile.id ? updatedProfile : p));
    saveProfilesToStorage(updated);
    setSecurityEditProfile(null);
  };

  const handleStartGuestMode = () => {
    // Set guest session cookie for server middleware
    document.cookie = 'LearnUp_guest_mode=true; path=/; max-age=86400; SameSite=Lax';
    try {
      localStorage.setItem('LearnUp_is_guest', 'true');
    } catch {
      // Ignore
    }
    onSelectGuest();
  };

  const getLockBadgeText = (profile: SavedProfile) => {
    if (!profile.lockType || profile.lockType === 'none') {
      return '🔓 Quick Access';
    }
    if (profile.lockType === 'pin-4') return '🔒 4-Digit PIN';
    if (profile.lockType === 'pin-6') return '🔒 6-Digit PIN';
    if (profile.lockType === 'pin-custom') return `🔒 ${profile.pinLength || 4}-Digit PIN`;
    if (profile.lockType === 'password') return '🔒 Password';
    return '🔒 Protected';
  };

  return (
    <main className={styles.container}>
      {/* Top Bar with Theme Toggle */}
      <div className={styles.topBar}>
        <button
          type="button"
          className={styles.themeToggleBtn}
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          <span>{isDark ? '🌙 Dark Theme' : '☀️ Light Theme'}</span>
        </button>
      </div>

      <div className={styles.cardWindow}>
        {/* Brand & Heading */}
        <div className={styles.brandHeader}>
          <div className={styles.logoBadge}>
            <span className={styles.logoDot} />
            <span>LearnUp Workspace</span>
          </div>
          <h1 className={styles.title}>Who is studying today?</h1>
          <p className={styles.subtitle}>
            Select your learning profile to resume where you left off, create a new account, or browse in guest mode.
          </p>
        </div>

        {/* Guest Limitations Banner */}
        {showGuestInfo && (
          <div className={styles.guestDisclaimer} role="note">
            <span className={styles.guestDisclaimerIcon}>ℹ️</span>
            <div className={styles.guestDisclaimerText}>
              <strong>Guest Session Limitations:</strong> Your learning progress, video timestamps, and local notes are stored directly in your browser. Cloud backup and multi-device sync require creating an account.
            </div>
          </div>
        )}

        {/* Profile Chooser Grid */}
        <div className={styles.profilesGrid} role="list" aria-label="Available LearnUp Profiles">
          {/* Saved Profiles */}
          {profiles.map((p, idx) => (
            <div
              key={p.id}
              className={styles.profileCard}
              onClick={() => handleProfileClick(p)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleProfileClick(p);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`Open profile for ${p.name}`}
            >
              <div className={styles.cardTopControls}>
                <button
                  type="button"
                  className={styles.cardIconBtn}
                  onClick={(e) => handleOpenSecurityModal(e, p)}
                  title="Configure PIN / Password lock"
                  aria-label={`Configure security for ${p.name}`}
                >
                  🔒
                </button>
                <button
                  type="button"
                  className={`${styles.cardIconBtn} ${styles.cardDeleteBtn}`}
                  onClick={(e) => handleRemoveProfile(e, p.id)}
                  title="Remove profile from this device"
                  aria-label={`Remove profile ${p.name}`}
                >
                  &times;
                </button>
              </div>

              <div
                className={styles.avatarCircle}
                style={{ background: p.color || AVATAR_COLORS[idx % AVATAR_COLORS.length] }}
              >
                {p.initials || p.name.charAt(0).toUpperCase()}
              </div>
              <h2 className={styles.profileName}>{p.name}</h2>
              <p className={styles.profileMeta}>{p.email}</p>
              
              <span className={p.lockType && p.lockType !== 'none' ? styles.lockBadge : styles.unlockedBadge}>
                {getLockBadgeText(p)}
              </span>
            </div>
          ))}

          {/* Add Profile / Create Account Card */}
          <div
            className={`${styles.profileCard} ${styles.addCard}`}
            onClick={onSelectSignUp}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onSelectSignUp();
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Create a new profile or sign up"
          >
            <div className={styles.addCircle}>+</div>
            <h2 className={styles.profileName}>Add Profile</h2>
            <p className={styles.profileMeta}>Create or sign in</p>
          </div>

          {/* Guest Mode Card */}
          <div
            className={`${styles.profileCard} ${styles.guestCard}`}
            onClick={handleStartGuestMode}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleStartGuestMode();
              }
            }}
            onMouseEnter={() => setShowGuestInfo(true)}
            onMouseLeave={() => setShowGuestInfo(false)}
            role="button"
            tabIndex={0}
            aria-label="Browse as guest without signing in"
          >
            <div className={styles.guestCircle}>🕶️</div>
            <h2 className={styles.profileName}>Guest Mode</h2>
            <p className={styles.profileMeta}>Instant local study</p>
            <span className={styles.guestBadge}>Local Only</span>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className={styles.bottomActions}>
          <button
            type="button"
            className={styles.bottomLink}
            onClick={handleStartGuestMode}
          >
            <span>🕶️</span>
            <span>Browse as Guest</span>
          </button>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => onSelectSignIn()}
            >
              Sign In with Password
            </button>
            <button
              type="button"
              className={styles.bottomLink}
              onClick={onSelectSignUp}
              style={{ fontWeight: 700 }}
            >
              Create Account &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Profile Unlock Modal */}
      <ProfileUnlockModal
        profile={unlockTargetProfile}
        isOpen={Boolean(unlockTargetProfile)}
        onClose={() => setUnlockTargetProfile(null)}
        onUnlock={handleUnlockSuccess}
        onFallbackSignIn={(email) => {
          setUnlockTargetProfile(null);
          onSelectSignIn(email);
        }}
      />

      {/* Profile Security Config Modal */}
      <ProfileSecurityModal
        profile={securityEditProfile}
        isOpen={Boolean(securityEditProfile)}
        onClose={() => setSecurityEditProfile(null)}
        onSave={handleSaveSecurity}
      />
    </main>
  );
}
