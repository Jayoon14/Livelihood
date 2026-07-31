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
  profile?: WorkerProfile | null;
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

const WORKER_MARKER_CLASS = "livelihood-worker-marker";
const STALE_GPS_THRESHOLD = 2 * 60 * 1000;

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}

function calculateDistanceMeters(first: Coordinates, second: Coordinates) {
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

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
}

function buildWorkerName(profile?: WorkerProfile | null): string {
  if (!profile) return "Available Worker";

  return [
    profile.first_name,
    profile.middle_name,
    profile.last_name,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" ") || "Available Worker";
}

function createWorkerMarkerElement(profile?: WorkerProfile | null) {
  const container = document.createElement("div");

  container.className = WORKER_MARKER_CLASS;

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
    position: relative;
    display: flex;
    width: 44px;
    height: 44px;
    align-items: center;
    justify-content: center;
    border: 3px solid white;
    border-radius: 9999px;
    background: #16a34a;
    box-shadow:
      0 8px 20px rgba(15, 23, 42, 0.25),
      0 0 0 4px rgba(34, 197, 94, 0.18);
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
      position: absolute;
      right: -1px;
      bottom: -1px;
      width: 12px;
      height: 12px;
      border: 2px solid white;
      border-radius: 9999px;
      background: #22c55e;
    "
  ></span>

  <div
    data-worker-tooltip
    style="
      pointer-events: none;
      position: absolute;
      left: 50%;
      bottom: calc(100% + 12px);
      min-width: 180px;
      transform: translate(-50%, 6px);
      opacity: 0;
      visibility: hidden;
      border: 1px solid rgba(15, 23, 42, 0.12);
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.98);
      padding: 10px 12px;
      box-shadow: 0 14px 30px rgba(15, 23, 42, 0.22);
      color: #0f172a;
      transition: opacity 160ms ease, transform 160ms ease;
      white-space: nowrap;
      z-index: 50;
    "
  >
    <div style="font-size: 13px; font-weight: 800;">
      ${buildWorkerName(profile)}
    </div>
    <div style="margin-top: 2px; font-size: 11px; font-weight: 700; color: #16a34a;">
      Online • Available
    </div>
  </div>
</div>
`;

  const tooltip = container.querySelector<HTMLElement>(
    "[data-worker-tooltip]",
  );

  const showTooltip = () => {
    if (!tooltip) return;
    tooltip.style.opacity = "1";
    tooltip.style.visibility = "visible";
    tooltip.style.transform = "translate(-50%, 0)";
  };

  const hideTooltip = () => {
    if (!tooltip) return;
    tooltip.style.opacity = "0";
    tooltip.style.visibility = "hidden";
    tooltip.style.transform = "translate(-50%, 6px)";
  };

  container.addEventListener("mouseenter", showTooltip);
  container.addEventListener("mouseleave", hideTooltip);
  container.addEventListener("focusin", showTooltip);
  container.addEventListener("focusout", hideTooltip);
  container.tabIndex = 0;
  container.setAttribute("aria-label", `${buildWorkerName(profile)}, online and available`);

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

  const [nearbyWorkers, setNearbyWorkers] = useState<NearbyWorker[]>([]);

  const [loadingWorkers, setLoadingWorkers] = useState(false);

  const [nearbyWorkersError, setNearbyWorkersError] = useState("");

  const getWorkerDistance = useCallback(
    (worker: WorkerLocationRow) => {
      const customerCoordinates = currentLocationRef.current;

      if (!customerCoordinates) {
        return null;
      }

      const workerCoordinates: Coordinates = [
        worker.longitude,
        worker.latitude,
      ];

      return calculateDistanceMeters(customerCoordinates, workerCoordinates);
    },
    [currentLocationRef],
  );

  const workerIsInsideRadius = useCallback(
    (distanceMeters: number | null) => {
      if (distanceMeters === null) {
        return true;
      }

      return distanceMeters <= radiusKilometers * 1_000;
    },
    [radiusKilometers],
  );

  const workerHasFreshGps = useCallback((worker: WorkerLocationRow) => {
    const lastUpdate = new Date(worker.updated_at).getTime();

    if (!Number.isFinite(lastUpdate)) {
      return false;
    }

    return Date.now() - lastUpdate <= STALE_GPS_THRESHOLD;
  }, []);

  const removeWorkerMarker = useCallback((workerId: string) => {
    const animationFrame = animationFramesRef.current.get(workerId);

    if (animationFrame !== undefined) {
      cancelAnimationFrame(animationFrame);

      animationFramesRef.current.delete(workerId);
    }

    const existingRecord = markerRecordsRef.current.get(workerId);

    existingRecord?.cleanupClick();

    existingRecord?.marker.remove();

    markerRecordsRef.current.delete(workerId);

    workersRef.current.delete(workerId);
  }, []);

  const animateWorkerMarker = useCallback(
    (
      workerId: string,
      destination: Coordinates,
      durationMilliseconds = 1_000,
    ) => {
      const record = markerRecordsRef.current.get(workerId);

      if (!record) {
        return;
      }

      const previousAnimationFrame = animationFramesRef.current.get(workerId);

      if (previousAnimationFrame !== undefined) {
        cancelAnimationFrame(previousAnimationFrame);
      }

      const startingCoordinates = record.coordinates;

      const animationStartedAt = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - animationStartedAt;

        const progress = Math.min(elapsed / durationMilliseconds, 1);

        const easedProgress =
          progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        const longitude =
          startingCoordinates[0] +
          (destination[0] - startingCoordinates[0]) * easedProgress;

        const latitude =
          startingCoordinates[1] +
          (destination[1] - startingCoordinates[1]) * easedProgress;

        record.marker.setLngLat([longitude, latitude]);

        if (progress < 1) {
          const animationFrame = requestAnimationFrame(animate);

          animationFramesRef.current.set(workerId, animationFrame);

          return;
        }

        record.coordinates = destination;

        animationFramesRef.current.delete(workerId);
      };

      const animationFrame = requestAnimationFrame(animate);

      animationFramesRef.current.set(workerId, animationFrame);
    },
    [],
  );

  const updateWorkerHeading = useCallback(
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
  const createOrUpdateWorkerMarker = useCallback(
    (worker: WorkerLocationRow) => {
      const map = mapRef.current;

      if (!map) {
        return;
      }

      const distanceMeters = getWorkerDistance(worker);

      console.log("Distance Debug", {
        customerLongitude: currentLocationRef.current?.[0],
        customerLatitude: currentLocationRef.current?.[1],
        workerLongitude: worker.longitude,
        workerLatitude: worker.latitude,
        distanceMeters,
      });

      const profile = workerProfilesRef.current.get(worker.worker_id) ?? null;

      const shouldDisplay =
        worker.is_online &&
        worker.is_available &&
        workerHasFreshGps(worker) &&
        workerIsInsideRadius(distanceMeters);

      if (!shouldDisplay) {
        removeWorkerMarker(worker.worker_id);
        return;
      }

      const nearbyWorker: NearbyWorker = {
        ...worker,
        distanceMeters,
        profile,
      };

      const handleWorkerClick = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();

        onWorkerSelect?.(nearbyWorker);
      };

      workersRef.current.set(worker.worker_id, nearbyWorker);

      const existingRecord = markerRecordsRef.current.get(worker.worker_id);

      if (existingRecord) {
        const destination: Coordinates = [worker.longitude, worker.latitude];

        animateWorkerMarker(worker.worker_id, destination);

        updateWorkerHeading(existingRecord.element, worker.heading);

        existingRecord.cleanupClick();

        existingRecord.element.addEventListener("click", handleWorkerClick);

        existingRecord.cleanupClick = () => {
          existingRecord.element.removeEventListener(
            "click",
            handleWorkerClick,
          );
        };

        return;
      }

      const element = createWorkerMarkerElement(profile);

      updateWorkerHeading(element, worker.heading);

      element.addEventListener("click", handleWorkerClick);

      const cleanupClick = () => {
        element.removeEventListener("click", handleWorkerClick);
      };

      const marker = new Marker({
        element,
        anchor: "center",
      })
        .setLngLat([worker.longitude, worker.latitude])
        .addTo(map);

      markerRecordsRef.current.set(worker.worker_id, {
        marker,
        element,
        coordinates: [worker.longitude, worker.latitude],
        cleanupClick,
      });
    },
    [
      animateWorkerMarker,
      getWorkerDistance,
      mapRef,
      onWorkerSelect,
      removeWorkerMarker,
      updateWorkerHeading,
      workerHasFreshGps,
      workerIsInsideRadius,
    ],
  );
  const refreshWorkersState = useCallback(() => {
    const workers = Array.from(workersRef.current.values()).sort(
      (firstWorker, secondWorker) => {
        const firstDistance =
          firstWorker.distanceMeters ?? Number.POSITIVE_INFINITY;

        const secondDistance =
          secondWorker.distanceMeters ?? Number.POSITIVE_INFINITY;

        return firstDistance - secondDistance;
      },
    );

    setNearbyWorkers(workers);
  }, []);

  const loadWorkerProfiles = useCallback(async (workerIds: string[]) => {
    const missingWorkerIds = workerIds.filter(
      (workerId) => !workerProfilesRef.current.has(workerId),
    );

    if (missingWorkerIds.length === 0) {
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select(
        `
              id,
              first_name,
              middle_name,
              last_name,
              profile_picture
            `,
      )
      .in("id", missingWorkerIds)
      .eq("role", "worker")
      .eq("status", "Approved");

    if (error) {
      console.error("Unable to load worker profiles:", error);

      return;
    }

    for (const profile of (data ?? []) as WorkerProfile[]) {
      workerProfilesRef.current.set(profile.id, profile);
    }
  }, []);

  const loadNearbyWorkers = useCallback(async () => {
    if (!enabled) {
      return;
    }

    setLoadingWorkers(true);
    setNearbyWorkersError("");

    const { data, error } = await supabase
      .from("worker_locations")
      .select(
        `
              worker_id,
              latitude,
              longitude,
              accuracy,
              heading,
              speed,
              is_online,
              is_available,
              updated_at
            `,
      )
      .eq("is_online", true)
      .eq("is_available", true);

    setLoadingWorkers(false);

    if (error) {
      console.error("Unable to load nearby workers:", error);

      setNearbyWorkersError("Unable to load nearby workers.");

      return;
    }

    const workerLocations = (data ?? []) as WorkerLocationRow[];

    await loadWorkerProfiles(workerLocations.map((worker) => worker.worker_id));

    const receivedWorkerIds = new Set<string>();

    for (const worker of workerLocations) {
      receivedWorkerIds.add(worker.worker_id);

      createOrUpdateWorkerMarker(worker);
    }

    for (const workerId of workersRef.current.keys()) {
      if (!receivedWorkerIds.has(workerId)) {
        removeWorkerMarker(workerId);
      }
    }

    refreshWorkersState();
  }, [
    createOrUpdateWorkerMarker,
    enabled,
    loadWorkerProfiles,
    refreshWorkersState,
    removeWorkerMarker,
  ]);

  useEffect(() => {
    if (!enabled) {
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

      setNearbyWorkers([]);

      return;
    }

    void loadNearbyWorkers();

    const channel = supabase
      .channel("customer-nearby-workers")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "worker_locations",
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const deletedWorker = payload.old as Partial<WorkerLocationRow>;

            if (deletedWorker.worker_id) {
              removeWorkerMarker(deletedWorker.worker_id);

              refreshWorkersState();
            }

            return;
          }

          const worker = payload.new as WorkerLocationRow;

          createOrUpdateWorkerMarker(worker);

          refreshWorkersState();
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          setNearbyWorkersError("Realtime worker tracking connection failed.");
        }

        if (status === "SUBSCRIBED") {
          setNearbyWorkersError("");
        }
      });

    return () => {
      void supabase.removeChannel(channel);

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
    };
  }, [
    createOrUpdateWorkerMarker,
    enabled,
    loadNearbyWorkers,
    refreshWorkersState,
    removeWorkerMarker,
  ]);
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const timer = window.setInterval(() => {
      void loadNearbyWorkers();
    }, 30_000);

    return () => {
      window.clearInterval(timer);
    };
  }, [enabled, loadNearbyWorkers]);

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
