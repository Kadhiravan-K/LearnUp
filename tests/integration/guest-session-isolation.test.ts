import { describe, it, expect, beforeEach } from 'vitest';
import { requireAuth } from '@/lib/auth';
import { LearningItemRepository, clearGuestStoresForTesting } from '@/lib/db/repository';
import { AppError } from '@/lib/errors';
import type { SupabaseClient } from '@supabase/supabase-js';

const mockClient = {} as unknown as SupabaseClient;

describe('Security: Guest Session Authentication & Storage Isolation', () => {
  const repo = new LearningItemRepository();
  const guestSessionA = 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d';
  const guestSessionB = 'b2c3d4e5-f6a1-4b2c-9d3e-4f5a6b7c8d9e';

  const guestUserIdA = `guest-${guestSessionA}`;
  const guestUserIdB = `guest-${guestSessionB}`;

  beforeEach(() => {
    clearGuestStoresForTesting();
  });

  describe('requireAuth Guest Token Security', () => {
    it('rejects a fixed "Authorization: Bearer guest-session" header when no valid cookie is present', async () => {
      const req = new Request('http://localhost:3000/api/learning-items', {
        headers: {
          Authorization: 'Bearer guest-session',
        },
      });

      await expect(requireAuth(req)).rejects.toThrowError(AppError);
      await expect(requireAuth(req)).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
        statusCode: 401,
      });
    });

    it('rejects malformed guest session tokens', async () => {
      const malformedReq = new Request('http://localhost:3000/api/learning-items', {
        headers: {
          Authorization: 'Bearer guest-not-a-valid-uuid',
        },
      });

      await expect(requireAuth(malformedReq)).rejects.toThrowError(AppError);
      await expect(requireAuth(malformedReq)).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
        statusCode: 401,
      });
    });

    it('authenticates a valid guest session token and scopes user identity to the unique guest UUID', async () => {
      const validReq = new Request('http://localhost:3000/api/learning-items', {
        headers: {
          Authorization: `Bearer guest-${guestSessionA}`,
        },
      });

      const { user, accessToken } = await requireAuth(validReq);
      expect(user.id).toBe(guestUserIdA);
      expect(user.email).toBe(`${guestUserIdA}@guest.learnup.local`);
      expect(accessToken).toBe(`guest-${guestSessionA}`);
    });

    it('authenticates cookie-based guest mode when a valid LearnUp_guest_session_id cookie is present', async () => {
      const cookieReq = new Request('http://localhost:3000/api/learning-items', {
        headers: {
          cookie: `LearnUp_guest_mode=true; LearnUp_guest_session_id=${guestSessionB}`,
        },
      });

      const { user, accessToken } = await requireAuth(cookieReq);
      expect(user.id).toBe(guestUserIdB);
      expect(user.email).toBe(`${guestUserIdB}@guest.learnup.local`);
      expect(accessToken).toBe(`guest-${guestSessionB}`);
    });

    it('rejects cookie-based guest mode when LearnUp_guest_session_id is missing or invalid', async () => {
      const badCookieReq = new Request('http://localhost:3000/api/learning-items', {
        headers: {
          cookie: 'LearnUp_guest_mode=true; LearnUp_guest_session_id=invalid-id',
        },
      });

      await expect(requireAuth(badCookieReq)).rejects.toThrowError(AppError);
    });
  });

  describe('Cross-Guest Storage Isolation', () => {
    it('preserves clean empty state for a new guest session', async () => {
      const items = await repo.listItems(mockClient, guestUserIdA);
      expect(items).toEqual([]);
    });

    it('prevents Guest B from listing, reading, modifying, or deleting items owned by Guest A', async () => {
      // 1. Guest A creates a video item
      const itemA = await repo.createVideoItem(mockClient, {
        userId: guestUserIdA,
        youtubeVideoId: 'video-12345',
        sourceUrl: 'https://www.youtube.com/watch?v=video-12345',
        normalizedSourceKey: 'video:video-12345',
        title: 'Guest A Private Course',
        thumbnailUrl: null,
      });

      expect(itemA.id).toBeDefined();
      expect(itemA.user_id).toBe(guestUserIdA);

      // 2. Guest B lists items -> must be completely empty
      const itemsB = await repo.listItems(mockClient, guestUserIdB);
      expect(itemsB).toHaveLength(0);

      // 3. Guest A lists items -> sees their created item
      const itemsA = await repo.listItems(mockClient, guestUserIdA);
      expect(itemsA).toHaveLength(1);
      expect(itemsA[0].id).toBe(itemA.id);

      // 4. Guest B tries to read Guest A's item -> throws 404 NOT_FOUND
      await expect(repo.getItemWithVideos(mockClient, guestUserIdB, itemA.id)).rejects.toThrowError(
        /not found/i
      );

      // 5. Guest B tries to update Guest A's item -> throws 404 NOT_FOUND
      await expect(
        repo.updateItem(mockClient, guestUserIdB, itemA.id, { title: 'Compromised Title' })
      ).rejects.toThrowError(/not found/i);

      // 6. Guest B tries to delete Guest A's item -> throws 404 NOT_FOUND
      await expect(repo.deleteItem(mockClient, guestUserIdB, itemA.id)).rejects.toThrowError(
        /not found/i
      );

      // 7. Verify Guest A's item remained untouched
      const verifiedItemA = await repo.getItemWithVideos(mockClient, guestUserIdA, itemA.id);
      expect(verifiedItemA.title).toBe('Guest A Private Course');

      // 8. Guest A can successfully delete their own item
      await repo.deleteItem(mockClient, guestUserIdA, itemA.id);
      const remainingItemsA = await repo.listItems(mockClient, guestUserIdA);
      expect(remainingItemsA).toHaveLength(0);
    });

    it('isolates duplicate import idempotency checks per guest', async () => {
      const sourceKey = 'video:shared-url-123';

      // Guest A imports a video
      await repo.createVideoItem(mockClient, {
        userId: guestUserIdA,
        youtubeVideoId: 'shared-url-123',
        sourceUrl: 'https://www.youtube.com/watch?v=shared-url-123',
        normalizedSourceKey: sourceKey,
        title: 'Shared Tutorial',
        thumbnailUrl: null,
      });

      // Guest A importing the same URL again detects duplicate
      const duplicateA = await repo.findBySourceKey(mockClient, guestUserIdA, sourceKey);
      expect(duplicateA).not.toBeNull();

      // Guest B has NOT imported it yet, so findBySourceKey returns null
      const duplicateB = await repo.findBySourceKey(mockClient, guestUserIdB, sourceKey);
      expect(duplicateB).toBeNull();

      // Guest B can import the same URL independently into their own library
      const itemB = await repo.createVideoItem(mockClient, {
        userId: guestUserIdB,
        youtubeVideoId: 'shared-url-123',
        sourceUrl: 'https://www.youtube.com/watch?v=shared-url-123',
        normalizedSourceKey: sourceKey,
        title: 'Guest B Copy of Tutorial',
        thumbnailUrl: null,
      });
      expect(itemB.user_id).toBe(guestUserIdB);
    });
  });
});
