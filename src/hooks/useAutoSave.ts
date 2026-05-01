import { useEffect, useCallback } from 'react';

interface UseAutoSaveOptions<T> {
  key: string;
  delay?: number; // ms between saves
  onSave?: (data: T) => void;
  onRestore?: (data: T | null) => void;
}

export function useAutoSave<T extends Record<string, any>>(data: T, options: UseAutoSaveOptions<T>) {
  const { key, delay = 1000, onSave, onRestore } = options;

  // Serialize data
  const serialized = JSON.stringify(data);

  // Save to localStorage (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem(`autosave_${key}`, serialized);
      onSave?.(data);
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [serialized, key, delay, onSave]);

  // Restore on mount
  useEffect(() => {
    const saved = localStorage.getItem(`autosave_${key}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        onRestore?.(parsed);
      } catch {
        localStorage.removeItem(`autosave_${key}`);
      }
    }
  }, [key, onRestore]);

  // Clear draft
  const clearDraft = useCallback(() => {
    localStorage.removeItem(`autosave_${key}`);
  }, [key]);

  return { clearDraft, hasDraft: !!localStorage.getItem(`autosave_${key}`) };
}

