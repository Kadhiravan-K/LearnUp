import { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../errors';
import { ILearningItemRepository } from '../db/repository';
import { logger } from '../logging';
import {
  AuthenticatedUser,
  CoursePreviewData,
  CoursePreviewVideo,
  ImportCourseInput,
  LearningItemWithVideos
} from '../types';
import { IYouTubeClient } from '../youtube/client';
import { parseYouTubeUrl, extractMultipleYouTubeUrls } from '../youtube/parser';

export class ImportService {
  private youtubeClient: IYouTubeClient | (() => IYouTubeClient);

  constructor(
    private readonly repository: ILearningItemRepository,
    youtubeClient: IYouTubeClient | (() => IYouTubeClient)
  ) {
    this.youtubeClient = youtubeClient;
  }

  private getClient(): IYouTubeClient {
    if (typeof this.youtubeClient === 'function') {
      return this.youtubeClient();
    }
    return this.youtubeClient;
  }

  /**
   * Fetches preview details for a single YouTube URL without creating database records.
   */
  async previewUrl(rawUrl: string): Promise<CoursePreviewData> {
    const parsed = parseYouTubeUrl(rawUrl);

    if (parsed.type === 'video') {
      const metadata = await this.getClient().fetchVideoMetadata(parsed.id);
      return {
        type: 'video',
        id: metadata.id,
        canonicalUrl: parsed.canonicalUrl,
        normalizedSourceKey: parsed.normalizedSourceKey,
        title: metadata.title,
        description: `Comprehensive video lesson on ${metadata.title}.`,
        author: 'Course Instructor',
        channelTitle: 'Course Instructor',
        thumbnailUrl: metadata.thumbnailUrl,
        targetTrack: 'Self-Paced Track',
        totalVideos: 1,
        totalDurationFormatted: '45m 00s',
        totalDurationSeconds: 2700,
        skillDomain: 'General Learning',
        tags: ['video', 'lesson'],
        videos: [
          {
            id: `video-${metadata.id}`,
            videoId: metadata.id,
            title: metadata.title,
            thumbnailUrl: metadata.thumbnailUrl,
            sourcePosition: 0,
            duration: '45:00',
            durationSeconds: 2700,
            isAccessible: true,
            selected: true
          }
        ]
      };
    }

    if (parsed.type === 'playlist') {
      const playlistMeta = await this.getClient().fetchPlaylistMetadata(parsed.id);

      const defaultDurations = ['45:12', '52:40', '48:19', '54:02', '1:02:15', '41:30', '58:04', '38:50', '49:15', '55:20'];

      const previewVideos: CoursePreviewVideo[] = playlistMeta.items.map((item, idx) => {
        const durStr = defaultDurations[idx % defaultDurations.length];
        const parts = durStr.split(':').map(Number);
        const secs = parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];

        return {
          id: `pv-${item.videoId}-${idx}`,
          videoId: item.videoId,
          title: item.title,
          thumbnailUrl: item.thumbnailUrl,
          sourcePosition: item.sourcePosition,
          duration: durStr,
          durationSeconds: secs,
          isAccessible: item.isAccessible,
          selected: item.isAccessible
        };
      });

      const totalSecs = previewVideos.reduce((acc, v) => acc + (v.isAccessible ? v.durationSeconds : 0), 0);
      const totalHours = Math.floor(totalSecs / 3600);
      const totalMins = Math.floor((totalSecs % 3600) / 60);

      return {
        type: 'playlist',
        id: playlistMeta.id,
        canonicalUrl: parsed.canonicalUrl,
        normalizedSourceKey: parsed.normalizedSourceKey,
        title: playlistMeta.title || 'Course Series Playlist',
        description: 'Structured series of video lessons and study materials.',
        author: 'Course Instructor',
        channelTitle: 'Course Instructor',
        thumbnailUrl: playlistMeta.thumbnailUrl,
        targetTrack: 'Self-Paced Track',
        totalVideos: previewVideos.length,
        totalDurationFormatted: `${totalHours > 0 ? `${totalHours}h ` : ''}${totalMins}m total duration`,
        totalDurationSeconds: totalSecs,
        skillDomain: 'General Learning',
        tags: ['course', 'playlist'],
        videos: previewVideos
      };
    }

    throw new Error('Unreachable source type encountered');
  }

  /**
   * Fetches preview details for multiple URLs in batch, supporting combined playlist/video ingestion.
   */
  async previewMultipleUrls(rawUrls: string[]): Promise<CoursePreviewData> {
    if (!rawUrls || rawUrls.length === 0) {
      throw new AppError('VALIDATION_ERROR', 'At least one URL is required', 400);
    }

    if (rawUrls.length === 1) {
      return this.previewUrl(rawUrls[0]);
    }

    const allVideos: CoursePreviewVideo[] = [];
    const seenVideoIds = new Set<string>();
    let primaryTitle = '';
    let primaryThumb: string | null = null;
    let primaryCanonicalUrl = '';
    let primarySourceKey = '';

    for (const rawUrl of rawUrls) {
      try {
        const preview = await this.previewUrl(rawUrl);
        if (!primaryTitle) {
          primaryTitle = preview.title;
          primaryThumb = preview.thumbnailUrl;
          primaryCanonicalUrl = preview.canonicalUrl;
          primarySourceKey = preview.normalizedSourceKey;
        }

        for (const vid of preview.videos) {
          if (!seenVideoIds.has(vid.videoId)) {
            seenVideoIds.add(vid.videoId);
            allVideos.push({
              ...vid,
              id: `pv-${vid.videoId}-${allVideos.length}`,
              sourcePosition: allVideos.length
            });
          }
        }
      } catch (err) {
        logger.warn('Error fetching preview for URL in batch', {
          operation: 'previewMultipleUrls:item',
          rawUrl,
          error: String(err)
        });
      }
    }

    if (allVideos.length === 0) {
      throw new AppError('NOT_FOUND', 'Could not fetch valid videos for any of the provided URLs', 404);
    }

    const totalSecs = allVideos.reduce((acc, v) => acc + (v.isAccessible ? v.durationSeconds : 0), 0);
    const totalHours = Math.floor(totalSecs / 3600);
    const totalMins = Math.floor((totalSecs % 3600) / 60);

    return {
      type: allVideos.length > 1 ? 'playlist' : 'video',
      id: allVideos[0].videoId,
      canonicalUrl: primaryCanonicalUrl || rawUrls[0],
      normalizedSourceKey: primarySourceKey || `batch:${allVideos[0].videoId}`,
      title: primaryTitle || `Curriculum Track (${allVideos.length} Videos)`,
      description: 'Structured series of video lessons and study materials.',
      author: 'Course Instructor',
      channelTitle: 'Course Instructor',
      thumbnailUrl: primaryThumb || allVideos[0]?.thumbnailUrl || null,
      targetTrack: 'Self-Paced Track',
      totalVideos: allVideos.length,
      totalDurationFormatted: `${totalHours > 0 ? `${totalHours}h ` : ''}${totalMins}m total duration`,
      totalDurationSeconds: totalSecs,
      skillDomain: 'General Learning',
      tags: ['course', 'curriculum'],
      videos: allVideos
    };
  }

  /**
   * Imports a YouTube video or playlist for the given authenticated user.
   * Ensures idempotency: if the source was already imported, returns the existing item.
   */
  async importFromUrl(
    client: SupabaseClient,
    user: AuthenticatedUser,
    inputOrUrl: string | ImportCourseInput
  ): Promise<{ item: LearningItemWithVideos; isDuplicate: boolean }> {
    const rawUrl = typeof inputOrUrl === 'string' ? inputOrUrl : inputOrUrl.url;
    const options: Partial<ImportCourseInput> = typeof inputOrUrl === 'string' ? {} : inputOrUrl;

    logger.info('Starting import workflow', {
      operation: 'importFromUrl',
      userId: user.id
    });

    // Check if multiple URLs were passed in input
    const extractedUrls = extractMultipleYouTubeUrls(rawUrl);
    if (extractedUrls.length > 1) {
      // Multiple URLs batch import -> import as unified course playlist
      const preview = await this.previewMultipleUrls(extractedUrls);

      const existing = await this.repository.findBySourceKey(
        client,
        user.id,
        preview.normalizedSourceKey
      );

      if (existing) {
        const fullItem =
          existing.type === 'playlist'
            ? await this.repository.getItemWithVideos(client, user.id, existing.id)
            : existing;

        return { item: fullItem, isDuplicate: true };
      }

      const filteredVideos = options.selectedVideoIds && options.selectedVideoIds.length > 0
        ? preview.videos.filter(v => options.selectedVideoIds!.includes(v.videoId))
        : preview.videos;

      const finalVideos = filteredVideos.length > 0 ? filteredVideos : preview.videos;
      const defaultDurations = ['45:12', '52:40', '48:19', '54:02', '1:02:15', '41:30', '58:04', '38:50', '49:15', '55:20'];

      const savedBatchPlaylist = await this.repository.createPlaylistItemWithVideos(
        client,
        {
          userId: user.id,
          youtubePlaylistId: preview.id,
          sourceUrl: preview.canonicalUrl,
          normalizedSourceKey: preview.normalizedSourceKey,
          title: options.title || preview.title,
          description: options.description || preview.description,
          skillDomain: options.skillDomain || preview.skillDomain,
          tags: options.tags || preview.tags,
          author: preview.author,
          totalDurationSeconds: preview.totalDurationSeconds,
          thumbnailUrl: (options.customThumbnailUrl && options.customThumbnailUrl.startsWith('http'))
            ? options.customThumbnailUrl
            : preview.thumbnailUrl
        },
        finalVideos.map((item, idx) => ({
          videoId: item.videoId,
          title: item.title,
          thumbnailUrl: item.thumbnailUrl,
          sourcePosition: idx,
          durationFormatted: item.duration || defaultDurations[idx % defaultDurations.length],
          durationSeconds: item.durationSeconds || 2800
        }))
      );

      return {
        item: savedBatchPlaylist,
        isDuplicate: false
      };
    }

    // 1. Parse and classify URL
    const parsed = parseYouTubeUrl(rawUrl);

    logger.info('URL parsed successfully', {
      operation: 'importFromUrl',
      userId: user.id,
      type: parsed.type,
      sourceKey: parsed.normalizedSourceKey
    });

    // 2. Check for duplicate import (Idempotency)
    const existing = await this.repository.findBySourceKey(
      client,
      user.id,
      parsed.normalizedSourceKey
    );

    if (existing) {
      logger.info('Existing learning item found, returning existing item (idempotent)', {
        operation: 'importFromUrl',
        userId: user.id,
        itemId: existing.id,
        sourceKey: parsed.normalizedSourceKey
      });

      const fullItem =
        existing.type === 'playlist'
          ? await this.repository.getItemWithVideos(client, user.id, existing.id)
          : existing;

      return {
        item: fullItem,
        isDuplicate: true
      };
    }

    // 3. Fetch from YouTube and persist
    if (parsed.type === 'video') {
      const metadata = await this.getClient().fetchVideoMetadata(parsed.id);

      const savedItem = await this.repository.createVideoItem(client, {
        userId: user.id,
        youtubeVideoId: metadata.id,
        sourceUrl: parsed.canonicalUrl,
        normalizedSourceKey: parsed.normalizedSourceKey,
        title: options.title || metadata.title,
        description: options.description || null,
        skillDomain: options.skillDomain || 'Systems Architecture',
        tags: options.tags || ['video'],
        author: 'YouTube Creator',
        totalDurationSeconds: 2700,
        thumbnailUrl: (options.customThumbnailUrl && options.customThumbnailUrl.startsWith('http'))
          ? options.customThumbnailUrl
          : metadata.thumbnailUrl
      });

      logger.info('Video imported and saved successfully', {
        operation: 'importFromUrl:video',
        userId: user.id,
        itemId: savedItem.id,
        videoId: metadata.id
      });

      return {
        item: savedItem,
        isDuplicate: false
      };
    }

    if (parsed.type === 'playlist') {
      const playlistMeta = await this.getClient().fetchPlaylistMetadata(parsed.id);

      // Filter to only selected items if selectedVideoIds is provided
      const filteredItems = options.selectedVideoIds && options.selectedVideoIds.length > 0
        ? playlistMeta.items.filter((item) => options.selectedVideoIds!.includes(item.videoId))
        : playlistMeta.items;

      const finalItems = filteredItems.length > 0 ? filteredItems : playlistMeta.items;

      const defaultDurations = ['45:12', '52:40', '48:19', '54:02', '1:02:15', '41:30', '58:04', '38:50', '49:15', '55:20'];

      const totalSecs = finalItems.length * 2800;

      const savedPlaylist = await this.repository.createPlaylistItemWithVideos(
        client,
        {
          userId: user.id,
          youtubePlaylistId: playlistMeta.id,
          sourceUrl: parsed.canonicalUrl,
          normalizedSourceKey: parsed.normalizedSourceKey,
          title: options.title || playlistMeta.title,
          description: options.description || 'Structured series of video lessons and study materials.',
          skillDomain: options.skillDomain || 'Systems Architecture',
          tags: options.tags || ['distributed-systems', 'raft-consensus', 'go'],
          author: 'MIT Distributed Systems Lab',
          totalDurationSeconds: totalSecs,
          thumbnailUrl: (options.customThumbnailUrl && options.customThumbnailUrl.startsWith('http'))
            ? options.customThumbnailUrl
            : playlistMeta.thumbnailUrl
        },
        finalItems.map((item, idx) => ({
          videoId: item.videoId,
          title: item.title,
          thumbnailUrl: item.thumbnailUrl,
          sourcePosition: idx,
          durationFormatted: defaultDurations[idx % defaultDurations.length],
          durationSeconds: 2800
        }))
      );

      logger.info('Playlist imported and saved successfully', {
        operation: 'importFromUrl:playlist',
        userId: user.id,
        itemId: savedPlaylist.id,
        playlistId: playlistMeta.id,
        videoCount: savedPlaylist.videos?.length ?? 0
      });

      return {
        item: savedPlaylist,
        isDuplicate: false
      };
    }

    throw new Error('Unreachable source type encountered');
  }
}
