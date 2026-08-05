import { X } from "lucide-react";

import { formatDistance, formatDuration } from "../format";

interface RouteCardProps {
  visible: boolean;
  selectedAddress: string;
  distance: number | null;
  duration: number | null;
  onClose: () => void;
}

export default function RouteCard({
  visible,
  selectedAddress,
  distance,
  duration,
  onClose,
}: RouteCardProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className="absolute left-3 right-3 top-20 z-20 max-w-md rounded-3xl bg-white/95 p-4 shadow-2xl backdrop-blur-xl sm:left-5 sm:right-auto sm:w-[410px] md:hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-slate-900">
            Route to service location
          </p>

          <p className="mt-1 line-clamp-1 text-sm text-slate-500">
            {selectedAddress || "No destination selected."}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close route information"
          className="shrink-0 rounded-full p-2 hover:bg-slate-100"
        >
          <X size={18} />
        </button>
      </div>

      {distance !== null && duration !== null && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-blue-50 p-3">
            <p className="text-xs text-blue-600">
              Distance
            </p>

            <p className="mt-1 text-lg font-bold text-blue-900">
              {formatDistance(distance)}
            </p>
          </div>

          <div className="rounded-2xl bg-emerald-50 p-3">
            <p className="text-xs text-emerald-600">
              Estimated time
            </p>

            <p className="mt-1 text-lg font-bold text-emerald-900">
              {formatDuration(duration)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}