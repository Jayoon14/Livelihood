import {
  LoaderCircle,
  LocateFixed,
  MapPin,
  Power,
  Radio,
  WifiOff,
} from "lucide-react";

import { useWorkerLocation } from "../../../context/WorkerLocationProvider";

export default function WorkerLocationStatus() {
  const {
    workerLocation,
    isOnline,
    isTracking,
    locating,
    message,
    goOnline,
    goOffline,
  } = useWorkerLocation();

  async function handleToggle() {
    if (isOnline) {
      await goOffline();
      return;
    }

    await goOnline();
  }

  const latitude = workerLocation?.latitude ?? null;
  const longitude = workerLocation?.longitude ?? null;
  const accuracy = workerLocation?.accuracy ?? null;

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
              isOnline
                ? "bg-emerald-100 text-emerald-600"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {isOnline ? (
              <Radio className="h-7 w-7" />
            ) : (
              <WifiOff className="h-7 w-7" />
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900">
                Worker Availability
              </h2>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  isOnline
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {isOnline ? "ONLINE" : "OFFLINE"}
              </span>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              {isOnline
                ? "Customers can see your live location and availability."
                : "Go online to receive nearby booking requests."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleToggle()}
          disabled={locating}
          className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-6 py-3 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
            isOnline
              ? "bg-rose-600 hover:bg-rose-700"
              : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {locating ? (
            <>
              <LoaderCircle className="h-5 w-5 animate-spin" />
              Getting Location...
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

      {isOnline && (
        <div className="grid gap-4 border-t border-slate-100 bg-slate-50 p-6 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              GPS Status
            </p>

            <p className="mt-2 flex items-center gap-2 font-semibold text-slate-800">
              <MapPin className="h-4 w-4 text-emerald-600" />

              {isTracking ? "Tracking active" : "Waiting for GPS"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Database Sync
            </p>

            <p className="mt-2 font-semibold text-slate-800">
              {workerLocation ? "Synced" : "Waiting for location"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              GPS Accuracy
            </p>

            <p className="mt-2 font-semibold text-slate-800">
              {accuracy !== null
                ? `${Math.round(accuracy)} meters`
                : "Not available"}
            </p>
          </div>

          {latitude !== null && longitude !== null && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:col-span-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Current Coordinates
              </p>

              <p className="mt-2 break-all font-mono text-sm text-slate-700">
                {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </p>
            </div>
          )}
        </div>
      )}

      {message && (
        <div className="border-t border-blue-100 bg-blue-50 px-6 py-4 text-sm text-blue-700">
          {message}
        </div>
      )}
    </section>
  );
}