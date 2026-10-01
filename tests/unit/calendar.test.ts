import { describe, it, expect } from 'vitest';
import {
  expandRecurringEvents,
  computeEventLayoutColumns,
  snapToInterval,
  snapMinutesToInterval,
  calculateDragMove,
  calculateResizeChange,
  navigateDate,
  getWeekRange,
  getMonthGrid,
  formatInTimezone
} from '@/lib/services/calendar-service';
import {
  createCalendarEventSchema,
  updateCalendarEventSchema
} from '@/lib/validation/calendar-schemas';
import { CalendarEvent } from '@/lib/types/calendar';

describe('Calendar Engine & Recurrence System (SF-057 & SF-057A)', () => {
  const baseEvent: CalendarEvent = {
    id: 'evt-100',
    user_id: 'usr-1',
    title: 'Distributed Systems Lecture',
    start_at: '2026-10-01T10:00:00.000Z',
    end_at: '2026-10-01T11:00:00.000Z',
    timezone: 'UTC',
    all_day: false,
    status: 'confirmed',
    is_study_session: true,
    actual_duration_seconds: 0,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z'
  };

  describe('Validation Schemas (SF-057A Event Lifecycle)', () => {
    it('validates a valid event creation payload', () => {
      const payload = {
        title: 'Distributed Systems Lab',
        start_at: '2026-10-01T10:00:00.000Z',
        end_at: '2026-10-01T11:00:00.000Z',
        all_day: false,
        calendar_id: '11111111-1111-1111-1111-111111111111',
        category_id: '22222222-2222-2222-2222-222222222222',
        url: 'https://LearnUp.ai/labs/1',
        description: 'Complete Raft log compaction module'
      };

      const result = createCalendarEventSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Distributed Systems Lab');
        expect(result.data.calendar_id).toBe('11111111-1111-1111-1111-111111111111');
      }
    });

    it('rejects event creation when title is empty', () => {
      const payload = {
        title: '   ',
        start_at: '2026-10-01T10:00:00.000Z',
        end_at: '2026-10-01T11:00:00.000Z'
      };

      const result = createCalendarEventSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Event title is required');
      }
    });

    it('rejects event creation when end time is before or equal to start time', () => {
      const payload = {
        title: 'Invalid Time Range Session',
        start_at: '2026-10-01T11:00:00.000Z',
        end_at: '2026-10-01T10:00:00.000Z'
      };

      const result = createCalendarEventSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('End time must be after start time');
      }
    });

    it('converts empty string foreign keys and URLs to null', () => {
      const payload = {
        title: 'Personal Study Block',
        start_at: '2026-10-01T10:00:00.000Z',
        end_at: '2026-10-01T10:30:00.000Z',
        calendar_id: '',
        category_id: '',
        learning_item_id: '',
        url: ''
      };

      const result = createCalendarEventSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.calendar_id).toBeNull();
        expect(result.data.category_id).toBeNull();
        expect(result.data.learning_item_id).toBeNull();
        expect(result.data.url).toBeNull();
      }
    });

    it('validates duplicated event payload with new copy title and no ID', () => {
      const duplicatedPayload = {
        title: `${baseEvent.title} (Copy)`,
        start_at: '2026-10-02T10:00:00.000Z',
        end_at: '2026-10-02T11:00:00.000Z',
        timezone: 'UTC',
        all_day: false
      };

      const result = createCalendarEventSchema.safeParse(duplicatedPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Distributed Systems Lecture (Copy)');
      }
    });

    it('validates partial event updates', () => {
      const updatePayload = {
        title: 'Updated Lecture Title',
        notes: 'Review notes updated for lecture 4'
      };

      const result = updateCalendarEventSchema.safeParse(updatePayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Updated Lecture Title');
        expect(result.data.notes).toBe('Review notes updated for lecture 4');
      }
    });
  });

  describe('Service Helpers and Recurrence Logic', () => {
    it('snaps timestamps to designated minute intervals', () => {
      const raw = new Date('2026-10-01T10:07:00.000Z');
      const snapped15 = snapToInterval(raw, 15);
      expect(snapped15.toISOString()).toBe('2026-10-01T10:00:00.000Z');

      const raw2 = new Date('2026-10-01T10:09:00.000Z');
      const snapped15_2 = snapToInterval(raw2, 15);
      expect(snapped15_2.toISOString()).toBe('2026-10-01T10:15:00.000Z');
    });

    it('computes week range boundaries accurately', () => {
      const anchor = new Date('2026-10-14T12:00:00.000Z'); // Wednesday
      const week = getWeekRange(anchor, false); // Starts Sunday
      expect(week.days.length).toBe(7);
      expect(week.start.getDay()).toBe(0); // Sunday
      expect(week.end.getDay()).toBe(6); // Saturday
    });

    it('computes 42-cell month grid for UI alignment', () => {
      const anchor = new Date('2026-10-01T00:00:00.000Z');
      const grid = getMonthGrid(anchor, false);
      expect(grid.days.length).toBe(42);
    });

    it('formats dates accurately in selected IANA timezones', () => {
      const date = '2026-10-01T10:00:00.000Z';
      const formattedUTC = formatInTimezone(date, 'UTC', { hour: '2-digit', minute: '2-digit', hour12: false });
      expect(formattedUTC).toBe('10:00');

      const formattedNY = formatInTimezone(date, 'America/New_York', { hour: '2-digit', minute: '2-digit', hour12: false });
      expect(formattedNY).toBe('06:00');
    });

    it('expands daily recurring events across date ranges', () => {
      const recurringDaily: CalendarEvent = {
        ...baseEvent,
        id: 'evt-daily',
        recurrence_rule: {
          freq: 'DAILY',
          interval: 1
        }
      };

      const rangeStart = new Date('2026-10-01T00:00:00.000Z');
      const rangeEnd = new Date('2026-10-05T23:59:59.000Z');

      const expanded = expandRecurringEvents([recurringDaily], rangeStart, rangeEnd);
      expect(expanded.length).toBe(5);
      expect(expanded[0].id).toBe('evt-daily');
      expect(expanded[1].is_recurring_instance).toBe(true);
      expect(expanded[1].start_at).toBe('2026-10-02T10:00:00.000Z');
    });

    it('respects exceptions list when expanding recurring events', () => {
      const recurringWithException: CalendarEvent = {
        ...baseEvent,
        id: 'evt-exc',
        recurrence_rule: {
          freq: 'DAILY',
          interval: 1,
          exceptions: ['2026-10-03']
        }
      };

      const rangeStart = new Date('2026-10-01T00:00:00.000Z');
      const rangeEnd = new Date('2026-10-05T23:59:59.000Z');

      const expanded = expandRecurringEvents([recurringWithException], rangeStart, rangeEnd);
      expect(expanded.length).toBe(4);
      const dateStrings = expanded.map((e) => e.start_at.split('T')[0]);
      expect(dateStrings).not.toContain('2026-10-03');
    });

    it('expands weekday recurring events skipping Saturday and Sunday', () => {
      const recurringWeekdays: CalendarEvent = {
        ...baseEvent,
        id: 'evt-weekdays',
        start_at: '2026-10-02T10:00:00.000Z', // Friday
        end_at: '2026-10-02T11:00:00.000Z',
        recurrence_rule: {
          freq: 'WEEKDAYS',
          interval: 1
        }
      };

      const rangeStart = new Date('2026-10-02T00:00:00.000Z');
      const rangeEnd = new Date('2026-10-06T23:59:59.000Z'); // Through Tuesday

      const expanded = expandRecurringEvents([recurringWeekdays], rangeStart, rangeEnd);
      expect(expanded.length).toBe(3); // Fri Oct 2, Mon Oct 5, Tue Oct 6
      const days = expanded.map((e) => new Date(e.start_at).getDay());
      expect(days).toContain(5); // Friday
      expect(days).toContain(1); // Monday
      expect(days).toContain(2); // Tuesday
      expect(days).not.toContain(0); // No Sunday
      expect(days).not.toContain(6); // No Saturday
    });

    it('computes non-overlapping layout columns for simultaneous events', () => {
      const ev1: CalendarEvent = {
        ...baseEvent,
        id: 'ev-1',
        start_at: '2026-10-01T10:00:00.000Z',
        end_at: '2026-10-01T11:00:00.000Z'
      };
      const ev2: CalendarEvent = {
        ...baseEvent,
        id: 'ev-2',
        start_at: '2026-10-01T10:30:00.000Z',
        end_at: '2026-10-01T11:30:00.000Z'
      };

    });
  });

  describe('Interaction Engine & Drag/Resize Calculations (SF-057B)', () => {
    it('snaps minutes to configurable intervals', () => {
      expect(snapMinutesToInterval(7, 5)).toBe(5);
      expect(snapMinutesToInterval(8, 5)).toBe(10);
      expect(snapMinutesToInterval(14, 15)).toBe(15);
      expect(snapMinutesToInterval(22, 15)).toBe(15);
      expect(snapMinutesToInterval(23, 15)).toBe(30);
      expect(snapMinutesToInterval(44, 30)).toBe(30);
      expect(snapMinutesToInterval(46, 30)).toBe(60);
      expect(snapMinutesToInterval(50, 60)).toBe(60);
      expect(snapMinutesToInterval(1450, 15)).toBe(1440); // Max clamp
      expect(snapMinutesToInterval(-10, 15)).toBe(0); // Min clamp
    });

    it('calculates drag move on same day with 15m snapping', () => {
      const start = new Date('2026-10-01T10:00:00.000Z');
      const end = new Date('2026-10-01T11:00:00.000Z');
      const targetDay = new Date('2026-10-01T00:00:00.000Z');

      // Drag down by 30px (at 60px/hr, 30px = 30 minutes)
      const { newStart, newEnd } = calculateDragMove(start, end, targetDay, 30, 60, 15);
      expect(newStart.getUTCHours()).toBe(10);
      expect(newStart.getUTCMinutes()).toBe(30);
      expect(newEnd.getUTCHours()).toBe(11);
      expect(newEnd.getUTCMinutes()).toBe(30);
      // Duration preserved: 60 minutes
      expect(newEnd.getTime() - newStart.getTime()).toBe(60 * 60 * 1000);
    });

    it('calculates drag move across days to target day', () => {
      const start = new Date('2026-10-01T14:00:00.000Z');
      const end = new Date('2026-10-01T15:30:00.000Z'); // 90 min duration
      const targetDay = new Date('2026-10-03T00:00:00.000Z'); // Moved to Saturday

      const { newStart, newEnd } = calculateDragMove(start, end, targetDay, 0, 60, 15);
      expect(newStart.getUTCDate()).toBe(3);
      expect(newStart.getUTCHours()).toBe(14);
      expect(newStart.getUTCMinutes()).toBe(0);
      expect(newEnd.getUTCDate()).toBe(3);
      expect(newEnd.getUTCHours()).toBe(15);
      expect(newEnd.getUTCMinutes()).toBe(30);
      expect(newEnd.getTime() - newStart.getTime()).toBe(90 * 60 * 1000);
    });

    it('calculates resize from bottom edge expanding event duration', () => {
      const start = new Date('2026-10-01T10:00:00.000Z');
      const end = new Date('2026-10-01T11:00:00.000Z');

      // Drag bottom down by 30px (adds 30 mins)
      const { newStart, newEnd } = calculateResizeChange(start, end, 'bottom', 30, 60, 15);
      expect(newStart.getTime()).toBe(start.getTime()); // Start unchanged
      expect(newEnd.getUTCHours()).toBe(11);
      expect(newEnd.getUTCMinutes()).toBe(30);
      expect(newEnd.getTime() - newStart.getTime()).toBe(90 * 60 * 1000);
    });

    it('enforces minimum duration when resizing bottom edge upward past start', () => {
      const start = new Date('2026-10-01T10:00:00.000Z');
      const end = new Date('2026-10-01T11:00:00.000Z');

      // Drag bottom upward by 120px (would make end < start)
      const { newStart, newEnd } = calculateResizeChange(start, end, 'bottom', -120, 60, 15);
      expect(newStart.getTime()).toBe(start.getTime());
      // Minimum duration of 15m is enforced
      expect(newEnd.getTime() - newStart.getTime()).toBe(15 * 60 * 1000);
    });

    it('calculates resize from top edge changing start_at', () => {
      const start = new Date('2026-10-01T10:00:00.000Z');
      const end = new Date('2026-10-01T11:00:00.000Z');

      // Drag top down by 15px (moves start 15 mins later)
      const { newStart, newEnd } = calculateResizeChange(start, end, 'top', 15, 60, 15);
      expect(newEnd.getTime()).toBe(end.getTime()); // End unchanged
      expect(newStart.getUTCHours()).toBe(10);
      expect(newStart.getUTCMinutes()).toBe(15);
      expect(newEnd.getTime() - newStart.getTime()).toBe(45 * 60 * 1000);
    });

    it('enforces minimum duration when resizing top edge downward past end', () => {
      const start = new Date('2026-10-01T10:00:00.000Z');
      const end = new Date('2026-10-01T11:00:00.000Z');

      // Drag top downward by 120px (would make start > end)
      const { newStart, newEnd } = calculateResizeChange(start, end, 'top', 120, 60, 15);
      expect(newEnd.getTime()).toBe(end.getTime());
      // Minimum duration of 15m before end is enforced
      expect(newEnd.getTime() - newStart.getTime()).toBe(15 * 60 * 1000);
    });

    it('navigates dates correctly across all view modes', () => {
      const base = new Date('2026-10-15T12:00:00.000Z');

      // Day mode
      const nextDay = navigateDate(base, 'day', 'next');
      expect(nextDay.getDate()).toBe(16);
      const prevDay = navigateDate(base, 'day', 'prev');
      expect(prevDay.getDate()).toBe(14);

      // Week mode (7 days)
      const nextWeek = navigateDate(base, 'week', 'next');
      expect(nextWeek.getDate()).toBe(22);
      const prevWeek = navigateDate(base, 'week', 'prev');
      expect(prevWeek.getDate()).toBe(8);

      // Month mode (1 month)
      const nextMonth = navigateDate(base, 'month', 'next');
      expect(nextMonth.getMonth()).toBe(10); // November
      const prevMonth = navigateDate(base, 'month', 'prev');
      expect(prevMonth.getMonth()).toBe(8); // September
    });

    it('supports Monday-first week ranges and month grids', () => {
      const anchor = new Date('2026-10-14T12:00:00.000Z'); // Wednesday
      const weekMon = getWeekRange(anchor, true); // Monday start
      expect(weekMon.days[0].getDay()).toBe(1); // Monday
      expect(weekMon.days[6].getDay()).toBe(0); // Sunday

      const monthMon = getMonthGrid(anchor, true);
      expect(monthMon.days[0].getDay()).toBe(1); // Monday
    });

    it('expands recurring events and skips exception dates', () => {
      const recurringEvent: CalendarEvent = {
        ...baseEvent,
        recurrence_rule: {
          freq: 'DAILY',
          interval: 1,
          exceptions: ['2026-10-03']
        }
      };

      const rangeStart = new Date('2026-10-01T00:00:00.000Z');
      const rangeEnd = new Date('2026-10-05T23:59:59.000Z');
      const expanded = expandRecurringEvents([recurringEvent], rangeStart, rangeEnd);

      const dates = expanded.map((e) => e.start_at.split('T')[0]);
      expect(dates).toContain('2026-10-01');
      expect(dates).toContain('2026-10-02');
      expect(dates).not.toContain('2026-10-03'); // Exception date skipped!
      expect(dates).toContain('2026-10-04');
      expect(dates).toContain('2026-10-05');
    });

    it('validates multi-reminder configurations in schema', () => {
      const payload = {
        title: 'Sprint Kickoff with Alerts',
        start_at: '2026-10-01T10:00:00.000Z',
        end_at: '2026-10-01T11:00:00.000Z',
        reminders: [
          { type: 'notification', minutes_before: 15 },
          { type: 'audio_cue', minutes_before: 5 },
          { type: 'email', minutes_before: 1440 }
        ]
      };

      const result = createCalendarEventSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reminders?.length).toBe(3);
      }
    });
  });
});

