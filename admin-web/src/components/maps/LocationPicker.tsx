import { runAuditedProcess } from "../../lib/processAudit";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Coordinates } from "./types";
import { DEFAULT_NEARBY_WORKER_RADIUS_KM } from "./constants";
import { DEFAULT_CENTER, SATELLITE_STYLE, STYLES, } from "./mapStyles";
import LoadingOverlay from "./components/LoadingOverlay";
import LayersModal from "./components/LayersModal";
import MessageBanner from "./components/MessageBanner";
import LocationConfirmSection from "./components/LocationConfirmSection";
import CompassIndicator from "./components/CompassIndicator";
import MouseCoordinates from "./components/MouseCoordinates";
import MapSidebar from "./components/MapSidebar";
import MobileSearch from "./components/MobileSearch";
import RouteCard from "./components/RouteCard";
import { useMapInitialization } from "./hooks/useMapInitialization";
import { useConfirmAddress } from "./hooks/useConfirmAddress";
import { useSaveLocation } from "./hooks/useSaveLocation";
import { useDirections } from "./hooks/useDirections";
import { useCurrentLocation } from "./hooks/useCurrentLocation";
import { useRecenterMap } from "./hooks/useRecenterMap";
import { useMapStyle } from "./hooks/useMapStyle";
import { useMarkerHeading } from "./hooks/useMarkerHeading";
import { useSmoothMarker } from "./hooks/useSmoothMarker";
import { useLiveRouteRefresh } from "./hooks/useLiveRouteRefresh";
import { useFollowLocation } from "./hooks/useFollowLocation";
import { getWorkerServiceLabel, useNearbyWorkers, } from "./hooks/useNearbyWorkers";
import type { NearbyWorker, } from "./hooks/useNearbyWorkers";
import { useWorkerLocation } from "../../context/WorkerLocationContext";
import { useSearchHistory } from "./hooks/useSearchHistory";
import { useRouteLayer } from "./hooks/useRouteLayer";
import { useClearSearch } from "./hooks/useClearSearch";
import { useSidebarProps } from "./hooks/useSidebarProps";
import { useLayersModalProps } from "./hooks/useLayersModalProps";
import { useMobileSearchProps } from "./hooks/useMobileSearchProps";
import { useSearchResultSelect } from "./hooks/useSearchResultSelect";
import { useLocationPickerState } from "./hooks/useLocationPickerState";
import { useSearch } from "./hooks/useSearch";
interface InitialLocation {
    latitude: number;
    longitude: number;
    address: string;
}
interface ExternalRouteTarget {
    latitude: number;
    longitude: number;
    address?: string;
}
const WORKER_CATEGORY_FILTERS = [
    "All",
    "Plumber",
    "Electrician",
    "Carpenter",
    "Tutor",
    "Housekeeper",
    "Painter",
] as const;
const WORKER_CATEGORY_DOT_COLORS: Record<string, string> = {
    All: "#0f172a",
    Plumber: "#2563eb",
    Electrician: "#16a34a",
    Carpenter: "#f97316",
    Tutor: "#9333ea",
    Housekeeper: "#dc2626",
    Painter: "#eab308",
};
interface Props {
    onLocationSelect: (latitude: number, longitude: number, address: string) => void;
    onLocationConfirmedChange?: (confirmed: boolean) => void;
    showNearbyWorkers?: boolean;
    nearbyWorkerRadiusKilometers?: number;
    selectedWorkerId?: string;
    onNearbyWorkerSelect?: (worker: NearbyWorker) => void;
    initialLocation?: InitialLocation;
    navigationMode?: boolean;
    autoLocateOnMount?: boolean;
    externalRouteTarget?: ExternalRouteTarget | null;
    externalRouteRequestKey?: number;
    onExternalRouteStarted?: () => void;
    onRouteMetricsChange?: (distanceMeters: number | null, durationSeconds: number | null) => void;
}
export default function LocationPicker({ onLocationSelect, onLocationConfirmedChange, showNearbyWorkers = false, nearbyWorkerRadiusKilometers = DEFAULT_NEARBY_WORKER_RADIUS_KM, selectedWorkerId, onNearbyWorkerSelect, initialLocation, navigationMode = false, autoLocateOnMount = true, externalRouteTarget = null, externalRouteRequestKey = 0, onExternalRouteStarted, onRouteMetricsChange, }: Props) {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<MapLibreMap | null>(null);
    const markerRef = useRef<Marker | null>(null);
    const destinationMarkerRef = useRef<Marker | null>(null);
    const callbackRef = useRef(onLocationSelect);
    const initialLocationLoadedRef = useRef(false);
    const automaticRouteStartedRef = useRef(false);
    const nearbyFitKeyRef = useRef("");
    const handledExternalRouteKeyRef = useRef<number>(0);
    const initialGpsRequestedRef = useRef(false);
    const userSelectedLocationRef = useRef(false);
    const routeTargetRef = useRef<Coordinates | null>(null);
    const selectedCoordinatesRef = useRef<Coordinates>(DEFAULT_CENTER);
    const currentLocationRef = useRef<Coordinates | null>(null);
    const routeCoordinatesRef = useRef<[
        number,
        number
    ][]>([]);
    const { searchText, setSearchText, results, setResults, searching, searchAddress, } = useSearch();
    const { searchHistory, addToSearchHistory, clearSearchHistory } = useSearchHistory();
    const { style, setStyle, showLayers, setShowLayers, showDirections, setShowDirections, longitude, setLongitude, latitude, setLatitude, selectedAddress, setSelectedAddress, editableAddress, setEditableAddress, locating, setLocating, routing, setRouting, mapReady, setMapReady, message, setMessage, distance, setDistance, duration, setDuration, bearing, setBearing, mouseCoordinates, setMouseCoordinates, } = useLocationPickerState();
    const [followUser] = useState(true);
    const [locationConfirmed, setLocationConfirmed] = useState(false);
    useEffect(() => {
        onRouteMetricsChange?.(distance, duration);
    }, [distance, duration, onRouteMetricsChange]);
    const [routeDisplayAddress, setRouteDisplayAddress] = useState("");
    const [workerMapSearch, setWorkerMapSearch] = useState("");
    const [workerCategoryFilter, setWorkerCategoryFilter] = useState("All");
    const [workerCategoryFilterOpen, setWorkerCategoryFilterOpen] = useState(false);
    useEffect(() => {
        callbackRef.current = onLocationSelect;
    }, [onLocationSelect]);
    const drawRoute = useRouteLayer({
        mapRef,
        routeCoordinatesRef,
    });
    const saveLocationBase = useSaveLocation({
        mapRef,
        destinationMarkerRef,
        selectedCoordinatesRef,
        callbackRef,
        setLongitude,
        setLatitude,
        setSelectedAddress,
        setEditableAddress,
        setSearchText,
        setResults,
        setMessage,
    });
    const saveLocation = useCallback(async (nextLatitude: number, nextLongitude: number, nextAddress?: string, preserveView?: boolean) => {
        if (navigationMode) {
            const fixedLatitude = initialLocation?.latitude;
            const fixedLongitude = initialLocation?.longitude;
            const isFixedDestination = typeof fixedLatitude === "number" &&
                typeof fixedLongitude === "number" &&
                Math.abs(nextLatitude - fixedLatitude) < 0.0000001 &&
                Math.abs(nextLongitude - fixedLongitude) < 0.0000001;
            if (!isFixedDestination) {
                setMessage("The customer service location is locked and cannot be changed by the worker.");
                return;
            }
        }
        if (!navigationMode && locationConfirmed) {
            setMessage("Service location is locked. Choose Change Location before selecting another point.");
            return;
        }
        if (!navigationMode) {
            userSelectedLocationRef.current = true;
            setLocationConfirmed(false);
            onLocationConfirmedChange?.(false);
        }
        await saveLocationBase(nextLatitude, nextLongitude, nextAddress, preserveView);
    }, [
        initialLocation?.latitude,
        initialLocation?.longitude,
        locationConfirmed,
        navigationMode,
        onLocationConfirmedChange,
        saveLocationBase,
        setMessage,
    ]);
    const getCurrentLocationBase = useCurrentLocation({
        currentLocationRef,
        saveLocation,
        setLocating,
        setMessage,
    });
    const [hasCurrentLocation, setHasCurrentLocation] = useState(false);
    const getCurrentLocation = useCallback(async (selectAsDestination = true) => {
        const coordinates = await getCurrentLocationBase(selectAsDestination);
        if (coordinates) {
            setHasCurrentLocation(true);
        }
        return coordinates;
    }, [getCurrentLocationBase]);
    const { workerLocation, isOnline, isTracking, goOnline, } = useWorkerLocation();
    const liveLocation = useMemo(() => isOnline && workerLocation
        ? {
            coordinates: [
                workerLocation.longitude,
                workerLocation.latitude,
            ] as Coordinates,
            heading: workerLocation.heading,
        }
        : null, [isOnline, workerLocation]);
    useEffect(() => {
        // Worker navigation: use the worker's live GPS.
        if (navigationMode && isOnline && liveLocation) {
            currentLocationRef.current = liveLocation.coordinates;
        }
    }, [navigationMode, isOnline, liveLocation]);
    useEffect(() => {
        if (!mapReady) {
            return;
        }
        const marker = markerRef.current;
        if (!marker) {
            return;
        }
        marker.getElement().style.display =
            isOnline && liveLocation ? "flex" : "none";
    }, [isOnline, liveLocation, mapReady]);
    useSmoothMarker({
        markerRef,
        coordinates: liveLocation?.coordinates ?? null,
    });
    useMarkerHeading({
        markerRef,
        coordinates: liveLocation?.coordinates ?? null,
        gpsHeading: liveLocation?.heading ?? null,
        minimumMovementMeters: 3,
    });
    useFollowLocation({
        mapRef,
        coordinates: liveLocation?.coordinates ?? null,
        enabled: isOnline &&
            followUser &&
            !showDirections &&
            navigationMode,
    });
    useMapInitialization({
        mapContainerRef,
        mapRef,
        markerRef,
        destinationMarkerRef,
        routeCoordinatesRef,
        drawRoute,
        saveLocation,
        setMapReady,
        setBearing,
        setMouseCoordinates,
        initialLocation,
        navigationMode,
    });
    const getDirections = useDirections({
        mapRef,
        currentLocationRef,
        selectedCoordinatesRef,
        drawRoute,
        getCurrentLocation,
        setRouting,
        setMessage,
        setDistance,
        setDuration,
        setShowDirections,
    });
    const getServiceLocationDirections = useCallback(async () => {
        routeTargetRef.current = null;
        setRouteDisplayAddress(selectedAddress);
        await getDirections(selectedCoordinatesRef.current);
    }, [getDirections, selectedAddress]);
    useEffect(() => {
        if (!mapReady ||
            !externalRouteTarget ||
            externalRouteRequestKey <= 0 ||
            handledExternalRouteKeyRef.current ===
                externalRouteRequestKey) {
            return;
        }
        handledExternalRouteKeyRef.current =
            externalRouteRequestKey;
        const startExternalRoute = async () => {
            return await runAuditedProcess({ module: "Locations", process: "startExternalRoute", action: "START", parameters: {} }, async () => {
                const temporaryTarget: Coordinates = [
                    externalRouteTarget.longitude,
                    externalRouteTarget.latitude,
                ];
                routeTargetRef.current = temporaryTarget;
                setRouteDisplayAddress(externalRouteTarget.address ??
                    "Selected worker live location");
                await getDirections(temporaryTarget);
                onExternalRouteStarted?.();
            });
        };
        void startExternalRoute();
    }, [
        externalRouteRequestKey,
        externalRouteTarget,
        getDirections,
        mapReady,
        onExternalRouteStarted,
    ]);
    useEffect(() => {
        if (!navigationMode ||
            !mapReady ||
            !initialLocation ||
            initialLocationLoadedRef.current) {
            return;
        }
        const destination = initialLocation;
        initialLocationLoadedRef.current = true;
        selectedCoordinatesRef.current = [
            destination.longitude,
            destination.latitude,
        ];
        void saveLocation(destination.latitude, destination.longitude, destination.address, true);
        void goOnline();
    }, [initialLocation, mapReady, navigationMode, saveLocation, goOnline]);
    useEffect(() => {
        if (!navigationMode ||
            !mapReady ||
            !initialLocation ||
            !liveLocation ||
            automaticRouteStartedRef.current) {
            return;
        }
        // Explicitly set worker GPS as route origin.
        currentLocationRef.current = liveLocation.coordinates;
        // Explicitly preserve customer location as destination.
        selectedCoordinatesRef.current = [
            initialLocation.longitude,
            initialLocation.latitude,
        ];
        automaticRouteStartedRef.current = true;
        console.log("Starting navigation route:", {
            origin: currentLocationRef.current,
            destination: selectedCoordinatesRef.current,
        });
        void getDirections();
    }, [getDirections, initialLocation, liveLocation, mapReady, navigationMode]);
    useLiveRouteRefresh({
        coordinates: liveLocation?.coordinates ?? null,
        enabled: isTracking && showDirections,
        refreshRoute: getDirections,
        minimumDistanceMeters: 50,
        minimumIntervalMilliseconds: 30000,
    });
    const selectSearchResultBase = useSearchResultSelect({
        saveLocation,
        addToSearchHistory,
    });
    const handleSearchResultSelect = useCallback(async (result: Parameters<typeof selectSearchResultBase>[0]) => {
        userSelectedLocationRef.current = true;
        await selectSearchResultBase(result);
    }, [selectSearchResultBase]);
    const recenterMap = useRecenterMap({
        mapRef,
        currentLocationRef,
    });
    useEffect(() => {
        if (navigationMode ||
            !autoLocateOnMount ||
            initialGpsRequestedRef.current ||
            userSelectedLocationRef.current) {
            return;
        }
        initialGpsRequestedRef.current = true;
        void getCurrentLocation(true);
    }, [autoLocateOnMount, getCurrentLocation, navigationMode]);
    const selectedMapStyle = style === "satellite"
        ? SATELLITE_STYLE
        : STYLES[style];
    useMapStyle({
        mapRef,
        mapReady,
        mapStyle: selectedMapStyle,
        pitch: style === "threeD" ? 55 : 0,
        onStyleLoaded: () => {
            const routeCoordinates = routeCoordinatesRef.current;
            if (routeCoordinates.length >= 2) {
                drawRoute(routeCoordinates);
            }
        },
    });
    const { nearbyWorkers, nearbyWorkersCount, loadingWorkers, nearbyWorkersError, refreshNearbyWorkers, fitNearbyWorkers, } = useNearbyWorkers({
        mapRef,
        currentLocationRef: navigationMode ? currentLocationRef : selectedCoordinatesRef,
        enabled: showNearbyWorkers && mapReady,
        radiusKilometers: nearbyWorkerRadiusKilometers,
        selectedWorkerId,
        onWorkerSelect: onNearbyWorkerSelect,
        searchQuery: workerMapSearch,
        categoryFilter: workerCategoryFilter === "All" ? "" : workerCategoryFilter,
    });
    useEffect(() => {
        if (!showNearbyWorkers || !mapReady || navigationMode) {
            return;
        }
        const timeoutId = window.setTimeout(() => {
            refreshNearbyWorkers();
        }, 200);
        return () => window.clearTimeout(timeoutId);
    }, [
        latitude,
        longitude,
        mapReady,
        navigationMode,
        refreshNearbyWorkers,
        showNearbyWorkers,
    ]);
    useEffect(() => {
        if (!showNearbyWorkers ||
            !mapReady ||
            nearbyWorkers.length === 0) {
            return;
        }
        const key = [
            latitude.toFixed(5),
            longitude.toFixed(5),
            ...nearbyWorkers
                .map((worker) => worker.worker_id)
                .sort(),
        ].join("|");
        if (nearbyFitKeyRef.current === key) {
            return;
        }
        nearbyFitKeyRef.current = key;
        const timer = window.setTimeout(() => {
            fitNearbyWorkers();
        }, 400);
        return () => window.clearTimeout(timer);
    }, [
        fitNearbyWorkers,
        latitude,
        longitude,
        mapReady,
        nearbyWorkers,
        showNearbyWorkers,
    ]);
    const confirmAddressBase = useConfirmAddress({
        editableAddress,
        latitude,
        longitude,
        setMessage,
        setSelectedAddress,
        setSearchText,
        callback: onLocationSelect,
    });
    const confirmAddress = useCallback(() => {
        confirmAddressBase();
        setLocationConfirmed(true);
        onLocationConfirmedChange?.(true);
        destinationMarkerRef.current?.setDraggable(false);
        setMessage("Service location confirmed and locked.");
    }, [confirmAddressBase, onLocationConfirmedChange, setMessage]);
    const unlockLocation = useCallback(() => {
        setLocationConfirmed(false);
        onLocationConfirmedChange?.(false);
        destinationMarkerRef.current?.setDraggable(true);
        setMessage("Location unlocked. You may select another service location.");
    }, [onLocationConfirmedChange, setMessage]);
    const clearSearch = useClearSearch({
        setSearchText,
        setResults,
    });
    const handleCurrentLocation = useCallback(() => {
        if (navigationMode) {
            void goOnline();
            if (currentLocationRef.current) {
                recenterMap();
            }
            return;
        }
        if (currentLocationRef.current) {
            recenterMap();
            refreshNearbyWorkers();
            return;
        }
        getCurrentLocation(true);
    }, [
        navigationMode,
        goOnline,
        getCurrentLocation,
        recenterMap,
        refreshNearbyWorkers,
    ]);
    const saveUserSelectedLocation = useCallback(async (nextLatitude: number, nextLongitude: number, nextAddress?: string, preserveView?: boolean) => {
        userSelectedLocationRef.current = true;
        await saveLocation(nextLatitude, nextLongitude, nextAddress, preserveView);
    }, [saveLocation]);
    const sidebarProps = useSidebarProps({
        searchText,
        results,
        searching,
        locating,
        routing,
        searchHistory,
        selectedAddress,
        distance,
        duration,
        hasCurrentLocation: hasCurrentLocation ||
            (navigationMode && Boolean(liveLocation)),
        searchAddress,
        clearSearch,
        handleSearchResultSelect,
        handleCurrentLocation,
        clearSearchHistory,
        saveLocation: saveUserSelectedLocation,
        setShowLayers,
        getDirections: getServiceLocationDirections,
    });
    const mobileSearchProps = useMobileSearchProps({
        searchText,
        searching,
        locating,
        results,
        searchAddress,
        clearSearch,
        handleCurrentLocation,
        handleSearchResultSelect,
    });
    const layersModalProps = useLayersModalProps({
        showLayers,
        style,
        setShowLayers,
        setStyle,
    });
    const selectedNearbyWorker = selectedWorkerId
        ? nearbyWorkers.find((worker) => worker.worker_id === selectedWorkerId) ?? null
        : null;
    const selectedNearbyWorkerName = selectedNearbyWorker?.profile
        ? [
            selectedNearbyWorker.profile.first_name,
            selectedNearbyWorker.profile.middle_name,
            selectedNearbyWorker.profile.last_name,
        ]
            .filter(Boolean)
            .join(" ")
        : "";
    return (<div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.12)] sm:rounded-[28px]" onClick={(event) => event.stopPropagation()}>
      <div className="relative flex h-[68dvh] min-h-[500px] max-h-[760px] w-full overflow-hidden sm:h-[650px]">
        <div className="hidden w-[320px] shrink-0 md:block">
          <MapSidebar {...sidebarProps}/>
        </div>
        <div className="relative flex-1">
          <div ref={mapContainerRef} className="h-full w-full bg-slate-100" onClick={(event) => event.stopPropagation()}/>

          {showNearbyWorkers && !selectedWorkerId && (<div className="pointer-events-none absolute left-1/2 top-3 z-30 w-[calc(100%-1.5rem)] max-w-[520px] -translate-x-1/2 sm:top-4 sm:w-[calc(100%-2rem)] md:max-w-[520px]">
              <div className="pointer-events-auto w-full">
                <div className="rounded-2xl border border-slate-200/90 bg-white/96 p-2.5 shadow-xl backdrop-blur sm:p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="11" cy="11" r="7"/>
                        <path d="m20 20-3.5-3.5"/>
                      </svg>
                    </div>
                    <input type="search" value={workerMapSearch} onChange={(event) => setWorkerMapSearch(event.target.value)} placeholder="Search service or worker..." aria-label="Search service or worker" className="min-w-0 flex-1 bg-transparent px-1 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"/>
                    {workerMapSearch && (<button type="button" onClick={() => setWorkerMapSearch("")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Clear worker search">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M18 6 6 18"/>
                          <path d="m6 6 12 12"/>
                        </svg>
                      </button>)}
                  </div>

                  {workerMapSearch.trim() && nearbyWorkers.length > 0 && (<div className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                      {nearbyWorkers.slice(0, 6).map((worker) => {
                    const workerName = [
                        worker.profile?.first_name,
                        worker.profile?.middle_name,
                        worker.profile?.last_name,
                    ]
                        .filter(Boolean)
                        .join(" ") || "Worker";
                    const workerCategory = getWorkerServiceLabel(worker.services);
                    return (<button key={worker.worker_id} type="button" onClick={() => onNearbyWorkerSelect?.(worker)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-slate-50">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{
                            backgroundColor: WORKER_CATEGORY_DOT_COLORS[workerCategory] || "#64748b",
                        }}/>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-bold text-slate-900">
                                {workerName}
                              </span>
                              <span className="block truncate text-[11px] text-slate-500">
                                {workerCategory}
                              </span>
                            </span>
                          </button>);
                })}
                    </div>)}

                  <div className="relative mt-2">
                    <button type="button" onClick={() => setWorkerCategoryFilterOpen((open) => !open)} aria-expanded={workerCategoryFilterOpen} aria-haspopup="listbox" className="flex min-h-9 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: WORKER_CATEGORY_DOT_COLORS[workerCategoryFilter] }} aria-hidden="true"/>
                        <span className="truncate">
                          {workerCategoryFilter === "All" ? "All services" : workerCategoryFilter}
                        </span>
                      </span>
                      <svg className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${workerCategoryFilterOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="m6 9 6 6 6-6"/>
                      </svg>
                    </button>

                    {workerCategoryFilterOpen && (<div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl" role="listbox" aria-label="Worker service category">
                        {WORKER_CATEGORY_FILTERS.map((category) => {
                    const active = workerCategoryFilter === category;
                    const dotColor = WORKER_CATEGORY_DOT_COLORS[category];
                    return (<button key={category} type="button" role="option" aria-selected={active} onClick={() => {
                            setWorkerCategoryFilter(category);
                            setWorkerCategoryFilterOpen(false);
                        }} className={`flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-xs font-bold transition ${active
                            ? "bg-slate-900 text-white"
                            : "text-slate-700 hover:bg-slate-50"}`}>
                              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} aria-hidden="true"/>
                              <span className="truncate">{category}</span>
                              {active && (<svg className="ml-auto h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d="m5 12 4 4L19 6"/>
                                </svg>)}
                            </button>);
                })}
                      </div>)}
                  </div>
                </div>
              </div>
            </div>)}

          {navigationMode && (<div className="pointer-events-none absolute left-4 bottom-4 z-20 rounded-xl border border-blue-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
              <p className="text-xs font-extrabold uppercase tracking-wide text-blue-700">
                Customer location locked
              </p>
              <p className="mt-1 max-w-64 text-xs text-slate-600">
                The destination comes from the confirmed booking and cannot be moved by the worker.
              </p>
            </div>)}
          {showNearbyWorkers && (<div className="pointer-events-none absolute left-2 top-15 z-20 max-w-[calc(100%-1rem)] sm:left-4 sm:top-20 md:top-4">
              <div className="pointer-events-auto w-fit max-w-44 rounded-lg border border-white/70 bg-white/95 px-2.5 py-1.5 shadow-md backdrop-blur sm:max-w-52 sm:rounded-xl sm:px-3 sm:py-2 md:max-w-56 md:rounded-2xl md:px-4 md:py-3">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500 sm:text-[10px] md:text-xs">
                  {selectedWorkerId ? "Selected Worker" : "Nearby Workers"}
                </p>

                <p className="mt-0.5 truncate text-xs font-bold text-slate-900 sm:text-sm md:mt-1 md:text-base">
                  {selectedWorkerId
                ? loadingWorkers
                    ? "Checking worker..."
                    : selectedNearbyWorker
                        ? selectedNearbyWorkerName || "Selected worker"
                        : "Worker unavailable"
                : loadingWorkers
                    ? "Loading..."
                    : `${nearbyWorkersCount} available`}
                </p>

                {selectedWorkerId && selectedNearbyWorker && (<p className="mt-0.5 text-[9px] font-semibold text-emerald-700 sm:text-[10px] md:mt-1 md:text-xs">
                    Online nearby worker
                  </p>)}

                {!selectedWorkerId && nearbyWorkersCount > 0 && (<button type="button" onClick={() => fitNearbyWorkers()} className="pointer-events-auto mt-2 min-h-9 w-full rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white transition hover:bg-emerald-700">
                    Show workers
                  </button>)}

                {selectedWorkerId && selectedNearbyWorker && (<button type="button" onClick={() => fitNearbyWorkers()} className="pointer-events-auto mt-1.5 min-h-7 w-full rounded-md bg-blue-600 px-2 text-[9px] font-bold text-white transition hover:bg-blue-700 sm:min-h-8 sm:rounded-lg sm:px-3 sm:text-[11px] md:mt-2 md:min-h-9 md:text-xs">
                    Focus worker
                  </button>)}

                {nearbyWorkersError && (<p className="mt-1 max-w-52 text-xs text-red-600">
                    {nearbyWorkersError}
                  </p>)}
              </div>
            </div>)}
        </div>

        {/* Mobile map actions */}
        <div className="absolute bottom-9 right-3 z-30 flex gap-2 sm:bottom-10 md:hidden">
          <button type="button" onClick={() => setShowLayers(true)} className="min-h-11 rounded-xl border border-slate-200 bg-white/95 px-4 text-sm font-bold text-slate-700 shadow-lg backdrop-blur">
            Layers
          </button>

          <button type="button" onClick={() => void getServiceLocationDirections()} disabled={routing} className="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50">
            {routing ? "Routing..." : "Route"}
          </button>
        </div>

        <LoadingOverlay visible={!mapReady}/>

        {!navigationMode && <MobileSearch {...mobileSearchProps}/>}

        <CompassIndicator bearing={bearing}/>

        <LayersModal {...layersModalProps}/>

        <RouteCard visible={showDirections} selectedAddress={routeDisplayAddress || selectedAddress} distance={distance} duration={duration} onClose={() => setShowDirections(false)}/>

        <MouseCoordinates coordinates={mouseCoordinates}/>

        <MessageBanner message={message}/>
      </div>

      {!navigationMode && (<LocationConfirmSection editableAddress={editableAddress} selectedAddress={selectedAddress} latitude={latitude} longitude={longitude} confirmed={locationConfirmed} onAddressChange={setEditableAddress} onConfirm={confirmAddress} onChangeLocation={unlockLocation}/>)}
    </div>);
}
