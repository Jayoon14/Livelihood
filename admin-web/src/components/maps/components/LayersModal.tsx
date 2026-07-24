import { Check, Satellite, TrafficCone, X } from "lucide-react";

import { STYLE_OPTIONS } from "../mapStyles";
import type { StyleKey } from "../types";

interface LayersModalProps {
  visible: boolean;
  style: StyleKey;
  trafficEnabled: boolean;
  tomTomApiKey?: string;
  onClose: () => void;
  onStyleChange: (style: StyleKey) => void;
  onTrafficChange: (enabled: boolean) => void;
}

export default function LayersModal({
  visible,
  style,
  trafficEnabled,
  tomTomApiKey,
  onClose,
  onStyleChange,
  onTrafficChange,
}: LayersModalProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-40 bg-slate-950/20 p-4 backdrop-blur-[2px]">
      <div className="h-full max-w-sm overflow-y-auto rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur-xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Map appearance</h3>

            <p className="text-sm text-slate-500">
              Choose your preferred map style.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {STYLE_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => {
                onStyleChange(option.key);
                onClose();
              }}
              className={`rounded-2xl border p-2 text-left ${
                style === option.key
                  ? "border-blue-600 bg-blue-50"
                  : "border-slate-200"
              }`}
            >
              <div className={`mb-3 h-24 rounded-xl ${option.className}`} />

              <div className="flex items-center justify-between px-1 pb-1">
                <span className="text-sm font-bold">{option.label}</span>

                {style === option.key &&
                  (option.key === "satellite" ? (
                    <Satellite size={17} className="text-blue-600" />
                  ) : (
                    <Check size={17} className="text-blue-600" />
                  ))}
              </div>
            </button>
          ))}
        </div>

        <div className="mt-5 border-t border-slate-200 pt-5">
          <button
            type="button"
            disabled={!tomTomApiKey}
            onClick={() => onTrafficChange(!trafficEnabled)}
            className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
              trafficEnabled
                ? "border-blue-500 bg-blue-50"
                : "border-slate-200 bg-white"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-amber-50 p-2 text-amber-600">
                <TrafficCone size={20} />
              </span>

              <div>
                <p className="font-semibold text-slate-900">Live Traffic</p>

                <p className="mt-1 text-xs text-slate-500">
                  Show current road conditions
                </p>
              </div>
            </div>

            <span
              className={`relative h-7 w-12 rounded-full transition ${
                trafficEnabled ? "bg-blue-600" : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                  trafficEnabled ? "left-6" : "left-1"
                }`}
              />
            </span>
          </button>

          {!tomTomApiKey && (
            <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
              Add VITE_TOMTOM_API_KEY to your .env file to activate live
              traffic.
            </p>
          )}

          {tomTomApiKey && (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <div className="h-2 rounded-full bg-gradient-to-r from-green-500 via-yellow-400 to-red-600" />

              <div className="mt-2 flex justify-between text-[11px] text-slate-500">
                <span>Fast</span>
                <span>Moderate</span>
                <span>Slow</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
