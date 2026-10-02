import { z } from 'zod';
import { AppError } from '../errors';

export const importRequestSchema = z.object({
  url: z.string().trim().min(1, 'URL is required').max(2048, 'URL exceeds maximum length of 2048 characters'),
  title: z.string().trim().max(500).optional().nullable(),
  description: z.string().trim().max(50000).optional().nullable(),
  skillDomain: z.string().trim().max(200).optional().nullable(),
  tags: z.array(z.string().trim().max(100)).optional().nullable(),
  customThumbnailUrl: z.union([z.string().url().max(2048), z.literal('')]).optional().nullable(),
  selectedVideoIds: z.array(z.string()).optional().nullable()
});

export const previewCourseSchema = z
  .object({
    url: z.string().trim().max(2048).optional(),
    urls: z.array(z.string().trim().min(1).max(2048)).max(100).optional()
  })
  .refine((data) => (data.url && data.url.length > 0) || (data.urls && data.urls.length > 0), {
    message: 'URL is required'
  });

export const importCourseSchema = importRequestSchema;

export const idParamSchema = z.string().uuid('Invalid identifier format');

export const updateUserSettingsSchema = z.object({
  username: z.string().trim().min(2).max(50).optional().nullable(),
  display_name: z.string().trim().min(1).max(100).optional().nullable(),
  avatar_url: z.string().url().max(1024).optional().nullable(),
  student_id: z.string().trim().max(30).optional(),
  theme_mode: z.enum(['light', 'dark']).optional(),
  accent_color: z.enum(['indigo', 'violet', 'cobalt', 'orange']).optional(),
  default_sprint_duration: z.number().int().min(1).max(180).optional(),
  short_break_duration: z.number().int().min(1).max(60).optional(),
  long_break_duration: z.number().int().min(1).max(120).optional(),
  acoustic_cue_profile: z.string().trim().max(100).optional(),
  auto_start_breaks: z.boolean().optional(),
  auto_start_next_sprint: z.boolean().optional(),
  ambient_soundscape: z.boolean().optional(),
  compact_hud_timer: z.boolean().optional(),
  auto_mark_video_completed: z.boolean().optional(),
  default_player_layout: z.enum(['technical_workstation', 'cinema_mode']).optional(),
  streak_threshold_minutes: z.number().int().min(1).max(1440).optional(),
  spaced_repetition_algorithm: z.string().trim().max(50).optional(),
  ai_provider: z.string().trim().max(50).optional(),
  ai_model: z.string().trim().max(100).optional(),
  encrypted_api_key: z.string().max(2048).optional().nullable(),
  context_window: z.number().int().min(1000).max(2000000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  notify_focus_completion: z.boolean().optional(),
  notify_milestone_celebration: z.boolean().optional(),
  notify_streak_reminder: z.boolean().optional(),
  notify_quiz_prompts: z.boolean().optional(),
  notify_weekly_digest: z.boolean().optional()
});

export const updateConnectorSchema = z.object({
  connector_type: z.enum(['obsidian', 'github', 'google_calendar', 'notion', 'local_fs']),
  is_enabled: z.boolean().optional(),
  config: z.record(z.any()).optional(),
  auth_token: z.string().max(2048).optional().nullable()
});

export const updatePluginSchema = z.object({
  plugin_id: z.string().min(1).max(100),
  is_enabled: z.boolean().optional(),
  config: z.record(z.any()).optional()
});

export const recordTokenUsageSchema = z.object({
  provider: z.string().min(1).max(50),
  model: z.string().min(1).max(100),
  prompt_tokens: z.number().int().min(0),
  completion_tokens: z.number().int().min(0),
  operation: z.string().min(1).max(100).optional()
});

export const recordFocusSessionSchema = z.object({
  learning_item_id: z.string().uuid().optional().nullable(),
  youtube_video_id: z.string().optional().nullable(),
  duration_seconds: z.number().int().min(1).max(86400),
  mode: z.enum(['sprint', 'deep_block', 'flow_state', 'short_break', 'long_break', 'custom']),
  interval_number: z.number().int().min(1).default(1),
  soundscape: z.enum(['binaural_40hz', 'rain', 'pink_noise', 'lofi', 'silent']).default('binaural_40hz'),
  completed: z.boolean().default(true)
});

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1, 'Workspace name is required').max(50, 'Workspace name must be 50 characters or less'),
  icon: z.string().trim().min(1, 'Workspace icon is required').max(20, 'Icon identifier is too long').optional().default('📚')
});

export const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(1, 'Workspace name is required').max(50, 'Workspace name must be 50 characters or less').optional(),
  icon: z.string().trim().min(1, 'Workspace icon is required').max(20, 'Icon identifier is too long').optional()
});

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.errors.map((e) => e.message).join('; ');
    throw new AppError('VALIDATION_ERROR', message, 400, result.error.format());
  }
  return result.data;
}
