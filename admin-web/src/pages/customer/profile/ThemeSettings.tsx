import {
  Check,
  Laptop,
  Moon,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useLanguage } from "../../../context/LanguageContext";

type ThemePreference = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeOption {
  value: ThemePreference;
  icon: LucideIcon;
  title: string;
  description: string;
}

const STORAGE_KEY = "livelihood-theme";
const SYSTEM_THEME_QUERY = "(prefers-color-scheme: dark)";

function isThemePreference(
  value: string | null,
): value is ThemePreference {
  return (
    value === "light" ||
    value === "dark" ||
    value === "system"
  );
}

function getSavedTheme(): ThemePreference {
  const savedTheme = localStorage.getItem(STORAGE_KEY);

  return isThemePreference(savedTheme)
    ? savedTheme
    : "system";
}

function resolveTheme(
  preference: ThemePreference,
): ResolvedTheme {
  if (preference === "system") {
    return window.matchMedia(SYSTEM_THEME_QUERY).matches
      ? "dark"
      : "light";
  }

  return preference;
}

function applyTheme(preference: ThemePreference): ResolvedTheme {
  const resolvedTheme = resolveTheme(preference);
  const root = document.documentElement;

  root.classList.toggle("dark", resolvedTheme === "dark");
  root.setAttribute("data-theme", resolvedTheme);
  root.style.colorScheme = resolvedTheme;

  return resolvedTheme;
}

export default function ThemeSettings() {
  const { language } = useLanguage();
  const isFilipino = language === "fil";

  const [theme, setTheme] =
    useState<ThemePreference>(getSavedTheme);
  const [resolvedTheme, setResolvedTheme] =
    useState<ResolvedTheme>(() => resolveTheme(getSavedTheme()));

  const options = useMemo<ThemeOption[]>(
    () => [
      {
        value: "light",
        icon: Sun,
        title: isFilipino ? "Maliwanag" : "Light",
        description: isFilipino
          ? "Gumamit ng maliwanag na background at madidilim na teksto."
          : "Use bright surfaces with dark text.",
      },
      {
        value: "dark",
        icon: Moon,
        title: isFilipino ? "Madilim" : "Dark",
        description: isFilipino
          ? "Gumamit ng madilim na background para mas komportable sa gabi."
          : "Use darker surfaces for comfortable viewing at night.",
      },
      {
        value: "system",
        icon: Laptop,
        title: isFilipino ? "Ayon sa device" : "System",
        description: isFilipino
          ? "Sundin ang kasalukuyang tema ng iyong device."
          : "Follow your device appearance automatically.",
      },
    ],
    [isFilipino],
  );

  useEffect(() => {
    setResolvedTheme(applyTheme(theme));

    if (theme !== "system") {
      return;
    }

    const mediaQuery = window.matchMedia(SYSTEM_THEME_QUERY);

    const handleSystemThemeChange = () => {
      setResolvedTheme(applyTheme("system"));
    };

    mediaQuery.addEventListener(
      "change",
      handleSystemThemeChange,
    );

    return () => {
      mediaQuery.removeEventListener(
        "change",
        handleSystemThemeChange,
      );
    };
  }, [theme]);

  function handleThemeChange(nextTheme: ThemePreference) {
    if (nextTheme === theme) {
      return;
    }

    localStorage.setItem(STORAGE_KEY, nextTheme);
    setTheme(nextTheme);

    const nextResolvedTheme = applyTheme(nextTheme);
    setResolvedTheme(nextResolvedTheme);

    const selectedLabel =
      options.find((option) => option.value === nextTheme)
        ?.title ?? nextTheme;

    toast.success(
      isFilipino
        ? `Napaltan na ang tema sa ${selectedLabel}.`
        : `Theme changed to ${selectedLabel}.`,
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {options.map((option) => {
          const Icon = option.icon;
          const selected = theme === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() =>
                handleThemeChange(option.value)
              }
              aria-pressed={selected}
              className={`group flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-4 focus:ring-blue-500/10 ${
                selected
                  ? "border-blue-500 bg-blue-50 shadow-sm dark:border-blue-400 dark:bg-blue-500/10"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-slate-600 dark:hover:bg-slate-900"
              }`}
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition ${
                  selected
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-500 group-hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:text-slate-200"
                }`}
              >
                <Icon size={21} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-slate-900 dark:text-white">
                  {option.title}
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {option.description}
                </span>
              </span>

              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
                  selected
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-300 bg-white text-transparent dark:border-slate-600 dark:bg-slate-900"
                }`}
              >
                <Check size={14} />
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
          {isFilipino
            ? `Kasalukuyang ginagamit ang ${
                resolvedTheme === "dark"
                  ? "madilim"
                  : "maliwanag"
              } na tema.`
            : `The ${
                resolvedTheme === "dark"
                  ? "dark"
                  : "light"
              } theme is currently active.`}
        </p>
      </div>
    </div>
  );
}