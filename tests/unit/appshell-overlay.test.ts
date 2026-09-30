import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('SF-058: Global Dark Overlay Regression Suite', () => {
  it('verifies AppShell conditionally renders sidebar backdrop only when isSidebarOpen is true', () => {
    const appShellPath = path.resolve(__dirname, '../../components/layout/AppShell.tsx');
    const content = fs.readFileSync(appShellPath, 'utf8');

    // Must have conditional render guard: isSidebarOpen && (...)
    expect(content).toContain('{isSidebarOpen && (');
    expect(content).toContain('data-testid="sidebar-backdrop"');
    
    // Must NOT have unconditional render of sidebar-backdrop
    expect(content).not.toMatch(/<div\s+className=\{`\$\{styles\.backdrop\}\s+\$\{isSidebarOpen\s*\?/);
  });

  it('verifies AppShell CSS does not display backdrop when inactive on any viewport size', () => {
    const cssPath = path.resolve(__dirname, '../../components/layout/AppShell.module.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    // Default .backdrop must be display: none
    expect(cssContent).toMatch(/\.backdrop\s*\{\s*display:\s*none;/);

    // .backdropActive must be the only class with display: block
    expect(cssContent).toContain('.backdropActive');
    expect(cssContent).toMatch(/\.backdropActive\s*\{\s*display:\s*block;/);
  });

  it('verifies all modals fail-closed (return null when isOpen is false) to prevent orphan backdrops', () => {
    const modalFiles = [
      '../../components/course/AddCourseModal.tsx',
      '../../components/templates/BrowseTemplatesModal.tsx',
      '../../components/auth/ProfileSecurityModal.tsx',
      '../../components/auth/ProfileUnlockModal.tsx',
      '../../components/ui/Modal/Modal.tsx'
    ];

    for (const relPath of modalFiles) {
      const fullPath = path.resolve(__dirname, relPath);
      const content = fs.readFileSync(fullPath, 'utf8');
      expect(content).toMatch(/if\s*\(!isOpen/);
    }
  });
});
