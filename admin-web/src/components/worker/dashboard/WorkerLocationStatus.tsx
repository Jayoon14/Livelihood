import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Power,
  Radio,
  WifiOff,
} from "lucide-react";

import { useState } from "react";

import { useWorkerLocation } from "../../../context/WorkerLocationProvider";

export default function WorkerLocationStatus() {
  const [showDetails, setShowDetails] = useState(false);
  const {
    workerLocation,
    isOnline,
    isTracking,
    locating,
    message,
    goOnline,
    goOffline,
  } = useWorkerLocation();

  async function handleToggle(): Promise<void> {
    try {
      if (isOnline) {
        await goOffline();
        return;
      }

      /*
       * goOnline also cancels an active request when locating is true.
       * The button therefore remains clickable at every stage.
       */
      await goOnline();
    } catch (error) {
      console.error("Unable to change worker availability:", error);
    }
  }

  const latitude = workerLocation?.latitude ?? null;
  const longitude = workerLocation?.longitude ?? null;
  const accuracy = workerLocation?.accuracy ?? null;

  const accuracyGood =
    accuracy !== null && Number.isFinite(accuracy) && accuracy <= 100;

  return (
    <section className="relative z-10 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:rounded-[1.75rem]">
      <div className="flex flex-col gap-5 p-4 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl sm:h-14 sm:w-14 ${
              isOnline
                ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
                : locating
                  ? "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            {locating ? (
              <LoaderCircle className="h-6 w-6 animate-spin" />
            ) : isOnline ? (
              <Radio className="h-6 w-6" />
            ) : (
              <WifiOff className="h-6 w-6" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white sm:text-xl">
                Worker Availability
              </h2>

              <span
                className={`rounded-full px-3 py-1 text-[11px] font-black tracking-wide ${
                  isOnline
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                    : locating
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {isOnline ? "ONLINE" : locating ? "CONNECTING" : "OFFLINE"}
              </span>
            </div>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              {isOnline
                ? "Your live GPS is visible to customers with an active booking."
                : locating
                  ? "Waiting for location permission and the first GPS reading."
                  : "Go online to share your location and receive nearby requests."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleToggle()}
          aria-busy={locating}
          className={`pointer-events-auto relative z-20 inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-white shadow-lg transition active:scale-[0.98] sm:w-auto sm:min-w-44 ${
            isOnline
              ? "bg-rose-600 shadow-rose-500/20 hover:bg-rose-700"
              : locating
                ? "bg-blue-600 shadow-blue-500/20 hover:bg-blue-700"
                : "bg-emerald-600 shadow-emerald-500/20 hover:bg-emerald-700"
          }`}
        >
          {locating ? (
            <>
              <LoaderCircle className="h-5 w-5 animate-spin" />
              Cancel GPS Request
            </>
          ) : isOnline ? (
            <>
              <Power className="h-5 w-5" />
              Go Offline
            </>
          ) : (
            <>
              <LocateFixed className="h-5 w-5" />
              Go Online
            </>
          )}
        </button>
      </div>

      {(isOnline || workerLocation) && (
        <div className="border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setShowDetails((current) => !current)}
            aria-expanded={showDetails}
            aria-controls="worker-gps-details"
            className="flex min-h-12 w-full items-center justify-between gap-3 bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 dark:bg-slate-950/40 dark:hover:bg-slate-800 sm:px-6"
          >
            <span>
              <span className="block text-sm font-black text-slate-800 dark:text-slate-100">
                GPS and connection details
              </span>
              <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                {showDetails ? "Hide technical status" : "Tap to view GPS status, accuracy, and coordinates"}
              </span>
            </span>

            <ChevronDown
              className={`h-5 w-5 shrink-0 text-slate-500 transition-transform duration-300 ${showDetails ? "rotate-180" : ""}`}
            />
          </button>

          <div
            id="worker-gps-details"
            className={`grid overflow-hidden bg-slate-50 transition-all duration-300 ease-in-out dark:bg-slate-950/40 ${
              showDetails
                ? "max-h-[720px] gap-3 p-4 opacity-100 sm:grid-cols-2 sm:p-6 xl:grid-cols-3"
                : "max-h-0 gap-0 p-0 opacity-0"
            }`}
          >
            <StatusItem
              label="GPS Status"
              value={isTracking ? "Tracking active" : "Waiting for GPS"}
              good={isTracking}
            />

            <StatusItem
              label="Database Sync"
              value={isOnline ? "Synced" : "Pending connection"}
              good={isOnline}
            />

            <StatusItem
              label="GPS Accuracy"
              value={
                accuracy !== null
                  ? `${Math.round(accuracy)} metres`
                  : "Not available"
              }
              good={accuracyGood}
            />

            {latitude !== null && longitude !== null && (
              <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:col-span-2 xl:col-span-3">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Current Coordinates
                </p>

                <p className="mt-2 break-all font-mono text-xs text-slate-700 dark:text-slate-300 sm:text-sm">
                  {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {message && (
        <div className="flex items-start gap-3 border-t border-blue-100 bg-blue-50 px-4 py-4 text-sm leading-6 text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300 sm:px-6">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{message}</span>
        </div>
      )}
    </section>
  );
}

function StatusItem({
  label,
  value,
  good,
}: {
  label: string;
  value: string;
  good: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p
        className={`mt-2 flex items-center gap-2 text-sm font-bold ${
          good
            ? "text-emerald-700 dark:text-emerald-300"
            : "text-slate-700 dark:text-slate-300"
        }`}
      >
        {good ? (
          <CheckCircle2 className="h-4 w-4 shrink-0" />
        ) : (
          <MapPin className="h-4 w-4 shrink-0" />
        )}
        {value}
      </p>
    </div>
  );
}
