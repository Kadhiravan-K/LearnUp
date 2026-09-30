'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { BrowseTemplatesModal } from '@/components/templates/BrowseTemplatesModal';
import styles from './Sidebar.module.css';

export interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export interface NavItem {
  label: string;
  href: string;
  badge?: string;
  icon: (props: { className?: string }) => React.ReactNode;
  isActive: (pathname: string) => boolean;
}

// Approved navigation items for StudyFlow
export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    isActive: (pathname: string) => pathname === '/dashboard' || pathname === '/',
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    )
  },
  {
    label: 'Library',
    href: '/library',
    badge: '12',
    isActive: (pathname: string) => pathname === '/library',
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    )
  },
  {
    label: 'Learn',
    href: '/library',
    isActive: (pathname: string) => pathname.startsWith('/library/') && pathname !== '/library',
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  {
    label: 'Analytics',
    href: '/analytics',
    badge: 'Hub',
    isActive: (pathname: string) => pathname.startsWith('/analytics'),
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
  {
    label: 'Roadmaps',
    href: '/roadmaps',
    badge: 'Active',
    isActive: (pathname: string) => pathname.startsWith('/roadmaps'),
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    )
  },
  {
    label: 'Focus',
    href: '/focus',
    badge: '7d streak',
    isActive: (pathname: string) => pathname.startsWith('/focus'),
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  {
    label: 'Settings',
    href: '/settings',
    isActive: (pathname: string) => pathname.startsWith('/settings'),
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  }
];

export const ADDITIONAL_NAV_ITEMS: NavItem[] = [
  {
    label: 'Skills',
    href: '/skills',
    badge: '#',
    isActive: (pathname: string) => pathname.startsWith('/skills'),
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    )
  },
  {
    label: 'Notes',
    href: '/notes',
    badge: 'Hub',
    isActive: (pathname: string) => pathname.startsWith('/notes'),
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    )
  },
  {
    label: 'Planner',
    href: '/calendar',
    badge: '3 due',
    isActive: (pathname: string) => pathname.startsWith('/calendar'),
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  },
  {
    label: 'Rewards',
    href: '/rewards',
    badge: 'XP',
    isActive: (pathname: string) => pathname.startsWith('/rewards'),
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    )
  },
  {
    label: 'AI Assistant',
    href: '/assistant',
    badge: 'Beta',
    isActive: (pathname: string) => pathname.startsWith('/assistant'),
    icon: ({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    )
  }
];

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const supabase = createClient();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Workspace dropdown state
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<string[]>([
    'Personal Study Vault',
    'General Studies',
    'Self-Paced Learning'
  ]);
  const [activeWorkspace, setActiveWorkspace] = useState('Personal Study Vault');
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (isMounted && session?.user?.email) {
          setUserEmail(session.user.email);
        }
      } catch {
        // Safe fallback
      }
    }
    loadUser();
    return () => {
      isMounted = false;
    };
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push('/login');
  };

  const handleSelectWorkspace = (ws: string) => {
    setActiveWorkspace(ws);
    setIsWorkspaceMenuOpen(false);
  };

  const handleCreateWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newWorkspaceName.trim();
    if (trimmed && !workspaces.includes(trimmed)) {
      setWorkspaces((prev) => [...prev, trimmed]);
      setActiveWorkspace(trimmed);
      setNewWorkspaceName('');
      setIsCreatingWorkspace(false);
      setIsWorkspaceMenuOpen(false);
    }
  };

  const userName = userEmail ? userEmail.split('@')[0] : 'Learner';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <>
      <aside
        id="app-sidebar"
        className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}
        aria-label="Application Sidebar"
      >
        <div className={styles.topSection}>
          <div className={styles.header}>
            <Link href="/dashboard" className={styles.brand} onClick={onClose}>
              <div className={styles.brandLogo}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <span>StudyFlow</span>
              <button
                type="button"
                className={styles.proBadgeBtn}
                onClick={() => setIsUpgradeModalOpen(true)}
                title="View Pro Subscription"
              >
                Pro ↕
              </button>
            </Link>
            <button
              type="button"
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Close navigation"
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Functional Workspace Selector */}
          <div className={styles.workspaceWrapper}>
            <button
              type="button"
              className={styles.workspaceSelector}
              onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
              aria-expanded={isWorkspaceMenuOpen}
              aria-haspopup="true"
              aria-label="Select study workspace"
            >
              <div className={styles.workspaceText}>
                <span className={styles.workspaceDot} />
                <span className={styles.activeWorkspaceLabel}>{activeWorkspace}</span>
              </div>
              <svg
                width="14"
                height="14"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                className={`${styles.dropdownChevron} ${isWorkspaceMenuOpen ? styles.dropdownChevronOpen : ''}`}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isWorkspaceMenuOpen && (
              <div className={styles.workspaceMenu} role="menu">
                <div className={styles.workspaceMenuHeader}>Workspaces</div>
                {workspaces.map((ws) => (
                  <button
                    key={ws}
                    type="button"
                    role="menuitem"
                    className={`${styles.workspaceMenuItem} ${ws === activeWorkspace ? styles.workspaceMenuItemActive : ''}`}
                    onClick={() => handleSelectWorkspace(ws)}
                  >
                    <span className={styles.workspaceItemName}>{ws}</span>
                    {ws === activeWorkspace && (
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}

                <div className={styles.workspaceMenuDivider} />

                {isCreatingWorkspace ? (
                  <form onSubmit={handleCreateWorkspace} className={styles.createWorkspaceForm}>
                    <input
                      type="text"
                      placeholder="Workspace name..."
                      value={newWorkspaceName}
                      onChange={(e) => setNewWorkspaceName(e.target.value)}
                      className={styles.newWorkspaceInput}
                      autoFocus
                    />
                    <div className={styles.createWorkspaceActions}>
                      <button type="submit" className={styles.saveWorkspaceBtn} disabled={!newWorkspaceName.trim()}>
                        Add
                      </button>
                      <button
                        type="button"
                        className={styles.cancelWorkspaceBtn}
                        onClick={() => {
                          setIsCreatingWorkspace(false);
                          setNewWorkspaceName('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    className={styles.createWorkspaceBtn}
                    onClick={() => setIsCreatingWorkspace(true)}
                  >
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Create New Workspace</span>
                  </button>
                )}

                <button
                  type="button"
                  role="menuitem"
                  className={styles.upgradePlanBtn}
                  onClick={() => {
                    setIsWorkspaceMenuOpen(false);
                    setIsUpgradeModalOpen(true);
                  }}
                >
                  <span>⚡ Upgrade Plan</span>
                  <span className={styles.planBadge}>Pro</span>
                </button>
              </div>
            )}
          </div>

          <nav className={styles.nav} aria-label="Main Navigation">
            <ul className={styles.navList}>
              {NAV_ITEMS.map((item) => {
                const active = item.isActive(pathname);
                const Icon = item.icon;
                return (
                  <li key={item.label} className={styles.navItem}>
                    <Link
                      href={item.href}
                      className={`${styles.navLink} ${active ? styles.navLinkActive : ''}`}
                      aria-current={active ? 'page' : undefined}
                      onClick={onClose}
                    >
                      <div className={styles.navLinkLeft}>
                        <Icon className={styles.navIcon} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && <span className={styles.badge}>{item.badge}</span>}
                    </Link>
                  </li>
                );
              })}

              <li style={{ padding: '8px 12px 4px 12px', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--sf-text-muted)' }}>
                Learning Hubs
              </li>

              {ADDITIONAL_NAV_ITEMS.map((item) => {
                const active = item.isActive(pathname);
                const Icon = item.icon;
                return (
                  <li key={item.label} className={styles.navItem}>
                    <Link
                      href={item.href}
                      className={`${styles.navLink} ${active ? styles.navLinkActive : ''}`}
                      aria-current={active ? 'page' : undefined}
                      onClick={onClose}
                    >
                      <div className={styles.navLinkLeft}>
                        <Icon className={styles.navIcon} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && <span className={styles.badge}>{item.badge}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        <div className={styles.bottomSection}>
          {/* Browse Templates Community Blueprint Button */}
          <button
            type="button"
            className={styles.browseTemplatesBtn}
            onClick={() => setIsTemplatesModalOpen(true)}
            aria-label="Browse Community Blueprints & Templates"
          >
            <div className={styles.browseTemplatesLeft}>
              <span>🧭</span>
              <span>Browse Templates</span>
            </div>
            <span className={styles.browseTemplatesBadge}>Explore</span>
          </button>

          <div className={styles.userCard}>
            <div className={styles.userLeft}>
              <div className={styles.userAvatar}>
                {userInitial}
              </div>
              <div className={styles.userInfo}>
                <span className={styles.userName}>{userName}</span>
                <span className={styles.userEmail}>{userEmail || 'learner@studyflow.local'}</span>
              </div>
            </div>
            <button
              type="button"
              className={styles.signOutBtn}
              onClick={handleSignOut}
              aria-label="Sign out"
              title="Sign out"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Community Templates Browser Modal */}
      <BrowseTemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
      />

      {/* Upgrade Plan Modal */}
      {isUpgradeModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setIsUpgradeModalOpen(false)}>
          <div className={styles.upgradeModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.upgradeModalHeader}>
              <div className={styles.upgradeIcon}>⚡</div>
              <div>
                <h3 className={styles.upgradeTitle}>StudyFlow Pro Workspace</h3>
                <p className={styles.upgradeSubtitle}>Unlimited personal & domain-agnostic workspaces, cloud sync, and AI copilot.</p>
              </div>
            </div>

            <div className={styles.upgradeFeatures}>
              <div className={styles.upgradeFeatureItem}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#10B981" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Unlimited workspaces across all learning domains</span>
              </div>
              <div className={styles.upgradeFeatureItem}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#10B981" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Local-first zero-telemetry vault storage</span>
              </div>
              <div className={styles.upgradeFeatureItem}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#10B981" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Full access to community & core educational plugins</span>
              </div>
            </div>

            <div className={styles.upgradeActions}>
              <button
                type="button"
                className={styles.upgradeActiveBtn}
                onClick={() => setIsUpgradeModalOpen(false)}
              >
                Current Plan (Active Free Tier)
              </button>
              <button
                type="button"
                className={styles.closeModalBtn}
                onClick={() => setIsUpgradeModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
