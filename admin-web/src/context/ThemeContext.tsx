import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "./AuthContextValue";
import {
  ThemeContext,
  type ResolvedTheme,
  type ThemeContextValue,
  type ThemeMode,
} from "./ThemeContextValue";

const STORAGE_KEY_PREFIX = "livelihood-theme";
const DEFAULT_THEME: ThemeMode = "light";

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getStorageKey(userId: string) {
  return `${STORAGE_KEY_PREFIX}:${userId}`;
}

function getSavedMode(userId: string): ThemeMode {
  if (typeof window === "undefined") return DEFAULT_THEME;

  const saved = window.localStorage.getItem(getStorageKey(userId));
  return saved === "light" || saved === "dark" || saved === "auto"
    ? saved
    : DEFAULT_THEME;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [themeRevision, setThemeRevision] = useState(0);
  const [systemTheme, setSystemTheme] =
    useState<ResolvedTheme>(getSystemTheme);

  const currentUserId = user?.id ?? null;
  const mode = useMemo<ThemeMode>(() => {
    // Re-read the current account preference after setMode updates storage.
    void themeRevision;

    if (!currentUserId) {
      return DEFAULT_THEME;
    }

    return getSavedMode(currentUserId);
  }, [currentUserId, themeRevision]);

  const resolvedTheme: ResolvedTheme =
    !currentUserId
      ? "light"
      : mode === "auto"
        ? systemTheme
        : mode;

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      "(prefers-color-scheme: dark)",
    );

    const handleSystemThemeChange = (
      event: MediaQueryListEvent,
    ) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);
    return () => {
      mediaQuery.removeEventListener(
        "change",
        handleSystemThemeChange,
      );
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolvedTheme === "dark");
    root.dataset.theme = resolvedTheme;
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const setMode = useCallback(
    (nextMode: ThemeMode) => {
      if (!currentUserId) {
        return;
      }

      window.localStorage.setItem(
        getStorageKey(currentUserId),
        nextMode,
      );
      setThemeRevision((currentRevision) => currentRevision + 1);
    },
    [currentUserId],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, resolvedTheme, setMode }),
    [mode, resolvedTheme, setMode],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
