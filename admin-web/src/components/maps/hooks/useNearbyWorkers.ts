import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { Marker, Popup, type Map as MapLibreMap } from "maplibre-gl";

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

interface NearbyWorker extends WorkerLocationRow {
  distanceMeters: number | null;
}

interface UseNearbyWorkersParams {
  mapRef: MutableRefObject<MapLibreMap | null>;
  currentLocationRef: MutableRefObject<Coordinates | null>;
  enabled: boolean;
  radiusKilometers?: number;
}

interface WorkerMarkerRecord {
  marker: Marker;
  element: HTMLDivElement;
  coordinates: Coordinates;
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

function formatDistance(distanceMeters: number | null) {
  if (distanceMeters === null) {
    return "Distance unavailable";
  }

  if (distanceMeters < 1_000) {
    return `${Math.round(distanceMeters)} m away`;
  }

  return `${(distanceMeters / 1_000).toFixed(1)} km away`;
}

function createWorkerMarkerElement() {
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
    </div>
  `;

  return container;
}

export function useNearbyWorkers({
  mapRef,
  currentLocationRef,
  enabled,
  radiusKilometers = 20,
}: UseNearbyWorkersParams) {
  const markerRecordsRef = useRef<Map<string, WorkerMarkerRecord>>(new Map());
  const animationFramesRef = useRef<Map<string, number>>(new Map());

  const workersRef = useRef<Map<string, NearbyWorker>>(new Map());

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

        // Smooth ease-in/ease-out movement.
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
      };

      workersRef.current.set(worker.worker_id, nearbyWorker);

      const existingRecord = markerRecordsRef.current.get(worker.worker_id);

      if (existingRecord) {
        const destination: Coordinates = [worker.longitude, worker.latitude];

        animateWorkerMarker(worker.worker_id, destination);

        updateWorkerHeading(existingRecord.element, worker.heading);

        existingRecord.marker.setPopup(
          new Popup({
            offset: 28,
            closeButton: false,
          }).setHTML(`
            <div style="min-width: 170px; padding: 4px;">
              <strong style="color: #0f172a;">
                Available Worker
              </strong>

              <p
                style="
                  margin: 6px 0 0;
                  color: #475569;
                  font-size: 13px;
                "
              >
                ${formatDistance(distanceMeters)}
              </p>

              <p
                style="
                  margin: 3px 0 0;
                  color: #16a34a;
                  font-size: 12px;
                  font-weight: 600;
                "
              >
                Online and available
              </p>
            </div>
          `),
        );

        return;
      }

      const element = createWorkerMarkerElement();

      updateWorkerHeading(element, worker.heading);

      const popup = new Popup({
        offset: 28,
        closeButton: false,
      }).setHTML(`
        <div style="min-width: 170px; padding: 4px;">
          <strong style="color: #0f172a;">
            Available Worker
          </strong>

          <p
            style="
              margin: 6px 0 0;
              color: #475569;
              font-size: 13px;
            "
          >
            ${formatDistance(distanceMeters)}
          </p>

          <p
            style="
              margin: 3px 0 0;
              color: #16a34a;
              font-size: 12px;
              font-weight: 600;
            "
          >
            Online and available
          </p>
        </div>
      `);

      const marker = new Marker({
        element,
        anchor: "center",
      })
        .setLngLat([worker.longitude, worker.latitude])
        .setPopup(popup)
        .addTo(map);

      markerRecordsRef.current.set(worker.worker_id, {
        marker,
        element,
        coordinates: [worker.longitude, worker.latitude],
      });
    },
    [
      animateWorkerMarker,
      getWorkerDistance,
      mapRef,
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

    const receivedWorkerIds = new Set<string>();

    for (const worker of (data ?? []) as WorkerLocationRow[]) {
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
