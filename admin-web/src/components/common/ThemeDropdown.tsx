import { useEffect, useRef, useState } from "react";
import { Check, MonitorCog, Moon, Settings, Sun } from "lucide-react";

import { useTheme, type ThemeMode } from "../../context/ThemeContext";

const options: Array<{
  mode: ThemeMode;
  label: string;
  icon: typeof Sun;
}> = [
  { mode: "light", label: "Light", icon: Sun },
  { mode: "dark", label: "Dark", icon: Moon },
  { mode: "auto", label: "Auto", icon: MonitorCog },
];

export default function ThemeDropdown() {
  const { mode, setMode } = useTheme();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Theme settings"
        aria-expanded={open}
        aria-haspopup="menu"
        className={`theme-settings-button group flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-300 ${
          open
            ? "border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-500/25"
            : "border-slate-200 bg-white text-slate-600 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        }`}
      >
        <Settings
          size={20}
          className={`transition-transform duration-500 ${
            open ? "rotate-90" : "group-hover:rotate-45"
          }`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="theme-menu-enter absolute right-0 z-100 mt-3 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_50px_rgba(15,23,42,.18)] dark:border-slate-700 dark:bg-slate-900"
        >
          {options.map(({ mode: optionMode, label, icon: Icon }) => {
            const selected = mode === optionMode;

            return (
              <button
                key={optionMode}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  setMode(optionMode);
                  setOpen(false);
                }}
                className={`theme-option group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 ${
                  selected
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                    : "text-slate-700 hover:translate-x-0.5 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                <Icon
                  size={18}
                  className={`theme-option-icon ${
                    optionMode === "light"
                      ? "group-hover:rotate-45"
                      : optionMode === "dark"
                        ? "group-hover:-rotate-12 group-hover:scale-110"
                        : "group-hover:scale-110"
                  }`}
                />

                <span className="flex-1">{label}</span>

                {selected && (
                  <Check size={16} className="theme-check-enter text-blue-600" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
