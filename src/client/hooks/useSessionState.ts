import { useEffect, useState } from 'react';

function readSessionValue<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;

  const raw = window.sessionStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function useSessionState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readSessionValue(key, fallback));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}
