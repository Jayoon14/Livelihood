import { auditCaughtError } from "../../../lib/processAudit";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { Marker, type Map as MapLibreMap } from "maplibre-gl";
import { supabase } from "../../../lib/supabase";
import type { Coordinates } from "../types";
import { DEFAULT_NEARBY_WORKER_RADIUS_KM, MAX_WORKER_GPS_ACCURACY_METERS, STALE_WORKER_GPS_MS, } from "../constants";
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
    services: WorkerServiceSummary[];
}
export interface WorkerServiceSummary {
    category: string | null;
    service_name: string | null;
}
interface UseNearbyWorkersParams {
    mapRef: MutableRefObject<MapLibreMap | null>;
    currentLocationRef: MutableRefObject<Coordinates | null>;
    enabled: boolean;
    radiusKilometers?: number;
    selectedWorkerId?: string;
    onWorkerSelect?: (worker: NearbyWorker) => void;
    searchQuery?: string;
    categoryFilter?: string;
}
const WORKER_CATEGORY_COLORS: Record<string, string> = {
    plumber: "#2563eb",
    electrician: "#16a34a",
    carpenter: "#f97316",
    tutor: "#9333ea",
    housekeeper: "#dc2626",
    painter: "#eab308",
};
const DEFAULT_WORKER_MARKER_COLOR = "#0f766e";
function normalizeText(value: string | null | undefined): string {
    return value?.trim().toLocaleLowerCase() ?? "";
}
function getCategoryColor(category: string | null | undefined): string {
    return (WORKER_CATEGORY_COLORS[normalizeText(category)] ??
        DEFAULT_WORKER_MARKER_COLOR);
}
export function getWorkerServiceLabel(services: WorkerServiceSummary[]): string {
    const categories = Array.from(new Set(services
        .map((service) => service.category?.trim())
        .filter((value): value is string => Boolean(value))));
    if (categories.length > 0) {
        return categories.join(" / ");
    }
    const serviceNames = Array.from(new Set(services
        .map((service) => service.service_name?.trim())
        .filter((value): value is string => Boolean(value))));
    return serviceNames.join(" / ") || "Service";
}
function getWorkerCategory(services: WorkerServiceSummary[]): string {
    return (services.find((service) => service.category?.trim())?.category?.trim() ??
        "Service");
}
const WORKER_CATEGORY_ALIASES: Record<string, string[]> = {
    plumber: ["plumber", "plumbing"],
    electrician: ["electrician", "electrical", "electric"],
    carpenter: ["carpenter", "carpentry"],
    tutor: ["tutor", "tutoring"],
    housekeeper: ["housekeeper", "housekeeping"],
    painter: ["painter", "painting"],
};
function categoryValueMatchesFilter(value: string | null | undefined, normalizedCategory: string): boolean {
    const normalizedValue = normalizeText(value);
    if (!normalizedCategory || !normalizedValue) {
        return false;
    }
    const aliases = WORKER_CATEGORY_ALIASES[normalizedCategory] ?? [
        normalizedCategory,
    ];
    return aliases.some((alias) => normalizedValue === alias ||
        normalizedValue.includes(alias) ||
        alias.includes(normalizedValue));
}
function workerMatchesFilters(worker: NearbyWorker, searchQuery: string, categoryFilter: string): boolean {
    const normalizedSearch = normalizeText(searchQuery);
    const normalizedCategory = normalizeText(categoryFilter);
    const workerName = worker.profile
        ? [
            worker.profile.first_name,
            worker.profile.middle_name,
            worker.profile.last_name,
        ]
            .filter(Boolean)
            .join(" ")
        : "";
    const serviceValues = worker.services.flatMap((service) => [
        service.category ?? "",
        service.service_name ?? "",
    ]);
    const matchesCategory = !normalizedCategory ||
        serviceValues.some((value) => categoryValueMatchesFilter(value, normalizedCategory));
    if (!matchesCategory) {
        return false;
    }
    if (!normalizedSearch) {
        return true;
    }
    return [workerName, ...serviceValues].some((value) => normalizeText(value).includes(normalizedSearch));
}
interface WorkerMarkerRecord {
    marker: Marker;
    element: HTMLDivElement;
    coordinates: Coordinates;
    cleanupClick: () => void;
}
const STALE_GPS_THRESHOLD_MS = STALE_WORKER_GPS_MS;
const MAX_FUTURE_TIMESTAMP_DRIFT_MS = 60000;
const MAX_NEARBY_ACCURACY_METERS = MAX_WORKER_GPS_ACCURACY_METERS;
const REFRESH_INTERVAL_MS = 30000;
const TRANSIENT_GRACE_PERIOD_MS = 90000;
const MAX_CONSECUTIVE_MISSES = 3;
function degreesToRadians(value: number): number {
    return (value * Math.PI) / 180;
}
function calculateDistanceMeters(first: Coordinates, second: Coordinates): number {
    const earthRadiusMeters = 6371000;
    const [firstLongitude, firstLatitude] = first;
    const [secondLongitude, secondLatitude] = second;
    const latitudeDifference = degreesToRadians(secondLatitude - firstLatitude);
    const longitudeDifference = degreesToRadians(secondLongitude - firstLongitude);
    const firstLatitudeRadians = degreesToRadians(firstLatitude);
    const secondLatitudeRadians = degreesToRadians(secondLatitude);
    const a = Math.sin(latitudeDifference / 2) ** 2 +
        Math.cos(firstLatitudeRadians) *
            Math.cos(secondLatitudeRadians) *
            Math.sin(longitudeDifference / 2) ** 2;
    return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function isValidCoordinates(longitude: number, latitude: number): boolean {
    return (Number.isFinite(longitude) &&
        Number.isFinite(latitude) &&
        longitude >= -180 &&
        longitude <= 180 &&
        latitude >= -90 &&
        latitude <= 90);
}
function hasFreshGps(worker: WorkerLocationRow): boolean {
    const updatedAt = new Date(worker.updated_at).getTime();
    if (!Number.isFinite(updatedAt)) {
        return false;
    }
    const ageMilliseconds = Date.now() - updatedAt;
    return (ageMilliseconds >= -MAX_FUTURE_TIMESTAMP_DRIFT_MS &&
        ageMilliseconds <= STALE_GPS_THRESHOLD_MS);
}
function hasUsableAccuracy(worker: WorkerLocationRow): boolean {
    return (worker.accuracy === null ||
        (Number.isFinite(worker.accuracy) &&
            worker.accuracy >= 0 &&
            worker.accuracy <= MAX_NEARBY_ACCURACY_METERS));
}
function createWorkerMarkerElement(isAvailable: boolean, category: string): HTMLDivElement {
    const container = document.createElement("div");
    container.className = "livelihood-worker-marker";
    container.style.width = "48px";
    container.style.height = "48px";
    container.style.display = "flex";
    container.style.alignItems = "center";
    container.style.justifyContent = "center";
    container.style.cursor = "pointer";
    container.style.position = "relative";
    const categoryColor = getCategoryColor(category);
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
        background:${categoryColor};
        box-shadow:
          0 8px 20px rgba(15,23,42,.25),
          0 0 0 4px ${isAvailable ? "rgba(34,197,94,.18)" : "rgba(245,158,11,.22)"};
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
        data-worker-status-dot
        style="
          position:absolute;
          right:-1px;
          bottom:-1px;
          width:12px;
          height:12px;
          border:2px solid white;
          border-radius:9999px;
          background:${isAvailable ? "#22c55e" : "#f59e0b"};
        "
      ></span>

      <span
        data-worker-category-label
        style="
          position:absolute;
          top:46px;
          left:50%;
          transform:translateX(-50%);
          max-width:150px;
          padding:3px 8px;
          border:1px solid rgba(255,255,255,.9);
          border-radius:9999px;
          background:rgba(255,255,255,.96);
          color:#0f172a;
          box-shadow:0 4px 12px rgba(15,23,42,.18);
          font-size:11px;
          font-weight:800;
          line-height:1.2;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
          pointer-events:none;
        "
      >${category}</span>
    </div>
  `;
    return container;
}
export function useNearbyWorkers({ mapRef, currentLocationRef, enabled, radiusKilometers = DEFAULT_NEARBY_WORKER_RADIUS_KM, selectedWorkerId, onWorkerSelect, searchQuery = "", categoryFilter = "", }: UseNearbyWorkersParams) {
    const markerRecordsRef = useRef<Map<string, WorkerMarkerRecord>>(new Map());
    const animationFramesRef = useRef<Map<string, number>>(new Map());
    const workersRef = useRef<Map<string, NearbyWorker>>(new Map());
    const workerProfilesRef = useRef<Map<string, WorkerProfile>>(new Map());
    const workerServicesRef = useRef<Map<string, WorkerServiceSummary[]>>(new Map());
    const lastEligibleAtRef = useRef<Map<string, number>>(new Map());
    const consecutiveMissesRef = useRef<Map<string, number>>(new Map());
    const mountedRef = useRef(true);
    const channelIdRef = useRef(`customer-nearby-workers-${crypto.randomUUID()}`);
    const searchQueryRef = useRef(searchQuery);
    const categoryFilterRef = useRef(categoryFilter);
    const [nearbyWorkers, setNearbyWorkers] = useState<NearbyWorker[]>([]);
    const [loadingWorkers, setLoadingWorkers] = useState(false);
    const [nearbyWorkersError, setNearbyWorkersError] = useState("");
    /*
     * Keep the latest filter values in refs.
     *
     * This avoids updating refs directly during render, which triggers
     * the React react-hooks/refs lint rule.
     */
    useEffect(() => {
        searchQueryRef.current = searchQuery;
        categoryFilterRef.current = categoryFilter;
    }, [searchQuery, categoryFilter]);
    const publishWorkers = useCallback(() => {
        if (!mountedRef.current) {
            return;
        }
        setNearbyWorkers([...workersRef.current.values()].sort((first, second) => (first.distanceMeters ?? Number.POSITIVE_INFINITY) -
            (second.distanceMeters ?? Number.POSITIVE_INFINITY)));
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
        lastEligibleAtRef.current.delete(workerId);
        consecutiveMissesRef.current.delete(workerId);
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
        lastEligibleAtRef.current.clear();
        consecutiveMissesRef.current.clear();
        if (mountedRef.current) {
            setNearbyWorkers([]);
        }
    }, []);
    const getDistance = useCallback((worker: WorkerLocationRow): number | null => {
        const origin = currentLocationRef.current;
        if (!origin) {
            return null;
        }
        return calculateDistanceMeters(origin, [
            worker.longitude,
            worker.latitude,
        ]);
    }, [currentLocationRef]);
    const getWorkerProfile = useCallback(async (workerId: string): Promise<WorkerProfile | null> => {
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
    }, []);
    const getWorkerServices = useCallback(async (workerId: string): Promise<WorkerServiceSummary[]> => {
        const cached = workerServicesRef.current.get(workerId);
        if (cached) {
            return cached;
        }
        const { data, error } = await supabase
            .from("services")
            .select("category, service_name")
            .eq("worker_id", workerId)
            .eq("status", "Approved");
        if (error) {
            console.error("Unable to load nearby worker services:", error);
            return [];
        }
        const services = (data ?? []) as WorkerServiceSummary[];
        workerServicesRef.current.set(workerId, services);
        return services;
    }, []);
    const animateMarker = useCallback((workerId: string, destination: Coordinates, durationMs = 800) => {
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
            const eased = progress < 0.5
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
    }, []);
    const applyHeading = useCallback((element: HTMLDivElement, heading: number | null) => {
        const icon = element.querySelector<HTMLElement>("[data-worker-marker-icon]");
        if (!icon) {
            return;
        }
        const validHeading = typeof heading === "number" && Number.isFinite(heading) ? heading : 0;
        icon.style.transition = "transform 400ms ease";
        icon.style.transform = `rotate(${validHeading}deg)`;
    }, []);
    const processWorker = useCallback(async (worker: WorkerLocationRow, source: "refresh" | "realtime" = "refresh") => {
        const map = mapRef.current;
        if (!map) {
            return;
        }
        if (selectedWorkerId && worker.worker_id !== selectedWorkerId) {
            removeWorker(worker.worker_id);
            return;
        }
        if (!isValidCoordinates(worker.longitude, worker.latitude)) {
            removeWorker(worker.worker_id);
            publishWorkers();
            return;
        }
        const distanceMeters = getDistance(worker);
        const insideRadius = distanceMeters !== null && distanceMeters <= radiusKilometers * 1000;
        const shouldDisplay = worker.is_online &&
            hasFreshGps(worker) &&
            hasUsableAccuracy(worker) &&
            insideRadius;
        if (!worker.is_online) {
            removeWorker(worker.worker_id);
            publishWorkers();
            return;
        }
        if (!shouldDisplay) {
            const lastEligibleAt = lastEligibleAtRef.current.get(worker.worker_id) ?? 0;
            const insideGracePeriod = workersRef.current.has(worker.worker_id) &&
                Date.now() - lastEligibleAt <= TRANSIENT_GRACE_PERIOD_MS;
            if (source === "refresh" && insideGracePeriod) {
                return;
            }
            if (source === "realtime" &&
                workersRef.current.has(worker.worker_id) &&
                hasFreshGps(worker) &&
                insideRadius) {
                return;
            }
            removeWorker(worker.worker_id);
            publishWorkers();
            return;
        }
        lastEligibleAtRef.current.set(worker.worker_id, Date.now());
        consecutiveMissesRef.current.set(worker.worker_id, 0);
        const profile = await getWorkerProfile(worker.worker_id);
        if (!mountedRef.current) {
            return;
        }
        const services = await getWorkerServices(worker.worker_id);
        if (!mountedRef.current) {
            return;
        }
        const nearbyWorker: NearbyWorker = {
            ...worker,
            distanceMeters,
            profile,
            services,
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
            existing.element.style.display = workerMatchesFilters(nearbyWorker, searchQueryRef.current, categoryFilterRef.current)
                ? "flex"
                : "none";
            const icon = existing.element.querySelector<HTMLElement>("[data-worker-marker-icon]");
            const statusDot = existing.element.querySelector<HTMLElement>("[data-worker-status-dot]");
            if (icon) {
                icon.style.background = getCategoryColor(getWorkerCategory(services));
            }
            if (statusDot) {
                statusDot.style.background = worker.is_available
                    ? "#22c55e"
                    : "#f59e0b";
            }
            const categoryLabel = existing.element.querySelector<HTMLElement>("[data-worker-category-label]");
            if (categoryLabel) {
                categoryLabel.textContent = getWorkerServiceLabel(services);
            }
            existing.cleanupClick();
            existing.element.addEventListener("click", handleClick);
            existing.cleanupClick = () => {
                existing.element.removeEventListener("click", handleClick);
            };
            publishWorkers();
            return;
        }
        const element = createWorkerMarkerElement(worker.is_available, getWorkerServiceLabel(services));
        element.style.display = workerMatchesFilters(nearbyWorker, searchQueryRef.current, categoryFilterRef.current)
            ? "flex"
            : "none";
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
    }, [
        animateMarker,
        applyHeading,
        getDistance,
        getWorkerProfile,
        getWorkerServices,
        mapRef,
        onWorkerSelect,
        publishWorkers,
        radiusKilometers,
        removeWorker,
        selectedWorkerId,
    ]);
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
                .select("worker_id, latitude, longitude, accuracy, heading, speed, is_online, is_available, updated_at");
            if (error) {
                throw error;
            }
            const rows = (data ?? []) as WorkerLocationRow[];
            const relevantRows = selectedWorkerId
                ? rows.filter((row) => row.worker_id === selectedWorkerId)
                : rows;
            const receivedIds = new Set(relevantRows.map((row) => row.worker_id));
            await Promise.all(relevantRows.map((row) => processWorker(row, "refresh")));
            for (const workerId of [...workersRef.current.keys()]) {
                if (receivedIds.has(workerId)) {
                    consecutiveMissesRef.current.set(workerId, 0);
                    continue;
                }
                const nextMisses = (consecutiveMissesRef.current.get(workerId) ?? 0) + 1;
                consecutiveMissesRef.current.set(workerId, nextMisses);
                const lastEligibleAt = lastEligibleAtRef.current.get(workerId) ?? 0;
                const graceExpired = Date.now() - lastEligibleAt > TRANSIENT_GRACE_PERIOD_MS;
                if (nextMisses >= MAX_CONSECUTIVE_MISSES && graceExpired) {
                    removeWorker(workerId);
                }
            }
            publishWorkers();
        }
        catch (error) {
            auditCaughtError({ module: "Workers", process: "background operation", action: "EXECUTE" }, error);
            console.error("Unable to load nearby workers:", error);
            if (mountedRef.current) {
                setNearbyWorkersError("Unable to load nearby workers.");
            }
        }
        finally {
            if (mountedRef.current) {
                setLoadingWorkers(false);
            }
        }
    }, [enabled, processWorker, publishWorkers, removeWorker, selectedWorkerId]);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);
    useEffect(() => {
        if (!enabled) {
            clearAllWorkers();
            return;
        }
        void loadNearbyWorkers();
        const channel = supabase
            .channel(channelIdRef.current)
            .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "worker_locations",
        }, (payload) => {
            if (payload.eventType === "DELETE") {
                const deleted = payload.old as Partial<WorkerLocationRow>;
                if (deleted.worker_id) {
                    removeWorker(deleted.worker_id);
                    publishWorkers();
                }
                return;
            }
            void processWorker(payload.new as WorkerLocationRow, "realtime");
        })
            .subscribe((status) => {
            if (!mountedRef.current) {
                return;
            }
            if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
                setNearbyWorkersError("Realtime worker tracking connection failed. Retrying automatically.");
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
    useEffect(() => {
        for (const [workerId, worker] of workersRef.current.entries()) {
            const record = markerRecordsRef.current.get(workerId);
            if (!record) {
                continue;
            }
            record.element.style.display = workerMatchesFilters(worker, searchQuery, categoryFilter)
                ? "flex"
                : "none";
        }
    }, [categoryFilter, searchQuery]);
    const refreshNearbyWorkers = useCallback(() => {
        void loadNearbyWorkers();
    }, [loadNearbyWorkers]);
    const fitNearbyWorkers = useCallback((): boolean => {
        const map = mapRef.current;
        const origin = currentLocationRef.current;
        const workers = [...workersRef.current.values()].filter((worker) => workerMatchesFilters(worker, searchQuery, categoryFilter));
        if (!map || workers.length === 0) {
            return false;
        }
        const points: Coordinates[] = workers.map((worker) => [
            worker.longitude,
            worker.latitude,
        ]);
        if (origin) {
            points.push(origin);
        }
        if (points.length === 1) {
            map.flyTo({
                center: points[0],
                zoom: 14,
                duration: 700,
                essential: true,
            });
            return true;
        }
        let minLng = points[0][0];
        let maxLng = points[0][0];
        let minLat = points[0][1];
        let maxLat = points[0][1];
        for (const [lng, lat] of points) {
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
        }
        map.fitBounds([
            [minLng, minLat],
            [maxLng, maxLat],
        ], {
            padding: {
                top: 100,
                right: 80,
                bottom: 100,
                left: 80,
            },
            maxZoom: 14,
            duration: 850,
            essential: true,
        });
        return true;
    }, [categoryFilter, currentLocationRef, mapRef, searchQuery]);
    const visibleNearbyWorkers = useMemo(() => nearbyWorkers.filter((worker) => workerMatchesFilters(worker, searchQuery, categoryFilter)), [nearbyWorkers, searchQuery, categoryFilter]);
    return {
        nearbyWorkers: visibleNearbyWorkers,
        nearbyWorkersCount: visibleNearbyWorkers.length,
        loadingWorkers,
        nearbyWorkersError,
        refreshNearbyWorkers,
        fitNearbyWorkers,
    };
}
