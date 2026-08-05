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

function formatDistance(
  distanceMeters: number | null,
): string {
  if (distanceMeters === null) {
    return "Distance unavailable";
  }

  if (distanceMeters < 1_000) {
    return `${Math.round(distanceMeters)} m away`;
  }

  return `${(distanceMeters / 1_000).toFixed(
    1,
  )} km away`;
}

function getWorkerName(
  worker: NearbyWorker,
): string {
  return [
    worker.profile?.first_name,
    worker.profile?.middle_name,
    worker.profile?.last_name,
  ]
    .filter(
      (value): value is string =>
        typeof value === "string" &&
        value.trim().length > 0,
    )
    .map((value) => value.trim())
    .join(" ") || "Available Worker";
}

export default function NearbyWorkersModal({
  open,
  onClose,
}: NearbyWorkersModalProps) {
  const navigate = useNavigate();

  const [selectedWorker, setSelectedWorker] =
    useState<NearbyWorker | null>(null);

  const [routeTarget, setRouteTarget] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);

  const [routeRequestKey, setRouteRequestKey] =
    useState(0);

  useEffect(() => {
    if (!open) {
      setSelectedWorker(null);
      setRouteTarget(null);
      setRouteRequestKey(0);
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleEscape = (
      event: KeyboardEvent,
    ) => {
      if (event.key !== "Escape") {
        return;
      }

      if (selectedWorker) {
        setSelectedWorker(null);
        return;
      }

      onClose();
    };

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleEscape,
      );
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
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nearby-workers-title"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="relative flex h-[95dvh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_30px_100px_rgba(15,23,42,0.40)] sm:h-auto sm:max-h-[94vh] sm:rounded-[28px] dark:bg-slate-900">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-7 sm:py-4 dark:border-slate-700">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
              <MapPinned size={21} />
            </div>

            <div className="min-w-0">
              <h2
                id="nearby-workers-title"
                className="truncate text-base font-bold text-slate-900 sm:text-xl dark:text-white"
              >
                Nearby Workers
              </h2>

              <p className="hidden text-sm text-slate-500 sm:block dark:text-slate-400">
                Select an online worker to view
                their details.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close nearby workers"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <X size={22} />
          </button>
        </header>

        <div className="relative min-h-0 flex-1 overflow-hidden bg-slate-50 dark:bg-slate-950">
          <div className="h-full overflow-y-auto p-2 sm:p-5">
            <LocationPicker
              showNearbyWorkers
              nearbyWorkerRadiusKilometers={50}
              onNearbyWorkerSelect={
                setSelectedWorker
              }
              externalRouteTarget={routeTarget}
              externalRouteRequestKey={
                routeRequestKey
              }
              onExternalRouteStarted={() => {
                setSelectedWorker(null);
              }}
              onLocationSelect={() => {
                // Map-only worker discovery.
              }}
            />
          </div>

          <aside
            className={`absolute inset-y-0 right-0 z-30 w-full border-l border-slate-200 bg-white shadow-[-20px_0_60px_rgba(15,23,42,0.18)] transition-transform duration-300 ease-out sm:max-w-sm dark:border-slate-700 dark:bg-slate-900 ${
              selectedWorker
                ? "translate-x-0"
                : "translate-x-full"
            }`}
          >
            {selectedWorker && (
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-300">
                      Selected Worker
                    </p>

                    <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                      Worker Details
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedWorker(null)
                    }
                    aria-label="Close worker details"
                    className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <div className="relative h-52 bg-slate-100 dark:bg-slate-800">
                      <img
                        src={profilePicture}
                        alt={workerName}
                        className="h-full w-full object-cover"
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" />

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
                      <div className="flex items-center gap-3 rounded-2xl bg-blue-50 p-4 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
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
                        <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                          <BadgeCheck
                            size={20}
                            className="text-emerald-600"
                          />
                          <p className="mt-2 text-xs font-semibold text-slate-500">
                            Status
                          </p>
                          <p className="font-bold text-slate-900 dark:text-white">
                            Verified
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                          <BriefcaseBusiness
                            size={20}
                            className="text-blue-600"
                          />
                          <p className="mt-2 text-xs font-semibold text-slate-500">
                            Availability
                          </p>
                          <p className="font-bold text-slate-900 dark:text-white">
                            Available
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                        <MapPin
                          size={20}
                          className="mt-0.5 shrink-0 text-rose-500"
                        />
                        <div>
                          <p className="text-xs font-semibold text-slate-500">
                            Live GPS
                          </p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            Location recently updated
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 border-t border-slate-200 p-4 sm:grid-cols-3 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedWorker(null)
                    }
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <UserRound size={18} />
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRouteTarget({
                        latitude:
                          selectedWorker.latitude,
                        longitude:
                          selectedWorker.longitude,
                        address: `${workerName} live location`,
                      });

                      setRouteRequestKey(
                        (current) => current + 1,
                      );
                    }}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700"
                  >
                    <Navigation size={18} />
                    Route to Worker
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate(
                        `/customer/workers/${selectedWorker.worker_id}`,
                      );
                    }}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700"
                  >
                    View Profile
                    <Navigation size={18} />
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
