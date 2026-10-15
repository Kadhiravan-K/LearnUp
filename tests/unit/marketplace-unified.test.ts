import { describe, it, expect, beforeEach } from 'vitest';
import {
  UNIFIED_MARKETPLACE_ITEMS,
  filterMarketplaceItems,
  getInstalledMarketplaceItemIds,
  toggleMarketplaceItemInstall
} from '@/lib/marketplace/registry';
import { MarketplaceFilterState } from '@/lib/marketplace/types';

let mockStorage: Record<string, string> = {};

const localStorageMock = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, value: string) => {
    mockStorage[key] = value.toString();
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    mockStorage = {};
  }
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true
});

Object.defineProperty(globalThis, 'window', {
  value: {
    localStorage: localStorageMock
  },
  writable: true
});

const defaultFilters: MarketplaceFilterState = {
  searchQuery: '',
  categoryTab: 'discover',
  domain: 'all',
  sortBy: 'relevance',
  difficulty: 'all',
  aiOnly: false,
  installedOnly: false,
  verifiedOnly: false
};

describe('Unified Discover Marketplace Unit Tests', () => {
  beforeEach(() => {
    mockStorage = {};
  });

  describe('Registry Taxonomy & Item Structure', () => {
    it('contains items for all required kinds (feature packs, templates, agents, skills, plugins, connectors)', () => {
      const kinds = new Set(UNIFIED_MARKETPLACE_ITEMS.map((item) => item.kind));
      expect(kinds.has('feature_pack')).toBe(true);
      expect(kinds.has('template')).toBe(true);
      expect(kinds.has('agent')).toBe(true);
      expect(kinds.has('skill')).toBe(true);
      expect(kinds.has('plugin')).toBe(true);
      expect(kinds.has('connector')).toBe(true);
    });

    it('contains items spanning the designated domains', () => {
      const domains = new Set(UNIFIED_MARKETPLACE_ITEMS.map((item) => item.domain));
      expect(domains.has('Software Engineering')).toBe(true);
      expect(domains.has('Embedded Engineering')).toBe(true);
      expect(domains.has('Design Engineering')).toBe(true);
      expect(domains.has('HR & Recruitment')).toBe(true);
      expect(domains.has('Leadership / CEO')).toBe(true);
      expect(domains.has('SEO & Marketing')).toBe(true);
      expect(domains.has('Data Science')).toBe(true);
      expect(domains.has('Education')).toBe(true);
      expect(domains.has('Healthcare Education')).toBe(true);
    });

    it('enforces academic and educational disclaimers on Healthcare Education items', () => {
      const healthcareItems = UNIFIED_MARKETPLACE_ITEMS.filter(
        (item) => item.domain === 'Healthcare Education'
      );
      expect(healthcareItems.length).toBeGreaterThan(0);
      healthcareItems.forEach((item) => {
        expect(
          item.description.toLowerCase().includes('educational') ||
            item.description.toLowerCase().includes('not medical advice') ||
            item.description.toLowerCase().includes('disclaimer') ||
            Boolean(item.medicalDisclaimer)
        ).toBe(true);
      });
    });

    it('ensures every marketplace item has a valid semantic version and ISO update date', () => {
      UNIFIED_MARKETPLACE_ITEMS.forEach((item) => {
        expect(item.version).toMatch(/^\d+\.\d+\.\d+$/);
        expect(isNaN(new Date(item.updatedAt).getTime())).toBe(false);
      });
    });
  });

  describe('Category Tab Filtering', () => {
    it('filters strictly by templates tab', () => {
      const filtered = filterMarketplaceItems(UNIFIED_MARKETPLACE_ITEMS, {
        ...defaultFilters,
        categoryTab: 'templates'
      });
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every((i) => i.kind === 'template')).toBe(true);
    });

    it('filters strictly by agents tab', () => {
      const filtered = filterMarketplaceItems(UNIFIED_MARKETPLACE_ITEMS, {
        ...defaultFilters,
        categoryTab: 'agents'
      });
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every((i) => i.kind === 'agent')).toBe(true);
    });

    it('filters strictly by skills tab', () => {
      const filtered = filterMarketplaceItems(UNIFIED_MARKETPLACE_ITEMS, {
        ...defaultFilters,
        categoryTab: 'skills'
      });
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every((i) => i.kind === 'skill')).toBe(true);
    });

    it('filters strictly by plugins and feature packs tab', () => {
      const filtered = filterMarketplaceItems(UNIFIED_MARKETPLACE_ITEMS, {
        ...defaultFilters,
        categoryTab: 'plugins'
      });
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every((i) => i.kind === 'plugin' || i.kind === 'feature_pack')).toBe(true);
    });

    it('filters strictly by connectors tab', () => {
      const filtered = filterMarketplaceItems(UNIFIED_MARKETPLACE_ITEMS, {
        ...defaultFilters,
        categoryTab: 'connectors'
      });
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every((i) => i.kind === 'connector')).toBe(true);
    });

    it('shows all kinds under discover tab', () => {
      const filtered = filterMarketplaceItems(UNIFIED_MARKETPLACE_ITEMS, {
        ...defaultFilters,
        categoryTab: 'discover'
      });
      expect(filtered.length).toBe(UNIFIED_MARKETPLACE_ITEMS.length);
    });
  });

  describe('For You Transparent Personalization', () => {
    it('recommends items matching enrolled domains without fabricating data', () => {
      const enrolled = ['Software Engineering'] as const;
      const forYou = filterMarketplaceItems(
        UNIFIED_MARKETPLACE_ITEMS,
        { ...defaultFilters, categoryTab: 'for_you' },
        enrolled as any
      );
      expect(forYou.length).toBeGreaterThan(0);
      // Either matches domain or is a curated essential
      forYou.forEach((item) => {
        expect(item.domain === 'Software Engineering' || item.isCurated).toBe(true);
      });
    });

    it('gracefully falls back to curated essentials and popular starters when no domains are enrolled', () => {
      const forYou = filterMarketplaceItems(
        UNIFIED_MARKETPLACE_ITEMS,
        { ...defaultFilters, categoryTab: 'for_you' },
        []
      );
      expect(forYou.length).toBeGreaterThan(0);
      forYou.forEach((item) => {
        expect(item.isCurated || item.installCount >= 1000).toBe(true);
      });
    });
  });

  describe('Search & Facet Filtering', () => {
    it('matches search query against title, description, tags, and publisher', () => {
      const byTitle = filterMarketplaceItems(UNIFIED_MARKETPLACE_ITEMS, {
        ...defaultFilters,
        searchQuery: 'mock interview'
      });
      expect(byTitle.some((i) => i.id === 'pack_mock_interview')).toBe(true);

      const byTag = filterMarketplaceItems(UNIFIED_MARKETPLACE_ITEMS, {
        ...defaultFilters,
        searchQuery: 'raft'
      });
      expect(byTag.some((i) => i.id === 'pack_systems_engineering')).toBe(true);

      const byPublisher = filterMarketplaceItems(UNIFIED_MARKETPLACE_ITEMS, {
        ...defaultFilters,
        searchQuery: 'learnup studio'
      });
      expect(byPublisher.length).toBeGreaterThan(0);
      expect(byPublisher.every((i) => i.publisher.toLowerCase().includes('learnup studio'))).toBe(true);
    });

    it('filters strictly by domain', () => {
      const filtered = filterMarketplaceItems(UNIFIED_MARKETPLACE_ITEMS, {
        ...defaultFilters,
        domain: 'Data Science'
      });
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every((i) => i.domain === 'Data Science')).toBe(true);
    });

    it('filters by difficulty level', () => {
      const filtered = filterMarketplaceItems(UNIFIED_MARKETPLACE_ITEMS, {
        ...defaultFilters,
        difficulty: 'advanced'
      });
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every((i) => i.difficulty === 'advanced')).toBe(true);
    });

    it('filters by AI-powered items only', () => {
      const filtered = filterMarketplaceItems(UNIFIED_MARKETPLACE_ITEMS, {
        ...defaultFilters,
        aiOnly: true
      });
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every((i) => i.isAiPowered)).toBe(true);
    });

    it('filters by verified publishers only', () => {
      const filtered = filterMarketplaceItems(UNIFIED_MARKETPLACE_ITEMS, {
        ...defaultFilters,
        verifiedOnly: true
      });
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every((i) => i.isVerifiedPublisher)).toBe(true);
    });
  });

  describe('Sorting Algorithms', () => {
    it('sorts alphabetically by title', () => {
      const sorted = filterMarketplaceItems(UNIFIED_MARKETPLACE_ITEMS, {
        ...defaultFilters,
        sortBy: 'alphabetical'
      });
      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].title.localeCompare(sorted[i + 1].title)).toBeLessThanOrEqual(0);
      }
    });

    it('sorts by highest rating first', () => {
      const sorted = filterMarketplaceItems(UNIFIED_MARKETPLACE_ITEMS, {
        ...defaultFilters,
        sortBy: 'highest_rated'
      });
      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].rating).toBeGreaterThanOrEqual(sorted[i + 1].rating);
      }
    });

    it('sorts by most installed first', () => {
      const sorted = filterMarketplaceItems(UNIFIED_MARKETPLACE_ITEMS, {
        ...defaultFilters,
        sortBy: 'most_installed'
      });
      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].installCount).toBeGreaterThanOrEqual(sorted[i + 1].installCount);
      }
    });

    it('sorts by recently updated first', () => {
      const sorted = filterMarketplaceItems(UNIFIED_MARKETPLACE_ITEMS, {
        ...defaultFilters,
        sortBy: 'recently_updated'
      });
      for (let i = 0; i < sorted.length - 1; i++) {
        const timeA = new Date(sorted[i].updatedAt).getTime();
        const timeB = new Date(sorted[i + 1].updatedAt).getTime();
        expect(timeA).toBeGreaterThanOrEqual(timeB);
      }
    });
  });

  describe('Installation State Toggle & Persistence', () => {
    it('toggles item installation and updates localStorage correctly', () => {
      const itemId = 'pack_systems_engineering';
      expect(getInstalledMarketplaceItemIds().has(itemId)).toBe(false);

      const installed = toggleMarketplaceItemInstall(itemId);
      expect(installed).toBe(true);
      expect(getInstalledMarketplaceItemIds().has(itemId)).toBe(true);

      const uninstalled = toggleMarketplaceItemInstall(itemId);
      expect(uninstalled).toBe(false);
      expect(getInstalledMarketplaceItemIds().has(itemId)).toBe(false);
    });

    it('filters by installed items only', () => {
      toggleMarketplaceItemInstall('pack_systems_engineering');
      const filtered = filterMarketplaceItems(UNIFIED_MARKETPLACE_ITEMS, {
        ...defaultFilters,
        installedOnly: true
      });
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.some((i) => i.id === 'pack_systems_engineering')).toBe(true);
    });
  });
});
