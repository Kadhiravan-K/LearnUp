import { CalendarEvent, CalendarViewMode, RecurrenceRule } from '../types/calendar';

export interface EventLayoutColumn {
  colIndex: number;
  totalCols: number;
}

export interface ExpandedCalendarEvent extends CalendarEvent {
  layout?: EventLayoutColumn;
}

export type SnapInterval = 5 | 10 | 15 | 30 | 60;
export type WeekStartDay = 'sunday' | 'monday';

/**
 * Snap total minutes from midnight (0..1440) or duration to nearest interval.
 */
export function snapMinutesToInterval(minutes: number, intervalMinutes: SnapInterval = 15): number {
  const safeInterval = Math.max(1, intervalMinutes);
  const snapped = Math.round(minutes / safeInterval) * safeInterval;
  return Math.max(0, Math.min(1440, snapped));
}

/**
 * Snap a timestamp to the nearest minute interval (e.g. 5m, 10m, 15m, 30m, 60m).
 */
export function snapToInterval(date: Date, intervalMinutes: SnapInterval = 15): Date {
  const ms = 1000 * 60 * intervalMinutes;
  return new Date(Math.round(date.getTime() / ms) * ms);
}

/**
 * Recurrence expansion engine.
 * Takes a list of events and expands any event with a recurrence_rule into virtual instances within [rangeStart, rangeEnd].
 */
export function expandRecurringEvents(
  events: CalendarEvent[],
  rangeStart: Date,
  rangeEnd: Date
): CalendarEvent[] {
  const result: CalendarEvent[] = [];

  for (const event of events) {
    if (!event.recurrence_rule) {
      const eventStart = new Date(event.start_at);
      const eventEnd = new Date(event.end_at);
      if (eventEnd >= rangeStart && eventStart <= rangeEnd) {
        result.push(event);
      }
      continue;
    }

    const rule: RecurrenceRule = event.recurrence_rule;
    const originalStart = new Date(event.start_at);
    const originalEnd = new Date(event.end_at);
    const durationMs = originalEnd.getTime() - originalStart.getTime();

    const interval = Math.max(1, rule.interval || 1);
    const until = rule.until ? new Date(rule.until) : new Date(rangeEnd.getTime() + 86400000 * 365);
    const effectiveEnd = until < rangeEnd ? until : rangeEnd;
    const exceptionsSet = new Set(rule.exceptions || []);

    let currentStart = new Date(originalStart);
    let count = 0;
    const maxCount = rule.count ?? 500;

    while (currentStart <= effectiveEnd && count < maxCount) {
      const currentEnd = new Date(currentStart.getTime() + durationMs);
      const isoDateString = currentStart.toISOString().split('T')[0];

      if (!exceptionsSet.has(isoDateString) && currentEnd >= rangeStart && currentStart <= effectiveEnd) {
        if (currentStart.getTime() === originalStart.getTime()) {
          result.push(event);
        } else {
          result.push({
            ...event,
            id: `${event.id}_rec_${currentStart.getTime()}`,
            start_at: currentStart.toISOString(),
            end_at: currentEnd.toISOString(),
            is_recurring_instance: true,
            original_start_at: event.start_at
          });
        }
      }

      count++;

      switch (rule.freq) {
        case 'DAILY':
          currentStart = new Date(currentStart.getTime() + interval * 86400000);
          break;

        case 'WEEKDAYS': {
          const next = new Date(currentStart);
          do {
            next.setDate(next.getDate() + 1);
          } while (next.getDay() === 0 || next.getDay() === 6);
          currentStart = next;
          break;
        }

        case 'WEEKLY':
        case 'BIWEEKLY': {
          const stepWeeks = rule.freq === 'BIWEEKLY' ? 2 : interval;
          currentStart = new Date(currentStart.getTime() + stepWeeks * 7 * 86400000);
          break;
        }

        case 'MONTHLY': {
          const next = new Date(currentStart);
          next.setMonth(next.getMonth() + interval);
          currentStart = next;
          break;
        }

        case 'YEARLY': {
          const next = new Date(currentStart);
          next.setFullYear(next.getFullYear() + interval);
          currentStart = next;
          break;
        }

        case 'CUSTOM':
        default:
          currentStart = new Date(currentStart.getTime() + interval * 86400000);
          break;
      }
    }
  }

  return result.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
}

/**
 * Computes non-overlapping horizontal layout columns for simultaneous events (Google Calendar layout).
 */
export function computeEventLayoutColumns(events: CalendarEvent[]): ExpandedCalendarEvent[] {
  if (events.length === 0) return [];

  const sorted = [...events].sort((a, b) => {
    const startDiff = new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
    if (startDiff !== 0) return startDiff;
    return (new Date(b.end_at).getTime() - new Date(b.start_at).getTime()) -
           (new Date(a.end_at).getTime() - new Date(a.start_at).getTime());
  });

  const columns: CalendarEvent[][] = [];
  const eventColMap = new Map<string, { colIndex: number; clusterEvents: CalendarEvent[] }>();

  let currentCluster: CalendarEvent[] = [];
  let clusterEnd = 0;

  for (const ev of sorted) {
    const evStart = new Date(ev.start_at).getTime();
    const evEnd = new Date(ev.end_at).getTime();

    if (currentCluster.length === 0 || evStart < clusterEnd) {
      currentCluster.push(ev);
      clusterEnd = Math.max(clusterEnd, evEnd);
    } else {
      assignColumnsToCluster(currentCluster, eventColMap);
      currentCluster = [ev];
      clusterEnd = evEnd;
    }
  }

  if (currentCluster.length > 0) {
    assignColumnsToCluster(currentCluster, eventColMap);
  }

  return sorted.map((ev) => {
    const info = eventColMap.get(ev.id);
    return {
      ...ev,
      layout: info ? { colIndex: info.colIndex, totalCols: info.clusterEvents.length } : { colIndex: 0, totalCols: 1 }
    };
  });
}

function assignColumnsToCluster(
  cluster: CalendarEvent[],
  eventColMap: Map<string, { colIndex: number; clusterEvents: CalendarEvent[] }>
) {
  const cols: CalendarEvent[][] = [];

  for (const ev of cluster) {
    const evStart = new Date(ev.start_at).getTime();
    let placed = false;

    for (let c = 0; c < cols.length; c++) {
      const lastInCol = cols[c][cols[c].length - 1];
      if (new Date(lastInCol.end_at).getTime() <= evStart) {
        cols[c].push(ev);
        eventColMap.set(ev.id, { colIndex: c, clusterEvents: cluster });
        placed = true;
        break;
      }
    }

    if (!placed) {
      cols.push([ev]);
      eventColMap.set(ev.id, { colIndex: cols.length - 1, clusterEvents: cluster });
    }
  }

  const maxCols = cols.length;
  for (const ev of cluster) {
    const info = eventColMap.get(ev.id);
    if (info) {
      info.clusterEvents = { length: maxCols } as any;
    }
  }
}

/**
 * Format helper for calendar display in any IANA timezone.
 */
export function formatInTimezone(date: Date | string, timeZone: string, options: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone }).format(d);
}

/**
 * Get date range for Week view given any anchor date and week start preference.
 */
export function getWeekRange(anchorDate: Date, startOnMonday: boolean = false): { start: Date; end: Date; days: Date[] } {
  const date = new Date(anchorDate);
  const day = date.getDay(); // 0 is Sunday, 1 is Monday...
  const diff = startOnMonday ? (day === 0 ? -6 : 1 - day) : -day;

  const start = new Date(date);
  start.setDate(date.getDate() + diff);
  start.setHours(0, 0, 0, 0);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end, days };
}

/**
 * Get date grid for Month view (42 slots: 6 weeks x 7 days) given any anchor date and week start preference.
 */
export function getMonthGrid(anchorDate: Date, startOnMonday: boolean = false): { start: Date; end: Date; days: Date[] } {
  const year = anchorDate.getFullYear();
  const month = anchorDate.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  const dayOfWeek = firstOfMonth.getDay();
  const diff = startOnMonday ? (dayOfWeek === 0 ? -6 : 1 - dayOfWeek) : -dayOfWeek;

  const start = new Date(firstOfMonth);
  start.setDate(firstOfMonth.getDate() + diff);
  start.setHours(0, 0, 0, 0);

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }

  const end = new Date(days[41]);
  end.setHours(23, 59, 59, 999);

  return { start, end, days };
}

/**
 * Navigate date forward or backward based on active view mode.
 */
export function navigateDate(currentDate: Date, viewMode: CalendarViewMode, direction: 'prev' | 'next'): Date {
  const next = new Date(currentDate);
  const sign = direction === 'next' ? 1 : -1;

  switch (viewMode) {
    case 'day':
      next.setDate(next.getDate() + sign);
      break;
    case 'week':
      next.setDate(next.getDate() + sign * 7);
      break;
    case 'month':
      next.setMonth(next.getMonth() + sign);
      break;
    case 'agenda':
    case 'schedule':
    default:
      next.setDate(next.getDate() + sign * 7);
      break;
  }

  return next;
}

/**
 * Calculate drag move timestamp given vertical pixel offset and target day.
 */
export function calculateDragMove(
  originalStart: Date,
  originalEnd: Date,
  targetDay: Date,
  pixelOffsetY: number,
  hourHeightPx: number = 60,
  snapInterval: SnapInterval = 15
): { newStart: Date; newEnd: Date } {
  const durationMs = originalEnd.getTime() - originalStart.getTime();

  // Convert pixel offset to delta minutes (hourHeightPx = 60 mins -> 1px = 60/hourHeightPx mins)
  const minutePerPx = 60 / hourHeightPx;
  const originalMinutesFromMidnight = originalStart.getHours() * 60 + originalStart.getMinutes();
  const rawTargetMinutes = originalMinutesFromMidnight + pixelOffsetY * minutePerPx;
  const snappedMinutes = snapMinutesToInterval(rawTargetMinutes, snapInterval);

  const newStart = new Date(targetDay);
  newStart.setHours(Math.floor(snappedMinutes / 60), snappedMinutes % 60, 0, 0);
  const newEnd = new Date(newStart.getTime() + durationMs);

  return { newStart, newEnd };
}

/**
 * Calculate resize change (top edge changes start_at, bottom edge changes end_at).
 */
export function calculateResizeChange(
  originalStart: Date,
  originalEnd: Date,
  edge: 'top' | 'bottom',
  pixelOffsetY: number,
  hourHeightPx: number = 60,
  snapInterval: SnapInterval = 15
): { newStart: Date; newEnd: Date } {
  const minutePerPx = 60 / hourHeightPx;
  const minDurationMs = snapInterval * 60 * 1000;

  if (edge === 'bottom') {
    const originalEndMinutes = originalEnd.getHours() * 60 + originalEnd.getMinutes();
    const rawTargetMinutes = originalEndMinutes + pixelOffsetY * minutePerPx;
    const snappedMinutes = snapMinutesToInterval(rawTargetMinutes, snapInterval);

    const newEnd = new Date(originalEnd);
    newEnd.setHours(Math.floor(snappedMinutes / 60), snappedMinutes % 60, 0, 0);

    // Enforce minimum duration and end > start
    if (newEnd.getTime() - originalStart.getTime() < minDurationMs) {
      return {
        newStart: originalStart,
        newEnd: new Date(originalStart.getTime() + minDurationMs)
      };
    }

    return { newStart: originalStart, newEnd };
  } else {
    // Top edge resize
    const originalStartMinutes = originalStart.getHours() * 60 + originalStart.getMinutes();
    const rawTargetMinutes = originalStartMinutes + pixelOffsetY * minutePerPx;
    const snappedMinutes = snapMinutesToInterval(rawTargetMinutes, snapInterval);

    const newStart = new Date(originalStart);
    newStart.setHours(Math.floor(snappedMinutes / 60), snappedMinutes % 60, 0, 0);

    // Enforce minimum duration and end > start
    if (originalEnd.getTime() - newStart.getTime() < minDurationMs) {
      return {
        newStart: new Date(originalEnd.getTime() - minDurationMs),
        newEnd: originalEnd
      };
    }

    return { newStart, newEnd: originalEnd };
  }
}
