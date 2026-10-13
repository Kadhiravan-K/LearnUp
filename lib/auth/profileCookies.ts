export type ProfileLockType =
  | 'none'
  | 'pin-4'
  | 'pin-6'
  | 'pin-custom'
  | 'password';

export interface SavedProfile {
  id: string;
  name: string;
  email: string;
  password?: string;
  color: string;
  initials: string;
  lastActive: string;
  lockType?: ProfileLockType;
  pinLength?: number;
  hashedPin?: string;
  hasLock?: boolean;
}

export const PROFILE_STORAGE_KEY = 'LearnUp_saved_profiles';
export const PROFILE_COOKIE_KEY = 'LearnUp_saved_profiles';

/**
 * Retrieves saved user profiles from browser cookies with localStorage fallback.
 */
export function getStoredProfiles(): SavedProfile[] {
  if (typeof window === 'undefined') return [];

  // 1. Try reading from cookie
  try {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${PROFILE_COOKIE_KEY}=([^;]+)`));
    if (match && match[1]) {
      const decoded = decodeURIComponent(match[1]);
      const parsed = JSON.parse(decoded);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Continue to localStorage
  }

  // 2. Try reading from localStorage
  try {
    const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Sync back to cookie so both are populated
        try {
          document.cookie = `${PROFILE_COOKIE_KEY}=${encodeURIComponent(JSON.stringify(parsed))}; path=/; max-age=31536000; SameSite=Lax`;
        } catch {
          // ignore
        }
        return parsed;
      }
    }
  } catch {
    // ignore
  }

  return [];
}

/**
 * Persists user profiles to both browser cookies and localStorage.
 */
export function saveStoredProfiles(profiles: SavedProfile[]): void {
  if (typeof window === 'undefined') return;
  const json = JSON.stringify(profiles);

  // 1. Save to document.cookie (1-year max-age, Lax, path=/)
  try {
    document.cookie = `${PROFILE_COOKIE_KEY}=${encodeURIComponent(json)}; path=/; max-age=31536000; SameSite=Lax`;
  } catch (err) {
    console.warn('Failed to save profile cookie:', err);
  }

  // 2. Save to localStorage
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, json);
  } catch (err) {
    console.warn('Failed to save profile localStorage:', err);
  }
}

/**
 * Adds a new profile or updates an existing one with username and password.
 */
export function addOrUpdateSavedProfile(
  profileData: Partial<SavedProfile> & { email: string; password?: string }
): SavedProfile {
  const current = getStoredProfiles();
  const normalizedEmail = profileData.email.trim();
  const namePart = normalizedEmail.split('@')[0] || 'User';
  const defaultDisplayName = namePart.charAt(0).toUpperCase() + namePart.slice(1);

  const existingIndex = current.findIndex(
    (p) => p.email?.toLowerCase() === normalizedEmail.toLowerCase()
  );

  let target: SavedProfile;
  if (existingIndex >= 0) {
    target = {
      ...current[existingIndex],
      ...profileData,
      email: normalizedEmail,
      name: profileData.name || current[existingIndex].name || defaultDisplayName,
      password: profileData.password !== undefined ? profileData.password : current[existingIndex].password,
      lastActive: new Date().toISOString()
    };
    current[existingIndex] = target;
  } else {
    target = {
      id: `profile-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: defaultDisplayName,
      initials: defaultDisplayName.slice(0, 2).toUpperCase(),
      color: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
      lastActive: new Date().toISOString(),
      lockType: 'none',
      ...profileData,
      email: normalizedEmail,
    };
    current.unshift(target);
  }

  saveStoredProfiles(current);
  return target;
}
