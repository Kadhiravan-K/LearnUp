'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import styles from './calendar.module.css';
import {
  CalendarEvent,
  Calendar,
  CalendarCategory,
  CalendarViewMode,
  RecurrenceFrequency,
  CalendarEventReminder
} from '@/lib/types/calendar';
import {
  getWeekRange,
  getMonthGrid,
  computeEventLayoutColumns,
  formatInTimezone,
  calculateDragMove,
  calculateResizeChange,
  navigateDate,
  SnapInterval,
  WeekStartDay
} from '@/lib/services/calendar-service';

function toDatetimeLocalString(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

async function readApiData<T>(response: Response, fallbackMessage: string): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error?.message || fallbackMessage);
  }
  return body?.data as T;
}

export default function CalendarPage() {
  // Navigation & View Mode State
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [activeTimezone, setActiveTimezone] = useState<string>('UTC');
  const [snapInterval, setSnapInterval] = useState<SnapInterval>(15);
  const [weekStart, setWeekStart] = useState<WeekStartDay>('sunday');

  // Live Timer for Current Time Indicator
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Domain Data State
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [categories, setCategories] = useState<CalendarCategory[]>([]);
  const [learningItems, setLearningItems] = useState<Array<{ id: string; title: string }>>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Active Filter Set (Visible Calendars & Categories)
  const [visibleCalendarIds, setVisibleCalendarIds] = useState<Set<string>>(new Set());
  const [visibleCategoryIds, setVisibleCategoryIds] = useState<Set<string>>(new Set());

  // Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState<boolean>(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [isDuplicateMode, setIsDuplicateMode] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Confirmation State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Drag & Resize Active Interaction State
  const [dragState, setDragState] = useState<{
    eventId: string;
    originalStart: Date;
    originalEnd: Date;
    startY: number;
    startX: number;
    offsetY: number;
    targetDayIndex: number;
    hasMoved: boolean;
  } | null>(null);

  const [resizeState, setResizeState] = useState<{
    eventId: string;
    edge: 'top' | 'bottom';
    originalStart: Date;
    originalEnd: Date;
    startY: number;
    offsetY: number;
    hasMoved: boolean;
  } | null>(null);

  // Recurrence occurrence edit/delete state
  const [isRecurringInstance, setIsRecurringInstance] = useState<boolean>(false);
  const [occurrenceDate, setOccurrenceDate] = useState<string>('');
  const [recurrenceEditMode, setRecurrenceEditMode] = useState<'occurrence' | 'series'>('occurrence');
  const [recurrenceDeleteMode, setRecurrenceDeleteMode] = useState<'occurrence' | 'series'>('occurrence');

  // Google Calendar Sync State
  const [googleSyncState, setGoogleSyncState] = useState<{
    is_configured: boolean;
    is_connected: boolean;
    is_available: boolean;
    last_synced_at: string | null;
    message?: string;
  } | null>(null);
  const [isSyncingGoogle, setIsSyncingGoogle] = useState<boolean>(false);

  // Browser Notification Permission State
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default');
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    } else {
      setNotificationPermission('unsupported');
    }
  }, []);

  // Global Escape Key Listener for Accessible Modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCreateModalOpen(false);
        setDeleteConfirmId(null);
        setIsCalendarModalOpen(false);
        setIsCategoryModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Form State for Event Creation / Edit
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    description: '',
    calendar_id: '',
    category_id: '',
    learning_item_id: '',
    start_at: '',
    end_at: '',
    all_day: false,
    color_override: '#6366f1',
    recurrence_freq: 'NONE' as RecurrenceFrequency | 'NONE',
    recurrence_interval: 1,
    location: '',
    url: '',
    notes: '',
    reminders: [{ type: 'notification' as const, minutes_before: 15 }] as CalendarEventReminder[]
  });

  // Calendar & Category Creation Form State
  const [newCalendarName, setNewCalendarName] = useState('');
  const [newCalendarColor, setNewCalendarColor] = useState('#6366f1');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#10b981');

  // Study Session Focus HUD State
  const [activeStudySession, setActiveStudySession] = useState<{
    eventId: string;
    sessionId?: string;
    title: string;
    learningItemId?: string | null;
    plannedSeconds: number;
    elapsedSeconds: number;
    isRunning: boolean;
  } | null>(null);

  // Scroll reference to auto-scroll 24h timeline to current time
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Initialize Client Timezone
  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) setActiveTimezone(detected);
    } catch {
      setActiveTimezone('UTC');
    }
  }, []);

  // Compute Active Date Ranges
  const weekInfo = useMemo(() => getWeekRange(currentDate, weekStart === 'monday'), [currentDate, weekStart]);
  const monthInfo = useMemo(() => getMonthGrid(currentDate, weekStart === 'monday'), [currentDate, weekStart]);

  // Fetch Calendars, Categories, Learning Items, Events, and Google Sync Status
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [calRes, catRes, libRes] = await Promise.all([
        fetch('/api/calendar/calendars'),
        fetch('/api/calendar/categories'),
        fetch('/api/learning-items')
      ]);
      const queryStart = new Date(currentDate.getTime() - 45 * 86400000).toISOString();
      const queryEnd = new Date(currentDate.getTime() + 45 * 86400000).toISOString();
      const evRes = await fetch(`/api/calendar/events?start=${encodeURIComponent(queryStart)}&end=${encodeURIComponent(queryEnd)}`);

      const [calendarData, categoryData, libraryData, eventData] = await Promise.all([
        readApiData<Calendar[]>(calRes, 'Unable to load calendars.'),
        readApiData<CalendarCategory[]>(catRes, 'Unable to load event categories.'),
        readApiData<Array<{ id: string; title: string }>>(libRes, 'Unable to load your library courses.'),
        readApiData<CalendarEvent[]>(evRes, 'Unable to load calendar events.')
      ]);
      setCalendars(calendarData || []);
      setVisibleCalendarIds(new Set((calendarData || []).map((calendar) => calendar.id)));
      setCategories(categoryData || []);
      setVisibleCategoryIds(new Set((categoryData || []).map((category) => category.id)));
      setLearningItems(libraryData || []);
      setEvents(eventData || []);

      // 5. Fetch Google Calendar Sync Status
      try {
        const syncRes = await fetch('/api/calendar/sync/google');
        if (syncRes.ok) {
          const syncJson = await syncRes.json();
          setGoogleSyncState(syncJson.data || null);
        }
      } catch (syncError) {
        console.error('Failed to load Google Calendar connection status', syncError);
      }
    } catch (err) {
      console.error('Failed to load calendar data', err);
      setLoadError(err instanceof Error ? err.message : 'Failed to load calendar data. Try again.');
    } finally {
      setIsLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Trigger Google Calendar Sync
  const handleSyncGoogle = async () => {
    setIsSyncingGoogle(true);
    try {
      const res = await fetch('/api/calendar/sync/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' })
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error?.message || 'Google Calendar sync failed');
      } else {
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Google Calendar sync request error');
    } finally {
      setIsSyncingGoogle(false);
    }
  };

  // Browser Notification Permission Request
  const handleRequestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const res = await Notification.requestPermission();
      setNotificationPermission(res);
    }
  };

  // Auto-scroll timeline to working hours (08:00) on mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 8 * 60; // 480px = 08:00
    }
  }, [viewMode]);

  // Live Study Session Timer Ticker
  useEffect(() => {
    if (!activeStudySession || !activeStudySession.isRunning) return;

    const interval = setInterval(() => {
      setActiveStudySession((prev) => (prev ? { ...prev, elapsedSeconds: prev.elapsedSeconds + 1 } : null));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeStudySession]);

  // Filter events based on active sidebar checklists
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (ev.calendar_id && !visibleCalendarIds.has(ev.calendar_id)) return false;
      if (ev.category_id && !visibleCategoryIds.has(ev.category_id)) return false;
      return true;
    });
  }, [events, visibleCalendarIds, visibleCategoryIds]);

  // Open Edit Modal Helper
  const openEditModal = useCallback((event: CalendarEvent) => {
    setFormError(null);
    setIsDuplicateMode(false);
    const isVirtual = event.id.includes('_rec_') || Boolean(event.recurrence_parent_id);
    setIsRecurringInstance(isVirtual || Boolean(event.recurrence_rule));
    const evStart = new Date(event.start_at);
    const evEnd = new Date(event.end_at);
    const dateStr = event.start_at.split('T')[0];
    setOccurrenceDate(dateStr);
    setRecurrenceEditMode(isVirtual ? 'occurrence' : 'series');

    setFormData({
      id: event.id,
      title: event.title,
      description: event.description || '',
      calendar_id: event.calendar_id || calendars[0]?.id || '',
      category_id: event.category_id || categories[0]?.id || '',
      learning_item_id: event.learning_item_id || '',
      start_at: toDatetimeLocalString(evStart),
      end_at: toDatetimeLocalString(evEnd),
      all_day: event.all_day,
      color_override: event.color_override || '#6366f1',
      recurrence_freq: event.recurrence_rule?.freq || 'NONE',
      recurrence_interval: event.recurrence_rule?.interval || 1,
      location: event.location || '',
      url: event.url || '',
      notes: event.notes || '',
      reminders: event.reminders && event.reminders.length > 0
        ? event.reminders
        : [{ type: 'notification', minutes_before: 15 }]
    });
    setIsCreateModalOpen(true);
  }, [calendars, categories]);

  // Drag & Resize Mouse Move and Up Lifecycle Listeners
  useEffect(() => {
    if (!dragState && !resizeState) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (dragState) {
        const deltaY = e.clientY - dragState.startY;
        const deltaX = e.clientX - dragState.startX;
        const moved = dragState.hasMoved || Math.abs(deltaY) > 4 || Math.abs(deltaX) > 4;

        let targetIdx = dragState.targetDayIndex;
        if (viewMode === 'week') {
          const els = document.elementsFromPoint(e.clientX, e.clientY);
          for (const el of els) {
            const dayAttr = el.getAttribute('data-day-index');
            if (dayAttr !== null) {
              const parsed = parseInt(dayAttr, 10);
              if (!isNaN(parsed) && parsed >= 0 && parsed < 7) {
                targetIdx = parsed;
                break;
              }
            }
          }
        }

        setDragState((prev) => (prev ? { ...prev, offsetY: deltaY, targetDayIndex: targetIdx, hasMoved: moved } : null));
      } else if (resizeState) {
        const deltaY = e.clientY - resizeState.startY;
        const moved = resizeState.hasMoved || Math.abs(deltaY) > 4;
        setResizeState((prev) => (prev ? { ...prev, offsetY: deltaY, hasMoved: moved } : null));
      }
    };

    const handleMouseUp = async () => {
      if (dragState) {
        const { eventId, originalStart, originalEnd, offsetY, targetDayIndex, hasMoved } = dragState;
        setDragState(null);

        if (!hasMoved) {
          const ev = events.find((item) => item.id === eventId);
          if (ev) openEditModal(ev);
          return;
        }

        const targetDay = viewMode === 'week' ? weekInfo.days[targetDayIndex] : currentDate;
        const { newStart, newEnd } = calculateDragMove(originalStart, originalEnd, targetDay, offsetY, 60, snapInterval);

        // Optimistic update
        const prevEvents = [...events];
        setEvents((prev) =>
          prev.map((ev) =>
            ev.id === eventId
              ? { ...ev, start_at: newStart.toISOString(), end_at: newEnd.toISOString() }
              : ev
          )
        );

        try {
          const res = await fetch(`/api/calendar/events/${eventId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              start_at: newStart.toISOString(),
              end_at: newEnd.toISOString()
            })
          });
          const json = await res.json();
          if (!res.ok) {
            throw new Error(json.error?.message || 'Failed to move event');
          }
          setEvents((prev) => prev.map((ev) => (ev.id === json.data.id ? json.data : ev)));
        } catch (err: any) {
          console.error('Drag update error', err);
          setEvents(prevEvents); // Rollback on failure
          setFormError(err.message || 'Failed to move event');
        }
      } else if (resizeState) {
        const { eventId, edge, originalStart, originalEnd, offsetY, hasMoved } = resizeState;
        setResizeState(null);

        if (!hasMoved) {
          const ev = events.find((item) => item.id === eventId);
          if (ev) openEditModal(ev);
          return;
        }

        const { newStart, newEnd } = calculateResizeChange(originalStart, originalEnd, edge, offsetY, 60, snapInterval);

        // Optimistic update
        const prevEvents = [...events];
        setEvents((prev) =>
          prev.map((ev) =>
            ev.id === eventId
              ? { ...ev, start_at: newStart.toISOString(), end_at: newEnd.toISOString() }
              : ev
          )
        );

        try {
          const res = await fetch(`/api/calendar/events/${eventId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              start_at: newStart.toISOString(),
              end_at: newEnd.toISOString()
            })
          });
          const json = await res.json();
          if (!res.ok) {
            throw new Error(json.error?.message || 'Failed to resize event');
          }
          setEvents((prev) => prev.map((ev) => (ev.id === json.data.id ? json.data : ev)));
        } catch (err: any) {
          console.error('Resize update error', err);
          setEvents(prevEvents); // Rollback on failure
          setFormError(err.message || 'Failed to resize event');
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, resizeState, viewMode, weekInfo, currentDate, snapInterval, events, openEditModal]);

  // Initiate Drag or Resize on Pointer Down
  const handleEventMouseDown = (e: React.MouseEvent, event: CalendarEvent, dayIdx: number = 0) => {
    e.stopPropagation();
    if (e.button !== 0 || event.id.includes('_rec_')) return;

    const target = e.target as HTMLElement;
    const isTopResize = target.classList.contains(styles.resizeHandleTop);
    const isBottomResize = target.classList.contains(styles.resizeHandleBottom);

    const evStart = new Date(event.start_at);
    const evEnd = new Date(event.end_at);

    if (isTopResize) {
      setResizeState({
        eventId: event.id,
        edge: 'top',
        originalStart: evStart,
        originalEnd: evEnd,
        startY: e.clientY,
        offsetY: 0,
        hasMoved: false
      });
    } else if (isBottomResize) {
      setResizeState({
        eventId: event.id,
        edge: 'bottom',
        originalStart: evStart,
        originalEnd: evEnd,
        startY: e.clientY,
        offsetY: 0,
        hasMoved: false
      });
    } else {
      setDragState({
        eventId: event.id,
        originalStart: evStart,
        originalEnd: evEnd,
        startY: e.clientY,
        startX: e.clientX,
        offsetY: 0,
        targetDayIndex: dayIdx,
        hasMoved: false
      });
    }
  };

  // Navigation handlers
  const handlePrev = () => {
    setCurrentDate((prev) => navigateDate(prev, viewMode, 'prev'));
  };

  const handleNext = () => {
    setCurrentDate((prev) => navigateDate(prev, viewMode, 'next'));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Header Date Range Title
  const formattedRangeTitle = useMemo(() => {
    if (viewMode === 'day') {
      return formatInTimezone(currentDate, activeTimezone, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    }
    if (viewMode === 'month') {
      return formatInTimezone(currentDate, activeTimezone, {
        month: 'long',
        year: 'numeric'
      });
    }
    const startStr = formatInTimezone(weekInfo.start, activeTimezone, { month: 'short', day: 'numeric' });
    const endStr = formatInTimezone(weekInfo.end, activeTimezone, { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startStr} – ${endStr}`;
  }, [viewMode, currentDate, weekInfo, activeTimezone]);

  // Open Create Modal for a given date/hour or default rounded time
  const handleOpenCreateModal = (anchorDate?: Date, hour?: number) => {
    const base = anchorDate ? new Date(anchorDate) : new Date(currentDate);
    const start = new Date(base);
    if (hour !== undefined) {
      start.setHours(hour, 0, 0, 0);
    } else {
      const now = new Date();
      start.setHours(now.getHours(), Math.ceil(now.getMinutes() / 30) * 30, 0, 0);
    }
    const end = new Date(start.getTime() + 60 * 60000);

    setFormError(null);
    setIsDuplicateMode(false);
    setIsRecurringInstance(false);
    setOccurrenceDate('');
    setRecurrenceEditMode('series');
    setFormData({
      id: '',
      title: '',
      description: '',
      calendar_id: calendars.find((c) => c.is_default)?.id || calendars[0]?.id || '',
      category_id: categories.find((c) => c.is_default)?.id || categories[0]?.id || '',
      learning_item_id: '',
      start_at: toDatetimeLocalString(start),
      end_at: toDatetimeLocalString(end),
      all_day: false,
      color_override: '#6366f1',
      recurrence_freq: 'NONE',
      recurrence_interval: 1,
      location: '',
      url: '',
      notes: '',
      reminders: [{ type: 'notification', minutes_before: 15 }]
    });
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal for an existing event
  const handleEventClick = (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    openEditModal(event);
  };

  // Duplicate Event: copies data into form and clears ID
  const handleDuplicateEvent = () => {
    if (!formData.title) return;
    setFormData((prev) => ({
      ...prev,
      id: '',
      title: `${prev.title} (Copy)`
    }));
    setIsDuplicateMode(true);
    setFormError(null);
  };

  // Save Event (Create or Update)
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const titleTrimmed = formData.title.trim();
    if (!titleTrimmed) {
      setFormError('Title is required');
      return;
    }

    const startDate = new Date(formData.start_at);
    const endDate = new Date(formData.end_at);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      setFormError('Please enter a valid start and end date/time');
      return;
    }

    if (endDate.getTime() <= startDate.getTime()) {
      setFormError('End time must be after start time');
      return;
    }

    setIsSubmitting(true);

    const payload: any = {
      title: titleTrimmed,
      description: formData.description.trim() || null,
      calendar_id: formData.calendar_id || null,
      category_id: formData.category_id || null,
      learning_item_id: formData.learning_item_id || null,
      start_at: startDate.toISOString(),
      end_at: endDate.toISOString(),
      all_day: formData.all_day,
      color_override: formData.color_override || null,
      location: formData.location.trim() || null,
      url: formData.url.trim() || null,
      notes: formData.notes.trim() || null,
      timezone: activeTimezone,
      recurrence_rule:
        formData.recurrence_freq !== 'NONE'
          ? {
              freq: formData.recurrence_freq,
              interval: formData.recurrence_interval
            }
          : null,
      reminders: formData.reminders
    };

    try {
      if (formData.id) {
        const baseId = formData.id.split('_rec_')[0];
        if (isRecurringInstance && recurrenceEditMode === 'occurrence') {
          // Update single occurrence only
          const res = await fetch(`/api/calendar/events/${baseId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'edit_occurrence',
              occurrence_date: occurrenceDate,
              start_at: startDate.toISOString(),
              end_at: endDate.toISOString(),
              title: titleTrimmed,
              description: formData.description.trim() || null,
              color_override: formData.color_override || null,
              location: formData.location.trim() || null,
              url: formData.url.trim() || null,
              notes: formData.notes.trim() || null,
              reminders: formData.reminders
            })
          });
          const json = await res.json();
          if (!res.ok) {
            throw new Error(json.error?.message || 'Failed to update occurrence');
          }
          await fetchData();
        } else {
          // Update whole series or single event
          const res = await fetch(`/api/calendar/events/${baseId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const json = await res.json();
          if (!res.ok) {
            throw new Error(json.error?.message || 'Failed to update event');
          }
          await fetchData();
        }
      } else {
        // Create new event
        const res = await fetch('/api/calendar/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error?.message || 'Failed to create event');
        }
        await fetchData();
      }

      setIsCreateModalOpen(false);
      setIsDuplicateMode(false);
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while saving the event');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Delete Confirmation Dialog
  const handleOpenDeleteConfirm = () => {
    if (!formData.id) return;
    const baseId = formData.id.split('_rec_')[0];
    const isVirtual = formData.id.includes('_rec_') || isRecurringInstance;
    setDeleteConfirmId(baseId);
    setDeleteConfirmTitle(formData.title);
    setRecurrenceDeleteMode(isVirtual ? 'occurrence' : 'series');
  };

  // Execute Event Deletion
  const handleExecuteDelete = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    try {
      const url =
        isRecurringInstance && recurrenceDeleteMode === 'occurrence' && occurrenceDate
          ? `/api/calendar/events/${deleteConfirmId}?action=delete_occurrence&date=${encodeURIComponent(occurrenceDate)}`
          : `/api/calendar/events/${deleteConfirmId}`;

      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || 'Failed to delete event');
      }
      await fetchData();
      setDeleteConfirmId(null);
      setIsCreateModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to delete event');
    } finally {
      setIsDeleting(false);
    }
  };

  // Start Live Study Session Tracker
  const handleStartStudySession = async (event: CalendarEvent) => {
    try {
      const res = await fetch('/api/calendar/study-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: event.id.split('_rec_')[0],
          learning_item_id: event.learning_item_id || null,
          planned_duration_seconds: 1800
        })
      });
      const data = res.ok ? await res.json() : null;
      setActiveStudySession({
        eventId: event.id,
        sessionId: data?.data?.id,
        title: event.title,
        learningItemId: event.learning_item_id,
        plannedSeconds: 1800,
        elapsedSeconds: 0,
        isRunning: true
      });
      setIsCreateModalOpen(false);
    } catch (err) {
      console.error('Failed to start study session', err);
    }
  };

  // Finish Live Study Session Tracker
  const handleFinishStudySession = async () => {
    if (!activeStudySession) return;
    try {
      if (activeStudySession.sessionId) {
        await fetch('/api/calendar/study-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update',
            session_id: activeStudySession.sessionId,
            actual_duration_seconds: activeStudySession.elapsedSeconds,
            ended: true
          })
        });
      }
      setActiveStudySession(null);
      fetchData();
    } catch (err) {
      console.error('Failed to finish study session', err);
    }
  };

  // Create Custom Calendar
  const handleCreateCalendar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCalendarName.trim()) return;
    try {
      const res = await fetch('/api/calendar/calendars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCalendarName.trim(), color: newCalendarColor })
      });
      const data = await readApiData<Calendar>(res, 'Failed to create calendar.');
      setCalendars((prev) => [...prev, data]);
      setVisibleCalendarIds((prev) => new Set([...prev, data.id]));
      setNewCalendarName('');
      setIsCalendarModalOpen(false);
    } catch (err) {
      console.error('Failed to create calendar', err);
      setLoadError(err instanceof Error ? err.message : 'Failed to create calendar.');
    }
  };

  // Create Category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const res = await fetch('/api/calendar/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim(), color: newCategoryColor })
      });
      const data = await readApiData<CalendarCategory>(res, 'Failed to create event category.');
      setCategories((prev) => [...prev, data]);
      setVisibleCategoryIds((prev) => new Set([...prev, data.id]));
      setNewCategoryName('');
      setIsCategoryModalOpen(false);
    } catch (err) {
      console.error('Failed to create category', err);
      setLoadError(err instanceof Error ? err.message : 'Failed to create event category.');
    }
  };

  // Current Time Line Percentage in 24h
  const currentMinutesFromMidnight = now.getHours() * 60 + now.getMinutes();
  const currentTimeTopPercent = (currentMinutesFromMidnight / 1440) * 100;

  // Study Velocity Calculation for Today
  const todayPlannedMinutes = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return filteredEvents
      .filter((ev) => ev.start_at.startsWith(todayStr))
      .reduce((acc, ev) => {
        const diffMs = new Date(ev.end_at).getTime() - new Date(ev.start_at).getTime();
        return acc + Math.round(diffMs / 60000);
      }, 0);
  }, [filteredEvents]);

  const todayActualMinutes = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return filteredEvents
      .filter((ev) => ev.start_at.startsWith(todayStr))
      .reduce((acc, ev) => acc + Math.round((ev.actual_duration_seconds || 0) / 60), 0);
  }, [filteredEvents]);

  return (
    <div className={styles.container}>
      {/* Header Bar */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div>
            <div className={styles.breadcrumb}>
              <span>Workspace</span>
              <span>/</span>
              <span>Planner</span>
              <span>/</span>
              <span style={{ color: 'var(--sf-accent-primary)', fontWeight: 600 }}>Study Calendar</span>
            </div>
            <div className={styles.titleRow}>
              <h1 className={styles.dateRangeTitle}>{formattedRangeTitle}</h1>
              <div className={styles.navControls}>
                <button type="button" className={styles.todayBtn} onClick={handleToday}>
                  Today
                </button>
                <button type="button" className={styles.navArrowBtn} onClick={handlePrev} aria-label="Previous">
                  ‹
                </button>
                <button type="button" className={styles.navArrowBtn} onClick={handleNext} aria-label="Next">
                  ›
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.headerActions}>
          {/* 5 View Mode Toggles */}
          <div className={styles.viewButtonGroup}>
            {(['day', 'week', 'month', 'agenda', 'schedule'] as CalendarViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`${styles.viewBtn} ${viewMode === mode ? styles.viewBtnActive : ''}`}
                onClick={() => setViewMode(mode)}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          {/* Week Start Day Preference Toggle */}
          <button
            type="button"
            className={styles.weekStartToggle}
            onClick={() => setWeekStart((prev) => (prev === 'sunday' ? 'monday' : 'sunday'))}
            title={`Week starts on ${weekStart === 'sunday' ? 'Sunday' : 'Monday'} (click to change)`}
          >
            <span>Starts:</span>
            <span style={{ color: 'var(--sf-accent-primary)' }}>{weekStart === 'sunday' ? 'Sun' : 'Mon'}</span>
          </button>

          {/* Time Snap Interval Selector */}
          <select
            className={styles.snapSelect}
            value={snapInterval}
            onChange={(e) => setSnapInterval(Number(e.target.value) as SnapInterval)}
            title="Time grid snapping interval"
          >
            <option value={5}>Snap: 5m</option>
            <option value={10}>Snap: 10m</option>
            <option value={15}>Snap: 15m</option>
            <option value={30}>Snap: 30m</option>
            <option value={60}>Snap: 60m</option>
          </select>

          {/* Timezone Selector */}
          <select
            className={styles.timezoneSelect}
            value={activeTimezone}
            onChange={(e) => setActiveTimezone(e.target.value)}
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">New York (EDT/EST)</option>
            <option value="America/Los_Angeles">Los Angeles (PDT/PST)</option>
            <option value="Europe/London">London (BST/GMT)</option>
            <option value="Europe/Paris">Paris (CEST/CET)</option>
            <option value="Asia/Kolkata">Kolkata (IST)</option>
            <option value="Asia/Tokyo">Tokyo (JST)</option>
            <option value="Australia/Sydney">Sydney (AEST)</option>
          </select>

          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => handleOpenCreateModal()}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Event</span>
          </button>
        </div>
      </header>

      {loadError && (
        <div className={styles.dataError} role="alert">
          <span>{loadError}</span>
          <button type="button" className={styles.todayBtn} onClick={fetchData}>
            Retry
          </button>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className={styles.workspaceLayout}>
        {/* Left Sidebar */}
        <aside className={styles.sidebar}>
          {/* Mini Calendar Picker */}
          <div className={styles.sidebarCard}>
            <div className={styles.miniCalHeader}>
              <span>{formatInTimezone(currentDate, activeTimezone, { month: 'long', year: 'numeric' })}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button type="button" className={styles.navArrowBtn} style={{ width: 24, height: 24 }} onClick={handlePrev}>
                  ‹
                </button>
                <button type="button" className={styles.navArrowBtn} style={{ width: 24, height: 24 }} onClick={handleNext}>
                  ›
                </button>
              </div>
            </div>
            <div className={styles.miniCalGrid}>
              {(weekStart === 'monday'
                ? ['M', 'T', 'W', 'T', 'F', 'S', 'S']
                : ['S', 'M', 'T', 'W', 'T', 'F', 'S']
              ).map((d, i) => (
                <div key={i} className={styles.miniCalDayHeader}>
                  {d}
                </div>
              ))}
              {monthInfo.days.map((d, i) => {
                const isSelected = d.toDateString() === currentDate.toDateString();
                const isToday = d.toDateString() === new Date().toDateString();
                const isOutside = d.getMonth() !== currentDate.getMonth();

                return (
                  <button
                    key={i}
                    type="button"
                    className={`${styles.miniCalCell} ${isOutside ? styles.miniCalCellOutside : ''} ${
                      isToday ? styles.miniCalCellToday : ''
                    } ${isSelected ? styles.miniCalCellActive : ''}`}
                    onClick={() => setCurrentDate(d)}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Calendars List */}
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarCardTitle}>
              <span>My Calendars</span>
              <button
                type="button"
                className={styles.sidebarAddBtn}
                onClick={() => setIsCalendarModalOpen(true)}
              >
                + Add
              </button>
            </div>
            <div className={styles.filterList}>
              {calendars.length === 0 ? (
                <div style={{ fontSize: '0.75rem', color: 'var(--sf-text-muted)' }}>Default Calendar</div>
              ) : (
                calendars.map((cal) => (
                  <label key={cal.id} className={styles.filterItem}>
                    <div className={styles.filterItemLeft}>
                      <span className={styles.colorDot} style={{ background: cal.color }} />
                      <span>{cal.name}</span>
                    </div>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={visibleCalendarIds.has(cal.id)}
                      onChange={(e) => {
                        const next = new Set(visibleCalendarIds);
                        if (e.target.checked) next.add(cal.id);
                        else next.delete(cal.id);
                        setVisibleCalendarIds(next);
                      }}
                    />
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Categories List */}
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarCardTitle}>
              <span>Categories</span>
              <button
                type="button"
                className={styles.sidebarAddBtn}
                onClick={() => setIsCategoryModalOpen(true)}
              >
                + Add
              </button>
            </div>
            <div className={styles.filterList}>
              {categories.length === 0 ? (
                <div style={{ fontSize: '0.75rem', color: 'var(--sf-text-muted)' }}>Study, Review, Milestone</div>
              ) : (
                categories.map((cat) => (
                  <label key={cat.id} className={styles.filterItem}>
                    <div className={styles.filterItemLeft}>
                      <span className={styles.colorDot} style={{ background: cat.color }} />
                      <span>{cat.name}</span>
                    </div>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={visibleCategoryIds.has(cat.id)}
                      onChange={(e) => {
                        const next = new Set(visibleCategoryIds);
                        if (e.target.checked) next.add(cat.id);
                        else next.delete(cat.id);
                        setVisibleCategoryIds(next);
                      }}
                    />
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Study Velocity Telemetry Card */}
          <div className={styles.velocityCard}>
            <div className={styles.sidebarCardTitle}>
              <span>Today&apos;s Study Pace</span>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--sf-text-primary)' }}>
              {Math.round((todayActualMinutes / 60) * 10) / 10}h{' '}
              <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--sf-text-secondary)' }}>
                / {Math.round((todayPlannedMinutes / 60) * 10) / 10}h planned
              </span>
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{
                  width: `${todayPlannedMinutes > 0 ? Math.min(100, Math.round((todayActualMinutes / todayPlannedMinutes) * 100)) : 0}%`
                }}
              />
            </div>
          </div>

          {/* Google Calendar Sync Widget */}
          <div className={styles.googleSyncCard}>
            <div className={styles.sidebarCardTitle}>
              <span>Google Calendar</span>
              <span style={{ fontSize: '0.6875rem', color: googleSyncState?.is_connected ? '#10b981' : 'var(--sf-text-muted)' }}>
                {googleSyncState?.is_connected ? '● Connected' : '○ Not Linked'}
              </span>
            </div>
            <div className={styles.googleSyncStatus}>
              {!googleSyncState?.is_available ? (
                <span style={{ fontSize: '0.75rem', color: 'var(--sf-text-muted)' }}>
                  {googleSyncState?.message || 'Google Calendar sync is not available yet. Your LearnUp calendar remains available.'}
                </span>
              ) : googleSyncState.is_connected ? (
                <span style={{ fontSize: '0.75rem', color: 'var(--sf-text-secondary)' }}>
                  Last sync: {googleSyncState.last_synced_at ? new Date(googleSyncState.last_synced_at).toLocaleTimeString() : 'Never'}
                </span>
              ) : (
                <span style={{ fontSize: '0.75rem', color: 'var(--sf-text-secondary)' }}>
                  Connect your Google Calendar to synchronize study sprints bi-directionally.
                </span>
              )}
            </div>
            <button
              type="button"
              className={styles.syncBtn}
              disabled={isSyncingGoogle || !googleSyncState?.is_available}
              onClick={handleSyncGoogle}
            >
              {isSyncingGoogle ? 'Syncing...' : googleSyncState?.is_available
                ? googleSyncState.is_connected ? '🔄 Sync Now' : '🔗 Connect Google Calendar'
                : 'Google sync unavailable'}
            </button>
          </div>
        </aside>

        {/* Main Calendar View Area */}
        <main className={styles.mainCalendarArea}>
          {/* 1. WEEK VIEW */}
          {viewMode === 'week' && (
            <div className={styles.weekContainer}>
              <div className={styles.weekHeader}>
                <div className={styles.weekHeaderCell} style={{ justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--sf-text-muted)' }}>24H</span>
                </div>
                {weekInfo.days.map((day, dayIdx) => {
                  const isToday = day.toDateString() === new Date().toDateString();
                  return (
                    <div key={dayIdx} className={`${styles.weekHeaderCell} ${isToday ? styles.dayToday : ''}`}>
                      <span className={styles.dayName}>
                        {formatInTimezone(day, activeTimezone, { weekday: 'short' })}
                      </span>
                      <span className={styles.dayNumber}>{day.getDate()}</span>
                    </div>
                  );
                })}
              </div>

              <div className={styles.timeGridScroll} ref={scrollContainerRef}>
                <div className={styles.timeGridBody}>
                  {/* Time Labels (00:00 to 23:00) */}
                  <div className={styles.timeLabelsCol}>
                    {Array.from({ length: 24 }).map((_, hour) => (
                      <div key={hour} className={styles.hourLabel}>
                        {hour.toString().padStart(2, '0')}:00
                      </div>
                    ))}
                  </div>

                  {/* 7 Day Columns */}
                  {weekInfo.days.map((day, dayIdx) => {
                    const isToday = day.toDateString() === new Date().toDateString();
                    const dayStartIso = new Date(day.getFullYear(), day.getMonth(), day.getDate()).toISOString();
                    const dayEndIso = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59).toISOString();

                    // Find events for this day
                    const dayEvents = filteredEvents.filter((ev) => {
                      const evStart = new Date(ev.start_at);
                      const evEnd = new Date(ev.end_at);
                      return evStart <= new Date(dayEndIso) && evEnd >= new Date(dayStartIso);
                    });

                    // If an event is being dragged to this day column, include it in rendering
                    const isDragTarget = dragState?.hasMoved && dragState.targetDayIndex === dayIdx;
                    const draggedEv = (dragState?.hasMoved && events.find((e) => e.id === dragState.eventId)) || null;
                    const effectiveEvents = [...dayEvents];
                    if (isDragTarget && draggedEv && !effectiveEvents.some((e) => e.id === draggedEv.id)) {
                      effectiveEvents.push(draggedEv);
                    }

                    const layoutEvents = computeEventLayoutColumns(effectiveEvents);

                    return (
                      <div
                        key={dayIdx}
                        className={`${styles.dayColumn} ${isDragTarget ? styles.dayColumnHighlight : ''}`}
                        data-day-index={dayIdx}
                      >
                        {/* 24 Hour Slots */}
                        {Array.from({ length: 24 }).map((_, hour) => (
                          <div
                            key={hour}
                            className={`${styles.hourSlot} ${hour >= 8 && hour < 20 ? styles.workingHours : ''}`}
                            onClick={() => handleOpenCreateModal(day, hour)}
                          />
                        ))}

                        {/* Live Current Time Indicator */}
                        {isToday && (
                          <div
                            className={styles.currentTimeIndicator}
                            style={{ top: `${currentTimeTopPercent}%` }}
                          />
                        )}

                        {/* Event Blocks */}
                        {layoutEvents.map((ev) => {
                          const isDragging = dragState?.eventId === ev.id && dragState.hasMoved;
                          const isResizing = resizeState?.eventId === ev.id && resizeState.hasMoved;

                          let evStart = new Date(ev.start_at);
                          let evEnd = new Date(ev.end_at);

                          if (isDragging) {
                            if (dragState.targetDayIndex !== dayIdx) return null;
                            const targetDay = weekInfo.days[dragState.targetDayIndex];
                            const moved = calculateDragMove(dragState.originalStart, dragState.originalEnd, targetDay, dragState.offsetY, 60, snapInterval);
                            evStart = moved.newStart;
                            evEnd = moved.newEnd;
                          } else if (isResizing) {
                            const resized = calculateResizeChange(resizeState.originalStart, resizeState.originalEnd, resizeState.edge, resizeState.offsetY, 60, snapInterval);
                            evStart = resized.newStart;
                            evEnd = resized.newEnd;
                          }

                          const startMinutes = evStart.getHours() * 60 + evStart.getMinutes();
                          const durationMinutes = Math.max(15, Math.round((evEnd.getTime() - evStart.getTime()) / 60000));

                          const topPx = (startMinutes / 1440) * 1440;
                          const heightPx = (durationMinutes / 1440) * 1440;

                          const totalCols = ev.layout?.totalCols || 1;
                          const colIndex = ev.layout?.colIndex || 0;
                          const widthPercent = 100 / totalCols;
                          const leftPercent = colIndex * widthPercent;

                          const eventColor = ev.color_override || ev.category?.color || ev.calendar?.color || '#6366f1';

                          return (
                            <div
                              key={ev.id}
                              className={`${styles.eventBlock} ${isDragging ? styles.eventBlockDragging : ''} ${isResizing ? styles.eventBlockResizing : ''}`}
                              style={{
                                top: `${topPx}px`,
                                height: `${heightPx}px`,
                                left: `calc(${leftPercent}% + 2px)`,
                                width: `calc(${widthPercent}% - 4px)`,
                                backgroundColor: `${eventColor}18`,
                                borderLeftColor: eventColor,
                                color: eventColor
                              }}
                              onMouseDown={(e) => handleEventMouseDown(e, ev, dayIdx)}
                            >
                              <div className={styles.resizeHandleTop} title="Resize start time" />
                              <div>
                                <div className={styles.eventTitle} style={{ color: 'var(--sf-text-primary)' }}>
                                  {ev.title}
                                </div>
                                <div className={styles.eventTime}>
                                  {formatInTimezone(evStart, activeTimezone, { hour: '2-digit', minute: '2-digit' })} –{' '}
                                  {formatInTimezone(evEnd, activeTimezone, { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                              {ev.learning_item && (
                                <a
                                  href={`/library/${ev.learning_item.id}`}
                                  className={styles.learningItemLink}
                                  onClick={(e) => e.stopPropagation()}
                                  title={`Open ${ev.learning_item.title}`}
                                >
                                  📚 {ev.learning_item.title} ↗
                                </a>
                              )}
                              <div className={styles.resizeHandleBottom} title="Resize end time" />
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 2. DAY VIEW */}
          {viewMode === 'day' && (
            <div className={styles.weekContainer}>
              <div className={styles.weekHeader} style={{ gridTemplateColumns: '60px 1fr' }}>
                <div className={styles.weekHeaderCell} style={{ justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--sf-text-muted)' }}>24H</span>
                </div>
                <div className={`${styles.weekHeaderCell} styles.dayToday`}>
                  <span className={styles.dayName}>
                    {formatInTimezone(currentDate, activeTimezone, { weekday: 'long' })}
                  </span>
                  <span className={styles.dayNumber}>{currentDate.getDate()}</span>
                </div>
              </div>

              <div className={styles.timeGridScroll} ref={scrollContainerRef}>
                <div className={styles.timeGridBody} style={{ gridTemplateColumns: '60px 1fr' }}>
                  <div className={styles.timeLabelsCol}>
                    {Array.from({ length: 24 }).map((_, hour) => (
                      <div key={hour} className={styles.hourLabel}>
                        {hour.toString().padStart(2, '0')}:00
                      </div>
                    ))}
                  </div>

                  <div className={styles.dayColumn} data-day-index={0}>
                    {Array.from({ length: 24 }).map((_, hour) => (
                      <div
                        key={hour}
                        className={`${styles.hourSlot} ${hour >= 8 && hour < 20 ? styles.workingHours : ''}`}
                        onClick={() => handleOpenCreateModal(currentDate, hour)}
                      />
                    ))}

                    {currentDate.toDateString() === new Date().toDateString() && (
                      <div
                        className={styles.currentTimeIndicator}
                        style={{ top: `${currentTimeTopPercent}%` }}
                      />
                    )}

                    {computeEventLayoutColumns(
                      filteredEvents.filter((ev) => {
                        const evStart = new Date(ev.start_at);
                        return evStart.toDateString() === currentDate.toDateString();
                      })
                    ).map((ev) => {
                      const isDragging = dragState?.eventId === ev.id && dragState.hasMoved;
                      const isResizing = resizeState?.eventId === ev.id && resizeState.hasMoved;

                      let evStart = new Date(ev.start_at);
                      let evEnd = new Date(ev.end_at);

                      if (isDragging) {
                        const moved = calculateDragMove(dragState.originalStart, dragState.originalEnd, currentDate, dragState.offsetY, 60, snapInterval);
                        evStart = moved.newStart;
                        evEnd = moved.newEnd;
                      } else if (isResizing) {
                        const resized = calculateResizeChange(resizeState.originalStart, resizeState.originalEnd, resizeState.edge, resizeState.offsetY, 60, snapInterval);
                        evStart = resized.newStart;
                        evEnd = resized.newEnd;
                      }

                      const startMinutes = evStart.getHours() * 60 + evStart.getMinutes();
                      const durationMinutes = Math.max(15, Math.round((evEnd.getTime() - evStart.getTime()) / 60000));
                      const topPx = (startMinutes / 1440) * 1440;
                      const heightPx = (durationMinutes / 1440) * 1440;
                      const eventColor = ev.color_override || ev.category?.color || ev.calendar?.color || '#6366f1';

                      return (
                        <div
                          key={ev.id}
                          className={`${styles.eventBlock} ${isDragging ? styles.eventBlockDragging : ''} ${isResizing ? styles.eventBlockResizing : ''}`}
                          style={{
                            top: `${topPx}px`,
                            height: `${heightPx}px`,
                            left: '8px',
                            right: '8px',
                            backgroundColor: `${eventColor}18`,
                            borderLeftColor: eventColor,
                            color: eventColor
                          }}
                          onMouseDown={(e) => handleEventMouseDown(e, ev, 0)}
                        >
                          <div className={styles.resizeHandleTop} title="Resize start time" />
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className={styles.eventTitle} style={{ color: 'var(--sf-text-primary)', fontSize: '0.875rem' }}>
                              {ev.title}
                            </div>
                            <div className={styles.eventTime}>
                              {formatInTimezone(evStart, activeTimezone, { hour: '2-digit', minute: '2-digit' })} –{' '}
                              {formatInTimezone(evEnd, activeTimezone, { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          {ev.learning_item && (
                            <div style={{ marginTop: 4 }}>
                              <a
                                href={`/library/${ev.learning_item.id}`}
                                className={styles.learningItemLink}
                                onClick={(e) => e.stopPropagation()}
                                title={`Open ${ev.learning_item.title}`}
                              >
                                📚 {ev.learning_item.title} ↗
                              </a>
                            </div>
                          )}
                          {ev.description && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--sf-text-secondary)', marginTop: 4 }}>
                              {ev.description}
                            </div>
                          )}
                          <div className={styles.resizeHandleBottom} title="Resize end time" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. MONTH VIEW */}
          {viewMode === 'month' && (
            <div className={styles.monthGrid}>
              {(weekStart === 'monday'
                ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
              ).map((d) => (
                <div key={d} className={styles.monthDayHeader}>
                  {d}
                </div>
              ))}
              {monthInfo.days.map((day, i) => {
                const isToday = day.toDateString() === new Date().toDateString();
                const isOutside = day.getMonth() !== currentDate.getMonth();
                const dayIsoPrefix = day.toISOString().split('T')[0];
                const dayEvents = filteredEvents.filter((ev) => ev.start_at.startsWith(dayIsoPrefix));

                return (
                  <div
                    key={i}
                    className={`${styles.monthCell} ${isOutside ? styles.monthCellOutside : ''} ${
                      isToday ? styles.monthCellToday : ''
                    }`}
                    onClick={() => handleOpenCreateModal(day, 9)}
                  >
                    <div className={styles.monthCellHeader}>
                      <span className={styles.monthCellNumber}>{day.getDate()}</span>
                      {dayEvents.length > 0 && (
                        <span style={{ fontSize: '0.6875rem', color: 'var(--sf-text-muted)' }}>
                          {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
                        </span>
                      )}
                    </div>
                    {dayEvents.slice(0, 3).map((ev) => {
                      const color = ev.color_override || ev.category?.color || ev.calendar?.color || '#6366f1';
                      return (
                        <div
                          key={ev.id}
                          className={styles.monthEventChip}
                          style={{ background: `${color}20`, color, borderLeft: `3px solid ${color}` }}
                          onClick={(e) => handleEventClick(e, ev)}
                        >
                          {ev.title}
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <span style={{ fontSize: '0.625rem', color: 'var(--sf-text-muted)', paddingLeft: 4 }}>
                        +{dayEvents.length - 3} more
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 4. AGENDA VIEW */}
          {viewMode === 'agenda' && (
            <div className={styles.agendaContainer}>
              {filteredEvents.length === 0 ? (
                <div className={styles.emptyState}>
                  <div style={{ fontSize: '2rem' }}>📅</div>
                  <h3>No events scheduled</h3>
                  <p>Click &quot;Add Event&quot; to plan your next study sprint or milestone.</p>
                </div>
              ) : (
                filteredEvents.map((ev) => {
                  const color = ev.color_override || ev.category?.color || ev.calendar?.color || '#6366f1';
                  return (
                    <div
                      key={ev.id}
                      className={styles.agendaItem}
                      onClick={(e) => handleEventClick(e, ev)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span className={styles.colorDot} style={{ background: color, width: 12, height: 12 }} />
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--sf-text-primary)' }}>{ev.title}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--sf-text-secondary)' }}>
                            {formatInTimezone(ev.start_at, activeTimezone, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            })}{' '}
                            • {formatInTimezone(ev.start_at, activeTimezone, { hour: '2-digit', minute: '2-digit' })} –{' '}
                            {formatInTimezone(ev.end_at, activeTimezone, { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {ev.learning_item && (
                          <a
                            href={`/library/${ev.learning_item.id}`}
                            className={styles.learningItemLink}
                            onClick={(e) => e.stopPropagation()}
                            title={`Open ${ev.learning_item.title}`}
                          >
                            📚 {ev.learning_item.title} ↗
                          </a>
                        )}
                        <button
                          type="button"
                          className={styles.btnSecondary}
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartStudySession(ev);
                          }}
                        >
                          ▶ Focus
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* 5. SCHEDULE VIEW */}
          {viewMode === 'schedule' && (
            <div className={styles.agendaContainer}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 700 }}>Upcoming Study Schedule</h3>
              {filteredEvents.length === 0 ? (
                <div className={styles.emptyState}>
                  <div style={{ fontSize: '2rem' }}>⏱️</div>
                  <h3>No schedule blocks available</h3>
                  <p>Add study events to visualize your schedule progression.</p>
                </div>
              ) : (
                filteredEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className={styles.agendaItem}
                    onClick={(e) => handleEventClick(e, ev)}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{ev.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--sf-text-secondary)' }}>
                        Category: {ev.category?.name || 'General'} • Calendar: {ev.calendar?.name || 'Primary'}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--sf-accent-primary)' }}>
                      {Math.round((new Date(ev.end_at).getTime() - new Date(ev.start_at).getTime()) / 60000)}m
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </main>
      </div>

      {/* EVENT CREATE / EDIT / DUPLICATE MODAL */}
      {isCreateModalOpen && (
        <div
          className={styles.modalBackdrop}
          onClick={() => !isSubmitting && setIsCreateModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="calendar-event-modal-title"
        >
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 id="calendar-event-modal-title" className={styles.modalTitle}>
                  {formData.id ? 'Edit Event' : isDuplicateMode ? 'Duplicate Event' : 'New Calendar Event'}
                </h2>
                {isDuplicateMode && <span className={styles.duplicateBadge}>Duplicate Mode</span>}
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                disabled={isSubmitting}
                onClick={() => setIsCreateModalOpen(false)}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className={styles.formErrorBanner}>
                <span>⚠️</span>
                <span>{formError}</span>
              </div>
            )}

            {/* Recurring Instance Selection Radio Group */}
            {isRecurringInstance && formData.id && (
              <div className={styles.recurrenceModeGroup}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--sf-text-secondary)' }}>
                  Recurring Event Scope:
                </label>
                <div style={{ display: 'flex', gap: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="recurrenceEditMode"
                      value="occurrence"
                      checked={recurrenceEditMode === 'occurrence'}
                      onChange={() => setRecurrenceEditMode('occurrence')}
                    />
                    <span>This occurrence only ({occurrenceDate})</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="recurrenceEditMode"
                      value="series"
                      checked={recurrenceEditMode === 'series'}
                      onChange={() => setRecurrenceEditMode('series')}
                    />
                    <span>All occurrences in series</span>
                  </label>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveEvent} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Title *</label>
                <input
                  type="text"
                  required
                  className={styles.formInput}
                  placeholder="e.g. Distributed Systems Lab"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Start Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    className={styles.formInput}
                    value={formData.start_at}
                    onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>End Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    className={styles.formInput}
                    value={formData.end_at}
                    onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Calendar</label>
                  <select
                    className={styles.formSelect}
                    value={formData.calendar_id}
                    onChange={(e) => setFormData({ ...formData, calendar_id: e.target.value })}
                  >
                    <option value="">Default Calendar</option>
                    {calendars.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Category</label>
                  <select
                    className={styles.formSelect}
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  >
                    <option value="">No Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Link LearnUp Course / Item</label>
                <select
                  className={styles.formSelect}
                  value={formData.learning_item_id}
                  onChange={(e) => setFormData({ ...formData, learning_item_id: e.target.value })}
                >
                  <option value="">None (Personal / Non-course)</option>
                  {learningItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Repeat</label>
                  <select
                    className={styles.formSelect}
                    value={formData.recurrence_freq}
                    onChange={(e) => setFormData({ ...formData, recurrence_freq: e.target.value as any })}
                  >
                    <option value="NONE">Does not repeat</option>
                    <option value="DAILY">Every Day</option>
                    <option value="WEEKDAYS">Every Weekday (Mon–Fri)</option>
                    <option value="WEEKLY">Every Week</option>
                    <option value="BIWEEKLY">Every 2 Weeks</option>
                    <option value="MONTHLY">Every Month</option>
                    <option value="YEARLY">Every Year</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Color</label>
                  <input
                    type="color"
                    className={styles.formInput}
                    style={{ height: 38, padding: 2 }}
                    value={formData.color_override}
                    onChange={(e) => setFormData({ ...formData, color_override: e.target.value })}
                  />
                </div>
              </div>

              {/* Reminders & Notifications Section */}
              <div className={styles.formGroup}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label className={styles.formLabel} style={{ margin: 0 }}>Reminders & Notifications</label>
                  {notificationPermission !== 'granted' && (
                    <button
                      type="button"
                      className={styles.notificationPermBtn}
                      onClick={handleRequestNotificationPermission}
                    >
                      🔔 {notificationPermission === 'denied' ? 'Notifications Blocked' : 'Enable Browser Alerts'}
                    </button>
                  )}
                </div>

                <div className={styles.reminderList}>
                  {formData.reminders.map((rem, idx) => (
                    <div key={idx} className={styles.reminderRow}>
                      <select
                        className={styles.formSelect}
                        style={{ width: 140 }}
                        value={rem.type}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setFormData((prev) => {
                            const copy = [...prev.reminders];
                            copy[idx] = { ...copy[idx], type: val };
                            return { ...prev, reminders: copy };
                          });
                        }}
                      >
                        <option value="notification">Browser Alert</option>
                        <option value="audio_cue">Audio Cue</option>
                        <option value="email">Email</option>
                      </select>

                      <select
                        className={styles.formSelect}
                        style={{ flex: 1 }}
                        value={rem.minutes_before}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setFormData((prev) => {
                            const copy = [...prev.reminders];
                            copy[idx] = { ...copy[idx], minutes_before: val };
                            return { ...prev, reminders: copy };
                          });
                        }}
                      >
                        <option value={0}>At time of event</option>
                        <option value={5}>5 minutes before</option>
                        <option value={10}>10 minutes before</option>
                        <option value={15}>15 minutes before</option>
                        <option value={30}>30 minutes before</option>
                        <option value={60}>1 hour before</option>
                        <option value={120}>2 hours before</option>
                        <option value={1440}>1 day before</option>
                      </select>

                      <button
                        type="button"
                        className={styles.closeBtn}
                        style={{ width: 28, height: 28 }}
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            reminders: prev.reminders.filter((_, i) => i !== idx)
                          }));
                        }}
                        aria-label="Remove reminder"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {formData.reminders.length < 5 && (
                    <button
                      type="button"
                      className={styles.addReminderBtn}
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          reminders: [...prev.reminders, { type: 'notification', minutes_before: 15 }]
                        }));
                      }}
                    >
                      + Add Reminder
                    </button>
                  )}
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Location</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="e.g. Building 4 Room 201 or Online"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>URL</label>
                  <input
                    type="url"
                    className={styles.formInput}
                    placeholder="https://..."
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Description / Notes</label>
                <textarea
                  rows={2}
                  className={styles.formTextarea}
                  placeholder="Additional notes or study goals..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  {formData.id && (
                    <>
                      <button
                        type="button"
                        className={styles.btnDanger}
                        disabled={isSubmitting}
                        onClick={handleOpenDeleteConfirm}
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        className={styles.btnSecondary}
                        disabled={isSubmitting}
                        onClick={handleDuplicateEvent}
                      >
                        Duplicate
                      </button>
                    </>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    disabled={isSubmitting}
                    onClick={() => setIsCreateModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : formData.id ? 'Save Changes' : 'Save Event'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deleteConfirmId && (
        <div
          className={styles.modalBackdrop}
          onClick={() => !isDeleting && setDeleteConfirmId(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-event-modal-title"
        >
          <div className={styles.confirmModalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 id="delete-event-modal-title" className={styles.modalTitle} style={{ color: '#dc2626' }}>
                Delete Event
              </h2>
              <button
                type="button"
                className={styles.closeBtn}
                disabled={isDeleting}
                onClick={() => setDeleteConfirmId(null)}
                aria-label="Close delete dialog"
              >
                ✕
              </button>
            </div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--sf-text-secondary)', lineHeight: 1.5 }}>
              Are you sure you want to delete <strong>{deleteConfirmTitle}</strong>?
            </p>

            {/* Recurrence Delete Choice */}
            {isRecurringInstance && (
              <div className={styles.recurrenceModeGroup} style={{ marginTop: 8 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--sf-text-secondary)' }}>
                  Delete Scope:
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="recurrenceDeleteMode"
                      value="occurrence"
                      checked={recurrenceDeleteMode === 'occurrence'}
                      onChange={() => setRecurrenceDeleteMode('occurrence')}
                    />
                    <span>Delete this occurrence only ({occurrenceDate})</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="recurrenceDeleteMode"
                      value="series"
                      checked={recurrenceDeleteMode === 'series'}
                      onChange={() => setRecurrenceDeleteMode('series')}
                    />
                    <span>Delete all occurrences in series</span>
                  </label>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button
                type="button"
                className={styles.btnSecondary}
                disabled={isDeleting}
                onClick={() => setDeleteConfirmId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.btnDanger}
                disabled={isDeleting}
                onClick={handleExecuteDelete}
              >
                {isDeleting
                  ? 'Deleting...'
                  : isRecurringInstance && recurrenceDeleteMode === 'occurrence'
                  ? 'Delete Occurrence'
                  : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE CALENDAR MODAL */}
      {isCalendarModalOpen && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setIsCalendarModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-calendar-modal-title"
        >
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 id="create-calendar-modal-title" className={styles.modalTitle}>Create New Calendar</h2>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setIsCalendarModalOpen(false)}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateCalendar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Calendar Name</label>
                <input
                  type="text"
                  required
                  className={styles.formInput}
                  placeholder="e.g. Distributed Systems Course"
                  value={newCalendarName}
                  onChange={(e) => setNewCalendarName(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Theme Color</label>
                <input
                  type="color"
                  className={styles.formInput}
                  style={{ height: 38, padding: 2 }}
                  value={newCalendarColor}
                  onChange={(e) => setNewCalendarColor(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className={styles.btnSecondary} onClick={() => setIsCalendarModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.btnPrimary}>
                  Create Calendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE CATEGORY MODAL */}
      {isCategoryModalOpen && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setIsCategoryModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-category-modal-title"
        >
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 id="create-category-modal-title" className={styles.modalTitle}>Create New Category</h2>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setIsCategoryModalOpen(false)}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateCategory} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Category Name</label>
                <input
                  type="text"
                  required
                  className={styles.formInput}
                  placeholder="e.g. Lab Milestones, Flashcard Reviews"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Badge Color</label>
                <input
                  type="color"
                  className={styles.formInput}
                  style={{ height: 38, padding: 2 }}
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className={styles.btnSecondary} onClick={() => setIsCategoryModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.btnPrimary}>
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIVE STUDY SESSION FOCUS HUD */}
      {activeStudySession && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-labelledby="focus-hud-title">
          <div className={styles.studyModalContent}>
            <div style={{ fontSize: '0.8125rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ● Live Study Session in Progress
            </div>
            <h2 id="focus-hud-title" style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>{activeStudySession.title}</h2>

            <div className={styles.studyTimerDigital}>
              {Math.floor(activeStudySession.elapsedSeconds / 60)
                .toString()
                .padStart(2, '0')}
              :
              {(activeStudySession.elapsedSeconds % 60).toString().padStart(2, '0')}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                className={styles.studyControlBtn}
                style={{ background: activeStudySession.isRunning ? '#f59e0b' : '#10b981', color: '#ffffff' }}
                onClick={() =>
                  setActiveStudySession((prev) => (prev ? { ...prev, isRunning: !prev.isRunning } : null))
                }
              >
                {activeStudySession.isRunning ? '⏸ Pause' : '▶ Resume'}
              </button>
              <button
                type="button"
                className={styles.studyControlBtn}
                style={{ background: '#3b82f6', color: '#ffffff' }}
                onClick={handleFinishStudySession}
              >
                ✓ Finish & Log Focus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
