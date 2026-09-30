import { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../errors';
import { logger } from '../logging';
import {
  Calendar,
  CalendarCategory,
  CalendarEvent,
  CalendarStudySession,
  CalendarSyncState,
  CreateCalendarInput,
  UpdateCalendarInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateCalendarEventInput,
  UpdateCalendarEventInput
} from '../types/calendar';

export class CalendarRepository {
  /**
   * List all calendars for a user.
   */
  async listCalendars(client: SupabaseClient, userId: string): Promise<Calendar[]> {
    const { data, error } = await client
      .from('calendars')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Failed to list calendars', { operation: 'listCalendars', userId, error: error.message });
      throw new AppError('DATABASE_ERROR', 'Failed to fetch calendars', 500);
    }

    return (data as Calendar[]) || [];
  }

  /**
   * Create a new custom calendar.
   */
  async createCalendar(client: SupabaseClient, userId: string, input: CreateCalendarInput): Promise<Calendar> {
    const { data, error } = await client
      .from('calendars')
      .insert({
        user_id: userId,
        name: input.name,
        description: input.description ?? null,
        color: input.color ?? '#6366f1',
        is_visible: input.is_visible ?? true,
        is_default: input.is_default ?? false,
        source: input.source ?? 'local',
        provider_calendar_id: input.provider_calendar_id ?? null
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create calendar', { operation: 'createCalendar', userId, error: error.message });
      throw new AppError('DATABASE_ERROR', 'Failed to create calendar', 500);
    }

    return data as Calendar;
  }

  /**
   * Update a calendar.
   */
  async updateCalendar(
    client: SupabaseClient,
    userId: string,
    calendarId: string,
    input: UpdateCalendarInput
  ): Promise<Calendar> {
    const { data, error } = await client
      .from('calendars')
      .update({
        ...input,
        updated_at: new Date().toISOString()
      })
      .eq('id', calendarId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update calendar', { operation: 'updateCalendar', userId, calendarId, error: error.message });
      throw new AppError('DATABASE_ERROR', 'Failed to update calendar', 500);
    }

    if (!data) {
      throw new AppError('NOT_FOUND', 'Calendar not found', 404);
    }

    return data as Calendar;
  }

  /**
   * Delete a calendar.
   */
  async deleteCalendar(client: SupabaseClient, userId: string, calendarId: string): Promise<void> {
    const { error } = await client
      .from('calendars')
      .delete()
      .eq('id', calendarId)
      .eq('user_id', userId);

    if (error) {
      logger.error('Failed to delete calendar', { operation: 'deleteCalendar', userId, calendarId, error: error.message });
      throw new AppError('DATABASE_ERROR', 'Failed to delete calendar', 500);
    }
  }

  /**
   * List all categories for a user.
   */
  async listCategories(client: SupabaseClient, userId: string): Promise<CalendarCategory[]> {
    const { data, error } = await client
      .from('calendar_categories')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Failed to list calendar categories', { operation: 'listCategories', userId, error: error.message });
      throw new AppError('DATABASE_ERROR', 'Failed to fetch calendar categories', 500);
    }

    return (data as CalendarCategory[]) || [];
  }

  /**
   * Create a category.
   */
  async createCategory(client: SupabaseClient, userId: string, input: CreateCategoryInput): Promise<CalendarCategory> {
    const { data, error } = await client
      .from('calendar_categories')
      .insert({
        user_id: userId,
        name: input.name,
        color: input.color ?? '#6366f1',
        is_default: input.is_default ?? false
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create calendar category', { operation: 'createCategory', userId, error: error.message });
      throw new AppError('DATABASE_ERROR', 'Failed to create calendar category', 500);
    }

    return data as CalendarCategory;
  }

  /**
   * Update a category.
   */
  async updateCategory(
    client: SupabaseClient,
    userId: string,
    categoryId: string,
    input: UpdateCategoryInput
  ): Promise<CalendarCategory> {
    const { data, error } = await client
      .from('calendar_categories')
      .update({
        ...input,
        updated_at: new Date().toISOString()
      })
      .eq('id', categoryId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update calendar category', { operation: 'updateCategory', userId, categoryId, error: error.message });
      throw new AppError('DATABASE_ERROR', 'Failed to update calendar category', 500);
    }

    if (!data) {
      throw new AppError('NOT_FOUND', 'Calendar category not found', 404);
    }

    return data as CalendarCategory;
  }

  /**
   * Delete a category (with optional reassignment of events).
   */
  async deleteCategory(
    client: SupabaseClient,
    userId: string,
    categoryId: string,
    reassignCategoryId?: string | null
  ): Promise<void> {
    if (reassignCategoryId !== undefined) {
      await client
        .from('calendar_events')
        .update({ category_id: reassignCategoryId })
        .eq('category_id', categoryId)
        .eq('user_id', userId);
    }

    const { error } = await client
      .from('calendar_categories')
      .delete()
      .eq('id', categoryId)
      .eq('user_id', userId);

    if (error) {
      logger.error('Failed to delete category', { operation: 'deleteCategory', userId, categoryId, error: error.message });
      throw new AppError('DATABASE_ERROR', 'Failed to delete category', 500);
    }
  }

  /**
   * List events in a date range for a user.
   */
  async listEvents(
    client: SupabaseClient,
    userId: string,
    params: {
      startAt: string;
      endAt: string;
      calendarId?: string;
      categoryId?: string;
    }
  ): Promise<CalendarEvent[]> {
    let query = client
      .from('calendar_events')
      .select(`
        *,
        calendar:calendars(*),
        category:calendar_categories(*),
        learning_item:learning_items(id, title, thumbnail_url, type)
      `)
      .eq('user_id', userId)
      // Query events that overlap [startAt, endAt] or recurring parent events
      .or(`and(start_at.lte.${params.endAt},end_at.gte.${params.startAt}),recurrence_rule.not.is.null`)
      .order('start_at', { ascending: true });

    if (params.calendarId) {
      query = query.eq('calendar_id', params.calendarId);
    }
    if (params.categoryId) {
      query = query.eq('category_id', params.categoryId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to list calendar events', { operation: 'listEvents', userId, error: error.message });
      throw new AppError('DATABASE_ERROR', 'Failed to fetch calendar events', 500);
    }

    return (data as CalendarEvent[]) || [];
  }

  /**
   * Get single event by ID.
   */
  async getEventById(client: SupabaseClient, userId: string, eventId: string): Promise<CalendarEvent | null> {
    const { data, error } = await client
      .from('calendar_events')
      .select(`
        *,
        calendar:calendars(*),
        category:calendar_categories(*),
        learning_item:learning_items(id, title, thumbnail_url, type)
      `)
      .eq('id', eventId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      logger.error('Failed to get calendar event', { operation: 'getEventById', userId, eventId, error: error.message });
      throw new AppError('DATABASE_ERROR', 'Failed to fetch calendar event', 500);
    }

    return (data as CalendarEvent) || null;
  }

  /**
   * Create a new calendar event.
   */
  async createEvent(client: SupabaseClient, userId: string, input: CreateCalendarEventInput): Promise<CalendarEvent> {
    const { data, error } = await client
      .from('calendar_events')
      .insert({
        user_id: userId,
        calendar_id: input.calendar_id ?? null,
        category_id: input.category_id ?? null,
        title: input.title,
        description: input.description ?? null,
        location: input.location ?? null,
        url: input.url ?? null,
        notes: input.notes ?? null,
        start_at: input.start_at,
        end_at: input.end_at,
        timezone: input.timezone ?? 'UTC',
        all_day: input.all_day ?? false,
        color_override: input.color_override ?? null,
        learning_item_id: input.learning_item_id ?? null,
        youtube_video_id: input.youtube_video_id ?? null,
        recurrence_rule: input.recurrence_rule ?? null,
        reminders: input.reminders ?? [],
        status: input.status ?? 'confirmed',
        is_study_session: input.is_study_session ?? false,
        planned_duration_minutes: input.planned_duration_minutes ?? null
      })
      .select(`
        *,
        calendar:calendars(*),
        category:calendar_categories(*),
        learning_item:learning_items(id, title, thumbnail_url, type)
      `)
      .single();

    if (error) {
      logger.error('Failed to create calendar event', { operation: 'createEvent', userId, error: error.message });
      throw new AppError('DATABASE_ERROR', 'Failed to create calendar event', 500);
    }

    return data as CalendarEvent;
  }

  /**
   * Update an existing calendar event.
   */
  async updateEvent(
    client: SupabaseClient,
    userId: string,
    eventId: string,
    input: UpdateCalendarEventInput
  ): Promise<CalendarEvent> {
    const { data, error } = await client
      .from('calendar_events')
      .update({
        ...input,
        updated_at: new Date().toISOString()
      })
      .eq('id', eventId)
      .eq('user_id', userId)
      .select(`
        *,
        calendar:calendars(*),
        category:calendar_categories(*),
        learning_item:learning_items(id, title, thumbnail_url, type)
      `)
      .single();

    if (error) {
      logger.error('Failed to update calendar event', { operation: 'updateEvent', userId, eventId, error: error.message });
      throw new AppError('DATABASE_ERROR', 'Failed to update calendar event', 500);
    }

    if (!data) {
      throw new AppError('NOT_FOUND', 'Calendar event not found', 404);
    }

    return data as CalendarEvent;
  }

  /**
   * Delete a calendar event.
   */
  async deleteEvent(client: SupabaseClient, userId: string, eventId: string): Promise<void> {
    const { error } = await client
      .from('calendar_events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', userId);

    if (error) {
      logger.error('Failed to delete calendar event', { operation: 'deleteEvent', userId, eventId, error: error.message });
      throw new AppError('DATABASE_ERROR', 'Failed to delete calendar event', 500);
    }
  }

  /**
   * Add an exception date to a recurring event's recurrence rule.
   */
  async addRecurrenceException(
    client: SupabaseClient,
    userId: string,
    parentEventId: string,
    exceptionDateIso: string
  ): Promise<CalendarEvent> {
    const event = await this.getEventById(client, userId, parentEventId);
    if (!event) {
      throw new AppError('NOT_FOUND', 'Parent recurring event not found', 404);
    }

    const currentRule = event.recurrence_rule || { freq: 'DAILY' };
    const currentExceptions = new Set(currentRule.exceptions || []);
    currentExceptions.add(exceptionDateIso);

    const updatedRule = {
      ...currentRule,
      exceptions: Array.from(currentExceptions)
    };

    return this.updateEvent(client, userId, parentEventId, {
      recurrence_rule: updatedRule
    });
  }

  /**
   * Edit a single occurrence of a recurring event (detaches and creates an instance).
   */
  async editRecurringOccurrence(
    client: SupabaseClient,
    userId: string,
    parentEventId: string,
    exceptionDateIso: string,
    occurrenceInput: CreateCalendarEventInput
  ): Promise<{ parent: CalendarEvent; occurrence: CalendarEvent }> {
    const parent = await this.addRecurrenceException(client, userId, parentEventId, exceptionDateIso);
    const occurrence = await this.createEvent(client, userId, {
      ...occurrenceInput,
      recurrence_rule: null
    });
    return { parent, occurrence };
  }

  /**
   * Start a live study session linked to a calendar event.
   */
  async startStudySession(
    client: SupabaseClient,
    userId: string,
    params: {
      eventId: string;
      learningItemId?: string | null;
      plannedDurationSeconds: number;
    }
  ): Promise<CalendarStudySession> {
    const { data, error } = await client
      .from('calendar_event_study_sessions')
      .insert({
        user_id: userId,
        event_id: params.eventId,
        learning_item_id: params.learningItemId ?? null,
        planned_duration_seconds: params.plannedDurationSeconds,
        actual_duration_seconds: 0,
        paused_seconds: 0
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to start study session', { operation: 'startStudySession', userId, error: error.message });
      throw new AppError('DATABASE_ERROR', 'Failed to start study session', 500);
    }

    return data as CalendarStudySession;
  }

  /**
   * Update or finish a live study session.
   */
  async updateStudySession(
    client: SupabaseClient,
    userId: string,
    sessionId: string,
    params: {
      actualDurationSeconds: number;
      pausedSeconds?: number;
      ended?: boolean;
    }
  ): Promise<CalendarStudySession> {
    const updatePayload: Record<string, any> = {
      actual_duration_seconds: params.actualDurationSeconds,
      paused_seconds: params.pausedSeconds ?? 0
    };

    if (params.ended) {
      updatePayload.ended_at = new Date().toISOString();
    }

    const { data, error } = await client
      .from('calendar_event_study_sessions')
      .update(updatePayload)
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update study session', { operation: 'updateStudySession', userId, sessionId, error: error.message });
      throw new AppError('DATABASE_ERROR', 'Failed to update study session', 500);
    }

    // Also update actual_duration_seconds on the calendar event
    if (data && data.event_id) {
      await client
        .from('calendar_events')
        .update({
          actual_duration_seconds: params.actualDurationSeconds,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.event_id)
        .eq('user_id', userId);
    }

    return data as CalendarStudySession;
  }

  /**
   * Get sync state for an external provider.
   */
  async getSyncState(client: SupabaseClient, userId: string, provider: string = 'google'): Promise<CalendarSyncState | null> {
    const { data, error } = await client
      .from('calendar_sync_state')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', provider)
      .maybeSingle();

    if (error) {
      logger.error('Failed to get calendar sync state', { operation: 'getSyncState', userId, provider, error: error.message });
      throw new AppError('DATABASE_ERROR', 'Failed to fetch calendar sync state', 500);
    }

    return (data as CalendarSyncState) || null;
  }

  /**
   * Upsert sync state for an external provider.
   */
  async setSyncState(
    client: SupabaseClient,
    userId: string,
    provider: string,
    syncToken: string | null
  ): Promise<CalendarSyncState> {
    const { data, error } = await client
      .from('calendar_sync_state')
      .upsert(
        {
          user_id: userId,
          provider,
          sync_token: syncToken,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id,provider' }
      )
      .select()
      .single();

    if (error) {
      logger.error('Failed to set calendar sync state', { operation: 'setSyncState', userId, provider, error: error.message });
      throw new AppError('DATABASE_ERROR', 'Failed to update calendar sync state', 500);
    }

    return data as CalendarSyncState;
  }
}
