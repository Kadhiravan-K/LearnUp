'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserAnalyticsData } from '../services/analytics-service';

export function useAnalytics() {
  const [analytics, setAnalytics] = useState<UserAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch('/api/analytics');
      if (!res.ok) {
        throw new Error('Failed to load analytics telemetry');
      }
      const json = await res.json();
      setAnalytics(json.data || null);
    } catch (err: any) {
      setError(err?.message || 'Error fetching analytics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    analytics,
    isLoading,
    error,
    refresh: fetchAnalytics
  };
}
