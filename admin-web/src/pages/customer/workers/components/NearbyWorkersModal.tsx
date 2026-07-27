import { useEffect, useState } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  MapPin,
  MapPinned,
  Navigation,
  UserRound,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import LocationPicker from "../../../../components/maps/LocationPicker";
import type { NearbyWorker } from "../../../../components/maps/hooks/useNearbyWorkers";

interface NearbyWorkersModalProps {
  open: boolean;
  onClose: () => void;
}

function formatDistance(distanceMeters: number | null) {
  if (distanceMeters === null) {
    return "Distance unavailable";
  }

  if (distanceMeters < 1_000) {
    return `${Math.round(distanceMeters)} m away`;
  }

  return `${(distanceMeters / 1_000).toFixed(1)} km away`;
}

function getWorkerName(worker: NearbyWorker) {
  return [
    worker.profile?.first_name,
    worker.profile?.middle_name,
    worker.profile?.last_name,
  ]
    .filter(Boolean)
    .join(" ") || "Available Worker";
}

export default function NearbyWorkersModal({
  open,
  onClose,
}: NearbyWorkersModalProps) {
  const navigate = useNavigate();

  const [selectedWorker, setSelectedWorker] =
    useState<NearbyWorker | null>(null);

  useEffect(() => {
    if (!open) {
      setSelectedWorker(null);
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (selectedWorker) {
          setSelectedWorker(null);
          return;
        }

        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose, selectedWorker]);

  if (!open) {
    return null;
  }

  const workerName = selectedWorker
    ? getWorkerName(selectedWorker)
    : "";

  const profilePicture =
    selectedWorker?.profile?.profile_picture?.trim() ||
    "https://placehold.co/300x300?text=Worker";

  return (
    <div
      className="
        fixed inset-0 z-[200]
        flex items-center justify-center
        bg-slate-950/60
        p-3 backdrop-blur-sm
        sm:p-6
      "
      role="dialog"
      aria-modal="true"
      aria-labelledby="nearby-workers-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="
          relative flex
          max-h-[94vh] w-full max-w-7xl
          flex-col overflow-hidden
          rounded-[28px] bg-white
          shadow-[0_30px_100px_rgba(15,23,42,0.40)]
        "
      >
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <MapPinned size={22} />
            </div>

            <div>
              <h2
                id="nearby-workers-title"
                className="text-lg font-bold text-slate-900 sm:text-xl"
              >
                Nearby Workers
              </h2>

              <p className="text-sm text-slate-500">
                Select an online worker to view their details.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close nearby workers"
            className="
              flex h-10 w-10 items-center justify-center
              rounded-full text-slate-500
              transition hover:bg-slate-100 hover:text-slate-900
              focus:outline-none focus:ring-2 focus:ring-blue-500
            "
          >
            <X size={22} />
          </button>
        </header>

        <div className="relative flex-1 overflow-hidden bg-slate-50">
          <div className="h-full overflow-y-auto p-3 sm:p-5">
            <LocationPicker
              showNearbyWorkers
              nearbyWorkerRadiusKilometers={20}
              onNearbyWorkerSelect={setSelectedWorker}
              onLocationSelect={() => {
                // Map-only worker discovery.
              }}
            />
          </div>

          <aside
            className={`
              absolute inset-y-0 right-0 z-30
              w-full max-w-sm
              border-l border-slate-200 bg-white
              shadow-[-20px_0_60px_rgba(15,23,42,0.18)]
              transition-transform duration-300 ease-out
              ${
                selectedWorker
                  ? "translate-x-0"
                  : "translate-x-full"
              }
            `}
          >
            {selectedWorker && (
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                      Selected Worker
                    </p>

                    <h3 className="mt-1 text-lg font-bold text-slate-900">
                      Worker Details
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedWorker(null)}
                    aria-label="Close worker details"
                    className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5">
                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="relative h-52 bg-slate-100">
                      <img
                        src={profilePicture}
                        alt={workerName}
                        className="h-full w-full object-cover"
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

                      <div className="absolute bottom-4 left-4 right-4">
                        <h3 className="text-xl font-bold text-white">
                          {workerName}
                        </h3>

                        <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-emerald-300">
                          <span className="h-2 w-2 rounded-full bg-emerald-400" />
                          Online and available
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4 p-5">
                      <div className="flex items-center gap-3 rounded-2xl bg-blue-50 p-4 text-blue-700">
                        <Navigation size={20} />

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide">
                            Distance
                          </p>

                          <p className="font-bold">
                            {formatDistance(
                              selectedWorker.distanceMeters,
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-slate-200 p-4">
                          <BadgeCheck
                            size={20}
                            className="text-blue-600"
                          />

                          <p className="mt-2 text-xs text-slate-500">
                            Status
                          </p>

                          <p className="font-semibold text-slate-900">
                            Verified
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 p-4">
                          <BriefcaseBusiness
                            size={20}
                            className="text-emerald-600"
                          />

                          <p className="mt-2 text-xs text-slate-500">
                            Availability
                          </p>

                          <p className="font-semibold text-slate-900">
                            Available
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-center gap-2">
                          <MapPin
                            size={18}
                            className="text-slate-500"
                          />

                          <p className="text-sm font-semibold text-slate-900">
                            Live Location
                          </p>
                        </div>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          This worker is currently sharing an active GPS
                          location.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 border-t border-slate-200 bg-white p-5">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/customer/workers/${selectedWorker.worker_id}`,
                      )
                    }
                    className="
                      inline-flex w-full items-center justify-center gap-2
                      rounded-2xl border border-slate-300
                      px-5 py-3.5 font-semibold text-slate-700
                      transition hover:border-slate-900 hover:bg-slate-50
                    "
                  >
                    <UserRound size={18} />
                    View Profile
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/customer/workers/${selectedWorker.worker_id}?book=true#booking-section`,
                      )
                    }
                    className="
                      inline-flex w-full items-center justify-center gap-2
                      rounded-2xl bg-blue-600
                      px-5 py-3.5 font-semibold text-white
                      shadow-lg shadow-blue-600/20
                      transition hover:bg-blue-700
                    "
                  >
                    <BriefcaseBusiness size={18} />
                    Book Now
                  </button>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}