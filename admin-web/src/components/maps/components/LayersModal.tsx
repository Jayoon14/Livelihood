import {
  Check,
  Satellite,
  X,
} from "lucide-react";

import {
  STYLE_OPTIONS,
  type MapStyleOption,
} from "../mapStyles";
import type { StyleKey } from "../types";

interface LayersModalProps {
  visible: boolean;
  style: StyleKey;
  onClose: () => void;
  onStyleChange: (style: StyleKey) => void;
}

export default function LayersModal({
  visible,
  style,
  onClose,
  onStyleChange,
}: LayersModalProps) {
  if (!visible) {
    return null;
  }

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      className="absolute inset-0 z-40 flex items-end bg-slate-950/30 p-0 backdrop-blur-[2px] sm:items-stretch sm:p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="map-appearance-title"
        className="max-h-[80%] w-full overflow-y-auto rounded-t-[1.5rem] bg-white/95 p-4 shadow-2xl backdrop-blur-xl dark:bg-slate-900/95 sm:h-full sm:max-h-none sm:max-w-sm sm:rounded-3xl sm:p-5"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3
              id="map-appearance-title"
              className="text-xl font-bold text-slate-900 dark:text-white"
            >
              Map appearance
            </h3>

            <p className="text-sm text-slate-500 dark:text-slate-400">
              Choose your preferred map style.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Close map appearance"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {STYLE_OPTIONS.map(
            (option: MapStyleOption) => {
              const active = style === option.key;

              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    onStyleChange(option.key);
                    onClose();
                  }}
                  aria-pressed={active}
                  className={`rounded-2xl border p-2 text-left transition ${
                    active
                      ? "border-blue-600 bg-blue-50 ring-2 ring-blue-600/10 dark:bg-blue-500/10"
                      : "border-slate-200 bg-white hover:border-blue-300 dark:border-slate-700 dark:bg-slate-900"
                  }`}
                >
                  <div
                    className={`mb-3 h-24 rounded-xl ${option.className}`}
                  />

                  <div className="flex items-center justify-between gap-2 px-1 pb-1">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {option.label}
                    </span>

                    {active &&
                      (option.key === "satellite" ? (
                        <Satellite className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Check className="h-4 w-4 text-blue-600" />
                      ))}
                  </div>
                </button>
              );
            },
          )}
        </div>
      </div>
    </div>
  );
}
