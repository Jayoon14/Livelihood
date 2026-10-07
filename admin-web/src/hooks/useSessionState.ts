import { useCallback, useEffect, useState } from "react";

function readSessionValue<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

/**
 * Persists non-sensitive, JSON-serializable UI state for the lifetime of the
 * browser tab. This prevents unfinished modal/form state from disappearing
 * when a page is temporarily remounted while the tab loses/regains focus.
 */
export function useSessionState<T>(key: string, fallback: T) {
  const [value, setValueState] = useState<T>(() => readSessionValue(key, fallback));

  useEffect(() => {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage can be unavailable in private/restricted browsing. Local state
      // still works, so persistence failure should never break the form.
    }
  }, [key, value]);

  const clear = useCallback(() => {
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // Ignore storage failures.
    }
  }, [key]);

  return [value, setValueState, clear] as const;
}
