import { useState, useEffect, useCallback } from 'react';
import { learningItemsApi } from '@/lib/api/learning-items';
import type { LearningItem, LibraryProgress } from '@/lib/types';
import { ApiError } from '@/lib/api/client';

export type LibraryItemWithProgress = LearningItem & { progress?: LibraryProgress };

export function useLibrary() {
  const [items, setItems] = useState<LibraryItemWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [itemsData, progressRes] = await Promise.all([
        learningItemsApi.listLearningItems(),
        fetch('/api/progress/library').catch((err) => {
          console.warn('Failed to fetch progress data, library will render without progress indicators:', err);
          return null;
        })
      ]);

      let progressData: LibraryProgress[] = [];
      if (progressRes && progressRes.ok) {
        progressData = (await progressRes.json()).data || [];
      } else if (progressRes && !progressRes.ok) {
        console.warn('Progress API returned non-ok status:', progressRes.status);
      }

      const progressMap = new Map(progressData.map(p => [p.learning_item_id, p]));

      const combined = itemsData.map(item => ({
        ...item,
        progress: progressMap.get(item.id)
      }));

      setItems(combined);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load library items.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return { items, isLoading, error, refresh: fetchItems };
}
