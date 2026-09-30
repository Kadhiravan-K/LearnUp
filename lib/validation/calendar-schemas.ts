import { z } from 'zod';

export const recurrenceRuleSchema = z.object({
  freq: z.enum(['DAILY', 'WEEKDAYS', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM']),
  interval: z.number().int().min(1).max(365).optional().default(1),
  byDay: z.array(z.enum(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'])).optional(),
  until: z.string().optional(),
  count: z.number().int().min(1).max(1000).optional(),
  exceptions: z.array(z.string()).optional()
}).nullable().optional();

export const reminderSchema = z.object({
  type: z.enum(['notification', 'email', 'audio_cue']),
  minutes_before: z.number().int().min(0).max(43200) // up to 30 days
});

export const createCalendarSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  description: z.string().trim().max(500).optional().nullable(),
  color: z.string().trim().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Invalid hex color').default('#6366f1'),
  is_visible: z.boolean().optional().default(true),
  is_default: z.boolean().optional().default(false),
  source: z.enum(['local', 'google', 'outlook', 'apple', 'custom']).optional().default('local'),
  provider_calendar_id: z.string().trim().max(255).optional().nullable()
});

export const updateCalendarSchema = createCalendarSchema.partial();

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(100),
  color: z.string().trim().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Invalid hex color').default('#6366f1'),
  is_default: z.boolean().optional().default(false)
});

export const updateCategorySchema = createCategorySchema.partial();

const optionalUuid = z.string().uuid('Invalid identifier format').or(z.literal('')).transform((v) => (v === '' ? null : v)).optional().nullable();
const optionalUrl = z.string().url('Invalid URL format').max(2048).or(z.literal('')).transform((v) => (v === '' ? null : v)).optional().nullable();
const optionalColor = z.string().trim().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Invalid hex color').or(z.literal('')).transform((v) => (v === '' ? null : v)).optional().nullable();

export const createCalendarEventSchema = z.object({
  calendar_id: optionalUuid,
  category_id: optionalUuid,
  title: z.string().trim().min(1, 'Event title is required').max(300, 'Title exceeds 300 characters'),
  description: z.string().trim().max(5000).optional().nullable(),
  location: z.string().trim().max(500).optional().nullable(),
  url: optionalUrl,
  notes: z.string().trim().max(10000).optional().nullable(),
  start_at: z.string().datetime({ offset: true }).or(z.string().min(1, 'Start date is required')),
  end_at: z.string().datetime({ offset: true }).or(z.string().min(1, 'End date is required')),
  timezone: z.string().trim().default('UTC'),
  all_day: z.boolean().optional().default(false),
  color_override: optionalColor,
  learning_item_id: optionalUuid,
  youtube_video_id: z.string().trim().max(100).optional().nullable(),
  recurrence_rule: recurrenceRuleSchema,
  reminders: z.array(reminderSchema).optional().default([]),
  status: z.enum(['confirmed', 'tentative', 'cancelled', 'completed']).optional().default('confirmed'),
  is_study_session: z.boolean().optional().default(false),
  planned_duration_minutes: z.number().int().min(1).max(1440).optional().nullable()
}).refine(
  (data) => {
    const start = new Date(data.start_at).getTime();
    const end = new Date(data.end_at).getTime();
    return !isNaN(start) && !isNaN(end) && end > start;
  },
  {
    message: 'End time must be after start time',
    path: ['end_at']
  }
);

export const updateCalendarEventSchema = z.object({
  calendar_id: optionalUuid,
  category_id: optionalUuid,
  title: z.string().trim().min(1, 'Event title is required').max(300, 'Title exceeds 300 characters').optional(),
  description: z.string().trim().max(5000).optional().nullable(),
  location: z.string().trim().max(500).optional().nullable(),
  url: optionalUrl,
  notes: z.string().trim().max(10000).optional().nullable(),
  start_at: z.string().datetime({ offset: true }).or(z.string().min(1)).optional(),
  end_at: z.string().datetime({ offset: true }).or(z.string().min(1)).optional(),
  timezone: z.string().trim().optional(),
  all_day: z.boolean().optional(),
  color_override: optionalColor,
  learning_item_id: optionalUuid,
  youtube_video_id: z.string().trim().max(100).optional().nullable(),
  recurrence_rule: recurrenceRuleSchema,
  reminders: z.array(reminderSchema).optional(),
  status: z.enum(['confirmed', 'tentative', 'cancelled', 'completed']).optional(),
  is_study_session: z.boolean().optional(),
  planned_duration_minutes: z.number().int().min(1).max(1440).optional().nullable(),
  actual_duration_seconds: z.number().int().min(0).optional(),
  sync_id: z.string().max(255).optional().nullable(),
  etag: z.string().max(255).optional().nullable()
}).refine(
  (data) => {
    if (data.start_at && data.end_at) {
      const start = new Date(data.start_at).getTime();
      const end = new Date(data.end_at).getTime();
      return !isNaN(start) && !isNaN(end) && end > start;
    }
    return true;
  },
  {
    message: 'End time must be after start time',
    path: ['end_at']
  }
);

export const listEventsQuerySchema = z.object({
  start: z.string().datetime({ offset: true }).or(z.string().min(1)),
  end: z.string().datetime({ offset: true }).or(z.string().min(1)),
  timezone: z.string().optional().default('UTC'),
  calendar_id: z.string().uuid().optional(),
  category_id: z.string().uuid().optional()
});

export const startStudySessionSchema = z.object({
  event_id: z.string().uuid('Invalid event_id'),
  learning_item_id: z.string().uuid().optional().nullable(),
  planned_duration_seconds: z.number().int().min(60).max(86400).default(1800)
});

export const updateStudySessionSchema = z.object({
  session_id: z.string().uuid('Invalid session_id'),
  actual_duration_seconds: z.number().int().min(0),
  paused_seconds: z.number().int().min(0).optional().default(0),
  ended: z.boolean().optional().default(false)
});
