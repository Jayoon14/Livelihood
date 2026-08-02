import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { Marker, type Map as MapLibreMap } from "maplibre-gl";

import { supabase } from "../../../lib/supabase";
import type { Coordinates } from "../types";

interface WorkerLocationRow {
  worker_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  is_online: boolean;
  is_available: boolean;
  updated_at: string;
}

export interface WorkerProfile {
  id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  profile_picture: string | null;
}

export interface NearbyWorker extends WorkerLocationRow {
  distanceMeters: number | null;
  profile: WorkerProfile | null;
}

interface UseNearbyWorkersParams {
  mapRef: MutableRefObject<MapLibreMap | null>;
  currentLocationRef: MutableRefObject<Coordinates | null>;
  enabled: boolean;
  radiusKilometers?: number;
  onWorkerSelect?: (worker: NearbyWorker) => void;
}

interface WorkerMarkerRecord {
  marker: Marker;
  element: HTMLDivElement;
  coordinates: Coordinates;
  cleanupClick: () => void;
}

const STALE_GPS_THRESHOLD_MS = 2 * 60 * 1000;
const MAX_FUTURE_TIMESTAMP_DRIFT_MS = 60_000;
const MAX_NEARBY_ACCURACY_METERS = 1_000;
const REFRESH_INTERVAL_MS = 30_000;

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function calculateDistanceMeters(
  first: Coordinates,
  second: Coordinates,
): number {
  const earthRadiusMeters = 6_371_000;
  const [firstLongitude, firstLatitude] = first;
  const [secondLongitude, secondLatitude] = second;

  const latitudeDifference = degreesToRadians(secondLatitude - firstLatitude);
  const longitudeDifference = degreesToRadians(
    secondLongitude - firstLongitude,
  );

  const firstLatitudeRadians = degreesToRadians(firstLatitude);
  const secondLatitudeRadians = degreesToRadians(secondLatitude);

  const a =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(firstLatitudeRadians) *
      Math.cos(secondLatitudeRadians) *
      Math.sin(longitudeDifference / 2) ** 2;

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isValidCoordinates(longitude: number, latitude: number): boolean {
  return (
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  );
}

function hasFreshGps(worker: WorkerLocationRow): boolean {
  const updatedAt = new Date(worker.updated_at).getTime();

  if (!Number.isFinite(updatedAt)) {
    return false;
  }

  const ageMilliseconds = Date.now() - updatedAt;

  return (
    ageMilliseconds >= -MAX_FUTURE_TIMESTAMP_DRIFT_MS &&
    ageMilliseconds <= STALE_GPS_THRESHOLD_MS
  );
}

function hasUsableAccuracy(worker: WorkerLocationRow): boolean {
  return (
    worker.accuracy === null ||
    (Number.isFinite(worker.accuracy) &&
      worker.accuracy >= 0 &&
      worker.accuracy <= MAX_NEARBY_ACCURACY_METERS)
  );
}

function createWorkerMarkerElement(): HTMLDivElement {
  const container = document.createElement("div");

  container.className = "livelihood-worker-marker";
  container.style.width = "48px";
  container.style.height = "48px";
  container.style.display = "flex";
  container.style.alignItems = "center";
  container.style.justifyContent = "center";
  container.style.cursor = "pointer";

  container.innerHTML = `
    <div
      data-worker-marker-icon
      style="
        position:relative;
        display:flex;
        width:44px;
        height:44px;
        align-items:center;
        justify-content:center;
        border:3px solid white;
        border-radius:9999px;
        background:#16a34a;
        box-shadow:
          0 8px 20px rgba(15,23,42,.25),
          0 0 0 4px rgba(34,197,94,.18);
      "
    >
      <svg
        width="23"
        height="23"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a8 8 0 1 0-14.8 0"></path>
        <path d="M8.5 19h7"></path>
        <path d="M12 15v4"></path>
      </svg>

      <span
        style="
          position:absolute;
          right:-1px;
          bottom:-1px;
          width:12px;
          height:12px;
          border:2px solid white;
          border-radius:9999px;
          background:#22c55e;
        "
      ></span>
    </div>
  `;

  return container;
}

export function useNearbyWorkers({
  mapRef,
  currentLocationRef,
  enabled,
  radiusKilometers = 20,
  onWorkerSelect,
}: UseNearbyWorkersParams) {
  const markerRecordsRef = useRef<Map<string, WorkerMarkerRecord>>(new Map());
  const animationFramesRef = useRef<Map<string, number>>(new Map());
  const workersRef = useRef<Map<string, NearbyWorker>>(new Map());
  const workerProfilesRef = useRef<Map<string, WorkerProfile>>(new Map());
  const mountedRef = useRef(true);
  const channelIdRef = useRef(`customer-nearby-workers-${crypto.randomUUID()}`);

  const [nearbyWorkers, setNearbyWorkers] = useState<NearbyWorker[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [nearbyWorkersError, setNearbyWorkersError] = useState("");

  const publishWorkers = useCallback(() => {
    if (!mountedRef.current) {
      return;
    }

    setNearbyWorkers(
      [...workersRef.current.values()].sort(
        (first, second) =>
          (first.distanceMeters ?? Number.POSITIVE_INFINITY) -
          (second.distanceMeters ?? Number.POSITIVE_INFINITY),
      ),
    );
  }, []);

  const removeWorker = useCallback((workerId: string) => {
    const animationFrame = animationFramesRef.current.get(workerId);

    if (animationFrame !== undefined) {
      cancelAnimationFrame(animationFrame);
      animationFramesRef.current.delete(workerId);
    }

    const record = markerRecordsRef.current.get(workerId);

    record?.cleanupClick();
    record?.marker.remove();

    markerRecordsRef.current.delete(workerId);
    workersRef.current.delete(workerId);
  }, []);

  const clearAllWorkers = useCallback(() => {
    for (const animationFrame of animationFramesRef.current.values()) {
      cancelAnimationFrame(animationFrame);
    }

    animationFramesRef.current.clear();

    for (const record of markerRecordsRef.current.values()) {
      record.cleanupClick();
      record.marker.remove();
    }

    markerRecordsRef.current.clear();
    workersRef.current.clear();

    if (mountedRef.current) {
      setNearbyWorkers([]);
    }
  }, []);

  const getDistance = useCallback(
    (worker: WorkerLocationRow): number | null => {
      const origin = currentLocationRef.current;

      if (!origin) {
        return null;
      }

      return calculateDistanceMeters(origin, [
        worker.longitude,
        worker.latitude,
      ]);
    },
    [currentLocationRef],
  );

  const getWorkerProfile = useCallback(
    async (workerId: string): Promise<WorkerProfile | null> => {
      const cached = workerProfilesRef.current.get(workerId);

      if (cached) {
        return cached;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, middle_name, last_name, profile_picture")
        .eq("id", workerId)
        .eq("role", "worker")
        .eq("status", "Approved")
        .maybeSingle();

      if (error) {
        console.error("Unable to load nearby worker profile:", error);
        return null;
      }

      const profile = (data as WorkerProfile | null) ?? null;

      if (profile) {
        workerProfilesRef.current.set(profile.id, profile);
      }

      return profile;
    },
    [],
  );

  const animateMarker = useCallback(
    (workerId: string, destination: Coordinates, durationMs = 800) => {
      const record = markerRecordsRef.current.get(workerId);

      if (!record) {
        return;
      }

      const previousFrame = animationFramesRef.current.get(workerId);

      if (previousFrame !== undefined) {
        cancelAnimationFrame(previousFrame);
      }

      const start = record.coordinates;
      const startedAt = performance.now();

      const animate = (now: number) => {
        const progress = Math.min((now - startedAt) / durationMs, 1);
        const eased =
          progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        const longitude = start[0] + (destination[0] - start[0]) * eased;
        const latitude = start[1] + (destination[1] - start[1]) * eased;

        record.marker.setLngLat([longitude, latitude]);

        if (progress < 1) {
          const frame = requestAnimationFrame(animate);
          animationFramesRef.current.set(workerId, frame);
          return;
        }

        record.coordinates = destination;
        animationFramesRef.current.delete(workerId);
      };

      const frame = requestAnimationFrame(animate);
      animationFramesRef.current.set(workerId, frame);
    },
    [],
  );

  const applyHeading = useCallback(
    (element: HTMLDivElement, heading: number | null) => {
      const icon = element.querySelector<HTMLElement>(
        "[data-worker-marker-icon]",
      );

      if (!icon) {
        return;
      }

      const validHeading =
        typeof heading === "number" && Number.isFinite(heading) ? heading : 0;

      icon.style.transition = "transform 400ms ease";
      icon.style.transform = `rotate(${validHeading}deg)`;
    },
    [],
  );

  const processWorker = useCallback(
    async (worker: WorkerLocationRow) => {
      const map = mapRef.current;

      if (!map) {
        return;
      }

      if (!isValidCoordinates(worker.longitude, worker.latitude)) {
        removeWorker(worker.worker_id);
        publishWorkers();
        return;
      }

      const distanceMeters = getDistance(worker);

      /*
       * Do not display a worker until the customer's current location is
       * available. Treating a null distance as inside the radius can show a
       * worker who is actually far away.
       */
      const insideRadius =
        distanceMeters !== null && distanceMeters <= radiusKilometers * 1_000;

      const shouldDisplay =
        worker.is_online &&
        worker.is_available &&
        hasFreshGps(worker) &&
        hasUsableAccuracy(worker) &&
        insideRadius;

      if (!shouldDisplay) {
        removeWorker(worker.worker_id);
        publishWorkers();
        return;
      }

      const profile = await getWorkerProfile(worker.worker_id);

      if (!mountedRef.current) {
        return;
      }

      const nearbyWorker: NearbyWorker = {
        ...worker,
        distanceMeters,
        profile,
      };

      workersRef.current.set(worker.worker_id, nearbyWorker);

      const handleClick = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();

        const latest = workersRef.current.get(worker.worker_id);

        if (latest) {
          onWorkerSelect?.(latest);
        }
      };

      const destination: Coordinates = [worker.longitude, worker.latitude];

      const existing = markerRecordsRef.current.get(worker.worker_id);

      if (existing) {
        animateMarker(worker.worker_id, destination);
        applyHeading(existing.element, worker.heading);

        existing.cleanupClick();
        existing.element.addEventListener("click", handleClick);
        existing.cleanupClick = () => {
          existing.element.removeEventListener("click", handleClick);
        };

        publishWorkers();
        return;
      }

      const element = createWorkerMarkerElement();

      applyHeading(element, worker.heading);
      element.addEventListener("click", handleClick);

      const marker = new Marker({
        element,
        anchor: "center",
      })
        .setLngLat(destination)
        .addTo(map);

      markerRecordsRef.current.set(worker.worker_id, {
        marker,
        element,
        coordinates: destination,
        cleanupClick: () => {
          element.removeEventListener("click", handleClick);
        },
      });

      publishWorkers();
    },
    [
      animateMarker,
      applyHeading,
      getDistance,
      getWorkerProfile,
      mapRef,
      onWorkerSelect,
      publishWorkers,
      radiusKilometers,
      removeWorker,
    ],
  );

  const loadNearbyWorkers = useCallback(async (): Promise<void> => {
    if (!enabled) {
      return;
    }

    if (mountedRef.current) {
      setLoadingWorkers(true);
      setNearbyWorkersError("");
    }

    try {
      const { data, error } = await supabase
        .from("worker_locations")
        .select(
          "worker_id, latitude, longitude, accuracy, heading, speed, is_online, is_available, updated_at",
        )
        .eq("is_online", true)
        .eq("is_available", true);

      if (error) {
        throw error;
      }

      const rows = (data ?? []) as WorkerLocationRow[];
      const receivedIds = new Set(rows.map((row) => row.worker_id));

      await Promise.all(rows.map((row) => processWorker(row)));

      for (const workerId of [...workersRef.current.keys()]) {
        if (!receivedIds.has(workerId)) {
          removeWorker(workerId);
        }
      }

      publishWorkers();
    } catch (error) {
      console.error("Unable to load nearby workers:", error);

      if (mountedRef.current) {
        setNearbyWorkersError("Unable to load nearby workers.");
      }
    } finally {
      if (mountedRef.current) {
        setLoadingWorkers(false);
      }
    }
  }, [enabled, processWorker, publishWorkers, removeWorker]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  /*
   * One effect owns exactly one realtime channel.
   * All postgres_changes callbacks are registered before subscribe().
   */
  useEffect(() => {
    if (!enabled) {
      clearAllWorkers();
      return;
    }

    void loadNearbyWorkers();

    const channel = supabase
      .channel(channelIdRef.current)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "worker_locations",
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const deleted = payload.old as Partial<WorkerLocationRow>;

            if (deleted.worker_id) {
              removeWorker(deleted.worker_id);
              publishWorkers();
            }

            return;
          }

          void processWorker(payload.new as WorkerLocationRow);
        },
      )
      .subscribe((status) => {
        if (!mountedRef.current) {
          return;
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setNearbyWorkersError(
            "Realtime worker tracking connection failed. Retrying automatically.",
          );
          return;
        }

        if (status === "SUBSCRIBED") {
          setNearbyWorkersError("");
        }
      });

    const refreshTimer = window.setInterval(() => {
      void loadNearbyWorkers();
    }, REFRESH_INTERVAL_MS);

    const handleOnline = () => {
      void loadNearbyWorkers();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadNearbyWorkers();
      }
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(refreshTimer);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void supabase.removeChannel(channel);
      clearAllWorkers();
    };
  }, [
    clearAllWorkers,
    enabled,
    loadNearbyWorkers,
    processWorker,
    publishWorkers,
    removeWorker,
  ]);

  const refreshNearbyWorkers = useCallback(() => {
    void loadNearbyWorkers();
  }, [loadNearbyWorkers]);

  return {
    nearbyWorkers,
    nearbyWorkersCount: nearbyWorkers.length,
    loadingWorkers,
    nearbyWorkersError,
    refreshNearbyWorkers,
  };
}
