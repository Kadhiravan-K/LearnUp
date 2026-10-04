import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Loading Animation Hardening and Component Tests', () => {
  it('verifies LoadingSpinner contains correct structure and aria labels', () => {
    const file = path.resolve(__dirname, '../../components/ui/LoadingAnimation/LoadingSpinner.tsx');
    const content = fs.readFileSync(file, 'utf8');

    expect(content).toContain('aria-label={label || \'Loading\'}');
    expect(content).toContain('role="status"');
    expect(content).toContain('styles.spinnerWrapper');
    expect(content).toContain('styles.spinnerRing');
    expect(content).toContain('styles[`size-${size}`]');
  });

  it('verifies CogLoader contains correct structure', () => {
    const file = path.resolve(__dirname, '../../components/ui/LoadingAnimation/CogLoader.tsx');
    const content = fs.readFileSync(file, 'utf8');

    expect(content).toContain('aria-label={label || \'Processing\'}');
    expect(content).toContain('role="status"');
    expect(content).toContain('styles.cogWrapper');
    expect(content).toContain('styles.cogWheel');
    expect(content).toContain('styles[`size-${size}`]');
  });

  it('verifies CubeLoader contains correct structure', () => {
    const file = path.resolve(__dirname, '../../components/ui/LoadingAnimation/CubeLoader.tsx');
    const content = fs.readFileSync(file, 'utf8');

    expect(content).toContain('aria-label={label || \'Loading environment\'}');
    expect(content).toContain('role="status"');
    expect(content).toContain('styles.cubeWrapper');
    expect(content).toContain('styles.cubeItem');
    expect(content).toContain('styles[`size-${size}`]');
  });

  it('verifies CanvasAILoader handles canvas lifecycle correctly', () => {
    const file = path.resolve(__dirname, '../../components/ui/LoadingAnimation/CanvasAILoader.tsx');
    const content = fs.readFileSync(file, 'utf8');

    // Canvas resize scaling reset
    expect(content).toContain('ctx.setTransform(1, 0, 0, 1, 0, 0);');
    expect(content).toContain('ctx.scale(dpr, dpr);');
    
    // Lifecycle cleanup
    expect(content).toContain('observer.disconnect();');
    expect(content).toContain('cancelAnimationFrame(animationFrameId);');
    expect(content).toContain('if (animationFrameId !== null)');

    // Reduced motion
    expect(content).toContain('if (mediaQuery.matches)');
    expect(content).toContain('drawWave(0');
    expect(content).toContain('else {');
    expect(content).toContain('render();');

    // Tokens
    expect(content).toContain('getComputedStyle(document.documentElement)');
    expect(content).toContain('--sf-color-primary');
    expect(content).toContain('MutationObserver');
    expect(content).not.toContain('#6366F1');

    // Accessibility
    expect(content).toContain('aria-label={label || \'AI is processing\'}');
    expect(content).toContain('role="status"');
  });

  it('verifies YouTubeImportLoader composes standard loaders correctly', () => {
    const file = path.resolve(__dirname, '../../components/ui/LoadingAnimation/YouTubeImportLoader.tsx');
    const content = fs.readFileSync(file, 'utf8');

    expect(content).toContain('styles.loaderContainer');
    expect(content).toContain('role="status"');
    expect(content).toContain('aria-live="polite"');
    expect(content).toContain('DEFAULT_STAGES');
  });

  it('verifies LoadingAnimation.module.css supports theming and prefers-reduced-motion', () => {
    const file = path.resolve(__dirname, '../../components/ui/LoadingAnimation/LoadingAnimation.module.css');
    const content = fs.readFileSync(file, 'utf8');

    // Light / Dark themes semantic tokens
    expect(content).toContain('var(--sf-color-primary)');
    expect(content).toContain('var(--sf-color-surface-hover)');
    expect(content).toContain('var(--sf-color-text-secondary)');
    
    // No hex fallbacks
    expect(content).not.toContain('#6366F1');
    expect(content).not.toContain('#333');
    expect(content).not.toContain('#888');

    // Reduced motion
    expect(content).toContain('@media (prefers-reduced-motion: reduce)');
    expect(content).toContain('animation-play-state: paused');
  });
});
