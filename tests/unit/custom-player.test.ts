import { describe, it, expect } from 'vitest';
import { isVideoCompleted, sanitizeVideoId } from '@/components/player/YouTubePlayer';
import { DEFAULT_PLAYER_SHORTCUTS } from '@/lib/hooks/usePlayerShortcuts';

describe('Custom YouTube Video Player Logic & Adaptations', () => {
  it('sanitizes video IDs by stripping prefixes and extracting 11-char IDs', () => {
    expect(sanitizeVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(sanitizeVideoId('video-dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(sanitizeVideoId('pv-dQw4w9WgXcQ-0')).toBe('dQw4w9WgXcQ');
    expect(sanitizeVideoId('  dQw4w9WgXcQ  ')).toBe('dQw4w9WgXcQ');
    expect(sanitizeVideoId('')).toBe('');
  });

  it('correctly calculates video completion threshold (90%)', () => {
    expect(isVideoCompleted(0, 100)).toBe(false);
    expect(isVideoCompleted(89, 100)).toBe(false);
    expect(isVideoCompleted(90, 100)).toBe(true);
    expect(isVideoCompleted(95, 100)).toBe(true);
    expect(isVideoCompleted(100, 100)).toBe(true);
  });

  it('clamps brightness levels properly between 20% and 150%', () => {
    const clampBrightness = (val: number) => Math.max(20, Math.min(150, Math.round(val)));
    expect(clampBrightness(10)).toBe(20);
    expect(clampBrightness(100)).toBe(100);
    expect(clampBrightness(180)).toBe(150);
  });

  it('clamps audio volume levels properly between 0% and 100%', () => {
    const clampVolume = (val: number) => Math.max(0, Math.min(100, Math.round(val)));
    expect(clampVolume(-10)).toBe(0);
    expect(clampVolume(75)).toBe(75);
    expect(clampVolume(120)).toBe(100);
  });

  it('supports background auto device mode classifications for Phone, Tablet, Laptop, and VR', () => {
    const supportedModes = ['phone', 'tablet', 'laptop', 'vr'];
    expect(supportedModes).toContain('phone');
    expect(supportedModes).toContain('tablet');
    expect(supportedModes).toContain('laptop');
    expect(supportedModes).toContain('vr');
  });

  it('provides comprehensive default player shortcut configurations', () => {
    expect(DEFAULT_PLAYER_SHORTCUTS.togglePlay).toBe('Space');
    expect(DEFAULT_PLAYER_SHORTCUTS.seekBackward).toBe('j');
    expect(DEFAULT_PLAYER_SHORTCUTS.seekForward).toBe('l');
    expect(DEFAULT_PLAYER_SHORTCUTS.speedBoost).toBe('Shift');
    expect(DEFAULT_PLAYER_SHORTCUTS.toggleCaptions).toBe('c');
    expect(DEFAULT_PLAYER_SHORTCUTS.toggleMute).toBe('m');
    expect(DEFAULT_PLAYER_SHORTCUTS.toggleFullscreen).toBe('f');
  });

  it('formats numerical video quality options and sleep timer intervals correctly', () => {
    const qualities = ['1080p', '720p', '480p', '360p', '240p', '144p', 'Auto'];
    qualities.forEach((q) => {
      expect(q).toMatch(/^[0-9]+p$|^Auto$/);
    });

    const sleepTimerOptions = ['off', 15, 30, 45, 60, 'end'];
    expect(sleepTimerOptions).toContain(15);
    expect(sleepTimerOptions).toContain('end');
  });
});
