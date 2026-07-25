import { supabase } from "../../../lib/supabase";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  LoaderCircle,
  LocateFixed,
  MapPin,
  Power,
  Radio,
  WifiOff,
} from "lucide-react";

import type { Coordinates } from "../../maps/types";
import { useLiveLocation } from "../../maps/hooks/useLiveLocation";
import { useWorkerLocationSync } from "../../maps/hooks/useWorkerLocationSync";

export default function WorkerLocationStatus() {
  const currentLocationRef = useRef<Coordinates | null>(null);

  const [online, setOnline] = useState(false);
  const [message, setMessage] = useState("");
  const [locating, setLocating] = useState(false);

  const { liveLocation, isTracking, startTracking, stopTracking } =
    useLiveLocation({
      currentLocationRef,
      setMessage,
      setLocating,
    });

  const { syncing, syncError, setWorkerOffline } = useWorkerLocationSync({
    location: liveLocation,
    enabled: online && isTracking,
    minimumIntervalMilliseconds: 5_000,
  });

  const handleGoOnline = useCallback(() => {
    setMessage("");
    setOnline(true);
    startTracking();
  }, [startTracking]);

  const handleGoOffline = useCallback(async () => {
    setOnline(false);
    stopTracking();

    await setWorkerOffline();

    setMessage("You are now offline.");
  }, [setWorkerOffline, stopTracking]);

  const handleToggle = useCallback(async () => {
    if (online) {
      await handleGoOffline();
      return;
    }

    handleGoOnline();
  }, [handleGoOffline, handleGoOnline, online]);

  useEffect(() => {
    if (!online) {
      return;
    }

    if (!isTracking && !locating) {
      startTracking();
    }
  }, [isTracking, locating, online, startTracking]);
  useEffect(() => {
    let active = true;

    async function loadWorkerOnlineStatus() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !active) {
        return;
      }

      const { data, error } = await supabase
        .from("worker_locations")
        .select("is_online")
        .eq("worker_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Failed to load worker online status:", error);
        return;
      }

      if (!active) {
        return;
      }

      const isOnline = data?.is_online === true;

      setOnline(isOnline);

      if (isOnline) {
        startTracking();
      }
    }

    void loadWorkerOnlineStatus();

    return () => {
      active = false;
    };
  }, [startTracking]);

  const latitude = liveLocation?.coordinates[1] ?? null;

  const longitude = liveLocation?.coordinates[0] ?? null;

  const accuracy = liveLocation?.accuracy ?? null;

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
              online
                ? "bg-emerald-100 text-emerald-600"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {online ? (
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
                  online
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {online ? "ONLINE" : "OFFLINE"}
              </span>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              {online
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
            online
              ? "bg-rose-600 hover:bg-rose-700"
              : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {locating ? (
            <>
              <LoaderCircle className="h-5 w-5 animate-spin" />
              Getting Location...
            </>
          ) : online ? (
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

      {online && (
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
              {syncing
                ? "Updating..."
                : liveLocation
                  ? "Synced"
                  : "Waiting for location"}
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

      {(message || syncError) && (
        <div
          className={`border-t px-6 py-4 text-sm ${
            syncError
              ? "border-red-100 bg-red-50 text-red-700"
              : "border-blue-100 bg-blue-50 text-blue-700"
          }`}
        >
          {syncError || message}
        </div>
      )}
    </section>
  );
}
