import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { supabase } from "../lib/supabase";
import {
  WorkerLocationContext,
  type WorkerLocation,
  type WorkerLocationContextValue,
} from "./WorkerLocationContext";

interface WorkerLocationProviderProps {
  children: ReactNode;
}

interface PendingWorkerLocation {
  workerId: string;
  location: WorkerLocation;
}

const WORKER_ONLINE_STORAGE_KEY = "livelihoodgo_worker_online";
const PENDING_LOCATION_STORAGE_KEY = "livelihoodgo_pending_worker_location";

const MIN_LOCATION_SAVE_INTERVAL_MS = 4_000;
const INITIAL_LOCATION_TIMEOUT_MS = 20_000;
const WATCH_LOCATION_TIMEOUT_MS = 20_000;
const LOCATION_HEARTBEAT_INTERVAL_MS = 20_000;
const HEARTBEAT_RESUME_DEBOUNCE_MS = 1_000;

/*
 * Desktop browsers may initially return a coarse network location.
 * Do not upload extremely inaccurate readings because they create
 * incorrect routes. A phone with Precise Location normally returns
 * readings below 100 metres.
 */
/*
 * Reject extremely coarse readings that can place the worker several
 * kilometres away and produce incorrect nearby-worker, route, and ETA data.
 * Readings above 5 km are not reliable enough for service navigation.
 */
const MAX_USABLE_ACCURACY_METERS = 5_000;
const LOW_ACCURACY_WARNING_METERS = 100;

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: INITIAL_LOCATION_TIMEOUT_MS,
};

function normalizePosition(position: GeolocationPosition): WorkerLocation {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: Number.isFinite(position.coords.accuracy)
      ? position.coords.accuracy
      : null,
    heading:
      typeof position.coords.heading === "number" &&
      Number.isFinite(position.coords.heading)
        ? position.coords.heading
        : null,
    speed:
      typeof position.coords.speed === "number" &&
      Number.isFinite(position.coords.speed)
        ? position.coords.speed
        : null,
    updatedAt: new Date(position.timestamp || Date.now()).toISOString(),
  };
}

function getGeolocationMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Location permission was denied. Open your browser site settings and set Location to Allow.";

    case error.POSITION_UNAVAILABLE:
      return "Your location is unavailable. Enable device Location Services or GPS, then try again.";

    case error.TIMEOUT:
      return "GPS request timed out. Move near a window or outdoors, then press Go Online again.";

    default:
      return error.message || "Unable to get your current GPS location.";
  }
}

function validateLocation(location: WorkerLocation): void {
  if (
    !Number.isFinite(location.latitude) ||
    !Number.isFinite(location.longitude) ||
    location.latitude < -90 ||
    location.latitude > 90 ||
    location.longitude < -180 ||
    location.longitude > 180
  ) {
    throw new Error("The browser returned invalid GPS coordinates.");
  }

  if (
    location.accuracy !== null &&
    location.accuracy > MAX_USABLE_ACCURACY_METERS
  ) {
    throw new Error(
      `The browser returned an unusable location (${Math.round(
        location.accuracy,
      )} metres). Enable device Location Services and try again.`,
    );
  }
}

export function WorkerLocationProvider({
  children,
}: WorkerLocationProviderProps) {
  const watchIdRef = useRef<number | null>(null);
  const workerIdRef = useRef<string | null>(null);
  const startPromiseRef = useRef<Promise<void> | null>(null);
  const trackingSessionRef = useRef(0);
  const lastSavedAtRef = useRef(0);
  const latestLocationRef = useRef<WorkerLocation | null>(null);
  const heartbeatInFlightRef = useRef(false);
  const heartbeatResumeTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const [workerLocation, setWorkerLocation] = useState<WorkerLocation | null>(
    null,
  );
  const [isOnline, setIsOnline] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState("");

  const verifyWorkerAccount = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (error) {
      throw new Error(`Unable to verify worker account: ${error.message}`);
    }

    const role =
      typeof data?.role === "string" ? data.role.trim().toLowerCase() : "";

    if (role !== "worker") {
      throw new Error(
        "GPS availability is only available for worker accounts.",
      );
    }
  }, []);

  const cachePendingLocation = useCallback(
    (workerId: string, location: WorkerLocation) => {
      const pending: PendingWorkerLocation = {
        workerId,
        location,
      };

      localStorage.setItem(
        PENDING_LOCATION_STORAGE_KEY,
        JSON.stringify(pending),
      );
    },
    [],
  );

  const clearPendingLocation = useCallback(() => {
    localStorage.removeItem(PENDING_LOCATION_STORAGE_KEY);
  }, []);

  const upsertWorkerLocation = useCallback(
    async (workerId: string, location: WorkerLocation) => {
      validateLocation(location);

      const { error } = await supabase.from("worker_locations").upsert(
        {
          worker_id: workerId,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          heading: location.heading,
          speed: location.speed,
          is_online: true,
          is_available: true,
          updated_at: location.updatedAt,
        },
        {
          onConflict: "worker_id",
        },
      );

      if (error) {
        throw new Error(`Unable to sync GPS: ${error.message}`);
      }

      clearPendingLocation();
    },
    [clearPendingLocation],
  );

  const sendDatabaseHeartbeat = useCallback(
    async (workerId: string, location: WorkerLocation) => {
      validateLocation(location);

      const heartbeatAt = new Date().toISOString();

      const { data, error } = await supabase
        .from("worker_locations")
        .update({
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          heading: location.heading,
          speed: location.speed,
          is_online: true,
          updated_at: heartbeatAt,
        })
        .eq("worker_id", workerId)
        .select("worker_id")
        .maybeSingle();

      if (error) {
        throw new Error(`Unable to send GPS heartbeat: ${error.message}`);
      }

      /*
       * The row may not exist yet after a fresh account/login. In that case,
       * create it once using the normal location upsert.
       */
      if (!data) {
        await upsertWorkerLocation(workerId, {
          ...location,
          updatedAt: heartbeatAt,
        });
      }

      return heartbeatAt;
    },
    [upsertWorkerLocation],
  );

  const setDatabaseOffline = useCallback(async (workerId: string) => {
    const { error } = await supabase
      .from("worker_locations")
      .update({
        is_online: false,
        is_available: false,
        updated_at: new Date().toISOString(),
      })
      .eq("worker_id", workerId);

    if (error) {
      throw new Error(`Unable to update offline status: ${error.message}`);
    }
  }, []);

  const clearWatch = useCallback(() => {
    trackingSessionRef.current += 1;

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    startPromiseRef.current = null;
    setLocating(false);
    setIsTracking(false);
  }, []);

  const applySyncedLocation = useCallback((location: WorkerLocation) => {
    if (!mountedRef.current) return;

    latestLocationRef.current = location;
    setWorkerLocation(location);
    setIsOnline(true);
    setIsTracking(true);
    setLocating(false);

    localStorage.setItem(WORKER_ONLINE_STORAGE_KEY, "true");

    if (
      location.accuracy !== null &&
      location.accuracy > LOW_ACCURACY_WARNING_METERS
    ) {
      setMessage(
        `GPS is online, but accuracy is about ${Math.round(
          location.accuracy,
        )} metres. Enable Precise Location for better navigation.`,
      );
    } else {
      setMessage("");
    }
  }, []);

  const syncPosition = useCallback(
    async (
      workerId: string,
      position: GeolocationPosition,
      sessionId: number,
      force = false,
    ): Promise<void> => {
      if (sessionId !== trackingSessionRef.current) return;

      const location = normalizePosition(position);
      validateLocation(location);

      const now = Date.now();

      if (
        !force &&
        now - lastSavedAtRef.current < MIN_LOCATION_SAVE_INTERVAL_MS
      ) {
        return;
      }

      lastSavedAtRef.current = now;
      latestLocationRef.current = location;
      setWorkerLocation(location);
      setIsTracking(true);

      if (!navigator.onLine) {
        cachePendingLocation(workerId, location);
        setIsOnline(false);
        setLocating(false);
        setMessage(
          "Offline mode: GPS is active. The latest location will sync automatically when internet returns.",
        );
        return;
      }

      try {
        await upsertWorkerLocation(workerId, location);

        if (sessionId !== trackingSessionRef.current) return;

        applySyncedLocation(location);
      } catch (error) {
        if (sessionId !== trackingSessionRef.current) return;

        cachePendingLocation(workerId, location);
        setIsOnline(false);
        setIsTracking(true);
        setLocating(false);
        setMessage(
          error instanceof Error
            ? `${error.message} The GPS reading was saved locally and will retry when online.`
            : "Unable to sync GPS. The reading was saved locally.",
        );
      }
    },
    [applySyncedLocation, cachePendingLocation, upsertWorkerLocation],
  );

  const getInitialPosition = useCallback(
    (): Promise<GeolocationPosition> =>
      new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          GEOLOCATION_OPTIONS,
        );
      }),
    [],
  );

  const startBrowserTracking = useCallback(async (): Promise<void> => {
    if (startPromiseRef.current) {
      return startPromiseRef.current;
    }

    if (watchIdRef.current !== null && isTracking) {
      return;
    }

    const startPromise = (async () => {
      if (!window.isSecureContext && location.hostname !== "localhost") {
        throw new Error(
          "GPS requires HTTPS. Open the deployed HTTPS website or localhost.",
        );
      }

      if (!("geolocation" in navigator)) {
        throw new Error("This browser or device does not support geolocation.");
      }

      clearWatch();
      setLocating(true);
      setMessage("Requesting GPS permission and current location...");

      const sessionId = trackingSessionRef.current;

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Worker account is not authenticated.");

      await verifyWorkerAccount(user.id);

      if (sessionId !== trackingSessionRef.current) return;

      workerIdRef.current = user.id;

      /*
       * Obtain one deterministic initial fix first. This makes Go Online
       * reliable on browsers that do not immediately call watchPosition().
       */
      const initialPosition =
        await getInitialPosition();

      if (sessionId !== trackingSessionRef.current) return;

      await syncPosition(user.id, initialPosition, sessionId, true);

      if (sessionId !== trackingSessionRef.current) return;

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          void syncPosition(user.id, position, sessionId, false).catch(
            (error: unknown) => {
              if (
                mountedRef.current &&
                sessionId === trackingSessionRef.current
              ) {
                setMessage(
                  error instanceof Error
                    ? error.message
                    : "Unable to process the latest GPS location.",
                );
              }
            },
          );
        },
        (error) => {
          if (!mountedRef.current || sessionId !== trackingSessionRef.current) {
            return;
          }

          /*
           * A temporary watch error should not remove an already-synced
           * location. Keep the last position visible and allow retry.
           */
          setLocating(false);
          setMessage(getGeolocationMessage(error));

          if (error.code === error.PERMISSION_DENIED) {
            clearWatch();
            setIsOnline(false);
            setIsTracking(false);
            localStorage.removeItem(WORKER_ONLINE_STORAGE_KEY);
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5_000,
          timeout: WATCH_LOCATION_TIMEOUT_MS,
        },
      );

      watchIdRef.current = watchId;
      setIsTracking(true);
      setLocating(false);
    })()
      .catch((error: unknown) => {
        clearWatch();
        setWorkerLocation(null);
        setIsOnline(false);
        setIsTracking(false);
        setLocating(false);
        localStorage.removeItem(WORKER_ONLINE_STORAGE_KEY);

        if (
          typeof GeolocationPositionError !== "undefined" &&
          error instanceof GeolocationPositionError
        ) {
          setMessage(getGeolocationMessage(error));
        } else {
          setMessage(
            error instanceof Error
              ? error.message
              : "Unable to start GPS tracking.",
          );
        }
      })
      .finally(() => {
        startPromiseRef.current = null;
      });

    startPromiseRef.current = startPromise;
    return startPromise;
  }, [
    clearWatch,
    getInitialPosition,
    isTracking,
    syncPosition,
    verifyWorkerAccount,
  ]);

  const goOnline = useCallback(async () => {
    if (locating) {
      /*
       * Pressing the loading button acts as Cancel, so it can never feel
       * permanently disabled.
       */
      clearWatch();
      setMessage("GPS request cancelled. Press Go Online to try again.");
      return;
    }

    await startBrowserTracking();
  }, [clearWatch, locating, startBrowserTracking]);

  const goOffline = useCallback(async () => {
    const knownWorkerId = workerIdRef.current;

    clearWatch();
    latestLocationRef.current = null;
    setWorkerLocation(null);
    setIsOnline(false);
    setIsTracking(false);
    setLocating(false);
    setMessage("");

    localStorage.removeItem(WORKER_ONLINE_STORAGE_KEY);
    clearPendingLocation();

    let workerId = knownWorkerId;

    if (!workerId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      workerId = user?.id ?? null;
    }

    if (!workerId) {
      workerIdRef.current = null;
      return;
    }

    try {
      await verifyWorkerAccount(workerId);
      await setDatabaseOffline(workerId);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Tracking stopped, but the offline status could not be synced.",
      );
    } finally {
      workerIdRef.current = null;
    }
  }, [
    clearPendingLocation,
    clearWatch,
    setDatabaseOffline,
    verifyWorkerAccount,
  ]);

  useEffect(() => {
    const flushPending = async () => {
      if (!navigator.onLine) return;

      const raw = localStorage.getItem(PENDING_LOCATION_STORAGE_KEY);

      if (!raw) return;

      try {
        const pending = JSON.parse(raw) as PendingWorkerLocation;

        if (!pending.workerId || !pending.location) {
          clearPendingLocation();
          return;
        }

        validateLocation(pending.location);
        await upsertWorkerLocation(pending.workerId, pending.location);

        workerIdRef.current = pending.workerId;
        applySyncedLocation(pending.location);
        setMessage("Connection restored. Latest GPS location synced.");

        window.setTimeout(() => {
          if (mountedRef.current) setMessage("");
        }, 3_000);
      } catch (error) {
        console.error("Unable to sync pending GPS:", error);
      }
    };

    const handleOffline = () => {
      if (!mountedRef.current) return;

      if (workerLocation && workerIdRef.current) {
        cachePendingLocation(workerIdRef.current, workerLocation);
      }

      setIsOnline(false);
      setMessage(
        "Internet connection lost. GPS remains active and will sync when reconnected.",
      );
    };

    window.addEventListener("online", flushPending);
    window.addEventListener("offline", handleOffline);

    void flushPending();

    return () => {
      window.removeEventListener("online", flushPending);
      window.removeEventListener("offline", handleOffline);
    };
  }, [
    applySyncedLocation,
    cachePendingLocation,
    clearPendingLocation,
    upsertWorkerLocation,
    workerLocation,
  ]);

  useEffect(() => {
    const shouldKeepOnline =
      isTracking ||
      isOnline ||
      localStorage.getItem(WORKER_ONLINE_STORAGE_KEY) === "true";

    if (!shouldKeepOnline) {
      return;
    }

    let active = true;

    const sendHeartbeat = async () => {
      if (
        !active ||
        heartbeatInFlightRef.current ||
        !navigator.onLine
      ) {
        return;
      }

      const workerId = workerIdRef.current;
      const latestLocation = latestLocationRef.current;

      if (!workerId || !latestLocation) {
        return;
      }

      heartbeatInFlightRef.current = true;

      try {
        const heartbeatAt = await sendDatabaseHeartbeat(
          workerId,
          latestLocation,
        );

        if (!active || !mountedRef.current) {
          return;
        }

        const heartbeatLocation: WorkerLocation = {
          ...latestLocation,
          updatedAt: heartbeatAt,
        };

        latestLocationRef.current = heartbeatLocation;
        setWorkerLocation(heartbeatLocation);
        setIsOnline(true);
        setIsTracking(true);
        localStorage.setItem(WORKER_ONLINE_STORAGE_KEY, "true");
      } catch (error) {
        if (!active || !mountedRef.current) {
          return;
        }

        cachePendingLocation(workerId, {
          ...latestLocation,
          updatedAt: new Date().toISOString(),
        });

        /*
         * Keep the local online state while GPS tracking is still active. A
         * temporary network failure must not make the worker appear to have
         * pressed Go Offline.
         */
        setMessage(
          error instanceof Error
            ? `${error.message} Retrying automatically.`
            : "Unable to send the GPS heartbeat. Retrying automatically.",
        );
      } finally {
        heartbeatInFlightRef.current = false;
      }
    };

    const scheduleImmediateHeartbeat = () => {
      if (heartbeatResumeTimerRef.current !== null) {
        window.clearTimeout(heartbeatResumeTimerRef.current);
      }

      heartbeatResumeTimerRef.current = window.setTimeout(() => {
        heartbeatResumeTimerRef.current = null;
        void sendHeartbeat();
      }, HEARTBEAT_RESUME_DEBOUNCE_MS);
    };

    /* Send immediately when the effect starts, then keep the row fresh. */
    void sendHeartbeat();

    const heartbeatTimer = window.setInterval(
      () => void sendHeartbeat(),
      LOCATION_HEARTBEAT_INTERVAL_MS,
    );

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        scheduleImmediateHeartbeat();
      }
    };

    const handleResume = () => {
      scheduleImmediateHeartbeat();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleResume);
    window.addEventListener("pageshow", handleResume);
    window.addEventListener("online", handleResume);

    return () => {
      active = false;
      heartbeatInFlightRef.current = false;
      window.clearInterval(heartbeatTimer);

      if (heartbeatResumeTimerRef.current !== null) {
        window.clearTimeout(heartbeatResumeTimerRef.current);
        heartbeatResumeTimerRef.current = null;
      }

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
      window.removeEventListener("focus", handleResume);
      window.removeEventListener("pageshow", handleResume);
      window.removeEventListener("online", handleResume);
    };
  }, [
    cachePendingLocation,
    isOnline,
    isTracking,
    sendDatabaseHeartbeat,
  ]);

  useEffect(() => {
    let active = true;

    async function restoreTracking() {
      const shouldRestore =
        localStorage.getItem(WORKER_ONLINE_STORAGE_KEY) === "true";

      if (!shouldRestore || !active) return;

      await startBrowserTracking();
    }

    void restoreTracking();

    return () => {
      active = false;
    };
  }, [startBrowserTracking]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      trackingSessionRef.current += 1;

      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const value = useMemo<WorkerLocationContextValue>(
    () => ({
      workerLocation,
      isOnline,
      isTracking,
      locating,
      message,
      goOnline,
      goOffline,
    }),
    [
      workerLocation,
      isOnline,
      isTracking,
      locating,
      message,
      goOnline,
      goOffline,
    ],
  );

  return (
    <WorkerLocationContext.Provider value={value}>
      {children}
    </WorkerLocationContext.Provider>
  );
}

