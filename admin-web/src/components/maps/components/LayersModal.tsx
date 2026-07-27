import { Check, Satellite, X } from "lucide-react";

import { STYLE_OPTIONS } from "../mapStyles";
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
    <div className="absolute inset-0 z-40 bg-slate-950/20 p-4 backdrop-blur-[2px]">
      <div className="h-full max-w-sm overflow-y-auto rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur-xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              Map appearance
            </h3>

            <p className="text-sm text-slate-500">
              Choose your preferred map style.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 hover:bg-slate-100"
            aria-label="Close map appearance"
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
              <div
                className={`mb-3 h-24 rounded-xl ${option.className}`}
              />

              <div className="flex items-center justify-between px-1 pb-1">
                <span className="text-sm font-bold">
                  {option.label}
                </span>

                {style === option.key &&
                  (option.key === "satellite" ? (
                    <Satellite
                      size={17}
                      className="text-blue-600"
                    />
                  ) : (
                    <Check
                      size={17}
                      className="text-blue-600"
                    />
                  ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}