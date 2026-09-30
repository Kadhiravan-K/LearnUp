import { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../errors';
import { logger } from '../logging';
import { UserSettings, UpdateUserSettingsInput } from '../types';

export const DEFAULT_USER_SETTINGS: Omit<UserSettings, 'user_id' | 'created_at' | 'updated_at'> = {
  username: '',
  display_name: 'Learner',
  avatar_url: null,
  student_id: '',
  theme_mode: 'light',
  accent_color: 'indigo',
  default_sprint_duration: 25,
  short_break_duration: 5,
  long_break_duration: 15,
  acoustic_cue_profile: 'binaural_chime',
  auto_start_breaks: true,
  auto_start_next_sprint: false,
  ambient_soundscape: true,
  compact_hud_timer: true,
  auto_mark_video_completed: true,
  default_player_layout: 'technical_workstation',
  streak_threshold_minutes: 30,
  spaced_repetition_algorithm: 'leitner',
  ai_provider: 'anthropic',
  ai_model: 'claude-3-5-sonnet-20241022',
  encrypted_api_key: null,
  context_window: 200000,
  temperature: 0.20,
  notify_focus_completion: true,
  notify_milestone_celebration: true,
  notify_streak_reminder: true,
  notify_quiz_prompts: true,
  notify_weekly_digest: false
};

export interface ISettingsRepository {
  getByUserId(client: SupabaseClient, userId: string): Promise<UserSettings>;
  update(client: SupabaseClient, userId: string, updates: UpdateUserSettingsInput): Promise<UserSettings>;
  deleteByUserId(client: SupabaseClient, userId: string): Promise<void>;
}

export class SettingsRepository implements ISettingsRepository {
  async getByUserId(client: SupabaseClient, userId: string): Promise<UserSettings> {
    const { data, error } = await client
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      logger.error('Failed to get user settings', { operation: 'getUserSettings', userId, error: error.message });
      // If table or row doesn't exist yet, return safe defaults
      return {
        user_id: userId,
        ...DEFAULT_USER_SETTINGS,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }

    if (!data) {
      // Create defaults
      const now = new Date().toISOString();
      const defaultRecord = {
        user_id: userId,
        ...DEFAULT_USER_SETTINGS
      };

      const { data: inserted, error: insertError } = await client
        .from('user_settings')
        .insert(defaultRecord)
        .select('*')
        .maybeSingle();

      if (insertError || !inserted) {
        return {
          ...defaultRecord,
          created_at: now,
          updated_at: now
        };
      }
      return inserted as UserSettings;
    }

    return data as UserSettings;
  }

  async update(client: SupabaseClient, userId: string, updates: UpdateUserSettingsInput): Promise<UserSettings> {
    const { data, error } = await client
      .from('user_settings')
      .upsert({
        user_id: userId,
        ...updates,
        updated_at: new Date().toISOString()
      })
      .select('*')
      .maybeSingle();

    if (error) {
      logger.error('Failed to update user settings', { operation: 'updateUserSettings', userId, error: error.message });
      throw new AppError('DATABASE_ERROR', 'Failed to update user settings', 500);
    }

    if (!data) {
      // Fallback
      return {
        user_id: userId,
        ...DEFAULT_USER_SETTINGS,
        ...updates,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as UserSettings;
    }

    return data as UserSettings;
  }

  async deleteByUserId(client: SupabaseClient, userId: string): Promise<void> {
    const { error } = await client
      .from('user_settings')
      .delete()
      .eq('user_id', userId);

    if (error) {
      logger.error('Failed to delete user settings', { operation: 'deleteUserSettings', userId, error: error.message });
      throw new AppError('DATABASE_ERROR', 'Failed to delete user settings', 500);
    }
  }
}

export const settingsRepository = new SettingsRepository();
