import { useCallback, useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import type { Coordinates } from "./types";
import {
  DEFAULT_CENTER,
  SATELLITE_STYLE,
  STYLES,
} from "./mapStyles";

import LoadingOverlay from "./components/LoadingOverlay";
import LayersModal from "./components/LayersModal";
import MessageBanner from "./components/MessageBanner";
import LocationConfirmSection from "./components/LocationConfirmSection";
import CompassIndicator from "./components/CompassIndicator";
import MouseCoordinates from "./components/MouseCoordinates";
import MapSidebar from "./components/MapSidebar";
import MobileSearch from "./components/MobileSearch";
import RouteCard from "./components/RouteCard";
import CurrentLocationButton from "./components/CurrentLocationButton";
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
import {
  useNearbyWorkers,
} from "./hooks/useNearbyWorkers";

import type {
  NearbyWorker,
} from "./hooks/useNearbyWorkers";

import { useWorkerLocation } from "../../context/WorkerLocationProvider";

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
interface Props {
  onLocationSelect: (
    latitude: number,
    longitude: number,
    address: string,
  ) => void;

  onLocationConfirmedChange?: (confirmed: boolean) => void;

  showNearbyWorkers?: boolean;
  nearbyWorkerRadiusKilometers?: number;

  onNearbyWorkerSelect?: (
    worker: NearbyWorker,
  ) => void;

  initialLocation?: InitialLocation;
  navigationMode?: boolean;
}
export default function LocationPicker({
  onLocationSelect,
  onLocationConfirmedChange,
  showNearbyWorkers = false,
  nearbyWorkerRadiusKilometers = 50,
  onNearbyWorkerSelect,
  initialLocation,
  navigationMode = false,
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  const markerRef = useRef<Marker | null>(null);
  const destinationMarkerRef = useRef<Marker | null>(null);

  const callbackRef = useRef(onLocationSelect);

  const selectedCoordinatesRef = useRef<Coordinates>(DEFAULT_CENTER);
  const currentLocationRef = useRef<Coordinates | null>(null);
  const routeCoordinatesRef = useRef<[number, number][]>([]);

  const {
    searchText,
    setSearchText,
    results,
    setResults,
    searching,
    searchAddress,
  } = useSearch();

  const { searchHistory, addToSearchHistory, clearSearchHistory } =
    useSearchHistory();

  const {
    style,
    setStyle,

    showLayers,
    setShowLayers,

    showDirections,
    setShowDirections,

    longitude,
    setLongitude,

    latitude,
    setLatitude,

    selectedAddress,
    setSelectedAddress,

    editableAddress,
    setEditableAddress,

    locating,
    setLocating,

    routing,
    setRouting,

    mapReady,
    setMapReady,

    message,
    setMessage,

    distance,
    setDistance,

    duration,
    setDuration,

    bearing,
    setBearing,

    mouseCoordinates,
    setMouseCoordinates,
  } = useLocationPickerState();
  const [followUser] = useState(true);
  const [locationConfirmed, setLocationConfirmed] = useState(false);

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

  const saveLocation = useCallback(
    async (
      nextLatitude: number,
      nextLongitude: number,
      nextAddress?: string,
      preserveView?: boolean,
    ) => {
      if (navigationMode) {
        const fixedLatitude = initialLocation?.latitude;
        const fixedLongitude = initialLocation?.longitude;

        const isFixedDestination =
          typeof fixedLatitude === "number" &&
          typeof fixedLongitude === "number" &&
          Math.abs(nextLatitude - fixedLatitude) < 0.0000001 &&
          Math.abs(nextLongitude - fixedLongitude) < 0.0000001;

        if (!isFixedDestination) {
          setMessage(
            "The customer service location is locked and cannot be changed by the worker.",
          );
          return;
        }
      }

      if (!navigationMode) {
        userSelectedLocationRef.current = true;
        setLocationConfirmed(false);
        onLocationConfirmedChange?.(false);
      }

      await saveLocationBase(
        nextLatitude,
        nextLongitude,
        nextAddress,
        preserveView,
      );
    },
    [
      initialLocation?.latitude,
      initialLocation?.longitude,
      navigationMode,
      onLocationConfirmedChange,
      saveLocationBase,
      setMessage,
    ],
  );

  const getCurrentLocation = useCurrentLocation({
    currentLocationRef,
    saveLocation,
    setLocating,
    setMessage,
  });

const {
  workerLocation,
  isOnline,
  isTracking,
  goOnline,
} = useWorkerLocation();

const liveLocation =
  isOnline && workerLocation
    ? {
        coordinates: [
          workerLocation.longitude,
          workerLocation.latitude,
        ] as Coordinates,
        heading: workerLocation.heading,
      }
    : null;
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
    marker: markerRef.current,
    coordinates: liveLocation?.coordinates ?? null,
  });
  useMarkerHeading({
    marker: markerRef.current,
    coordinates: liveLocation?.coordinates ?? null,
    gpsHeading: liveLocation?.heading ?? null,
    minimumMovementMeters: 3,
  });
  useFollowLocation({
    map: mapRef.current,
    coordinates: liveLocation?.coordinates ?? null,
    enabled:
    isOnline &&
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

  const initialLocationLoadedRef = useRef(false);
  const automaticRouteStartedRef = useRef(false);
  const initialGpsRequestedRef = useRef(false);
  const userSelectedLocationRef = useRef(false);

  useEffect(() => {
  if (
    !navigationMode ||
    !mapReady ||
    !initialLocation ||
    initialLocationLoadedRef.current
  ) {
    return;
  }

  const destination = initialLocation;

  initialLocationLoadedRef.current = true;

  selectedCoordinatesRef.current = [
    destination.longitude,
    destination.latitude,
  ];

  void saveLocation(
    destination.latitude,
    destination.longitude,
    destination.address,
    true,
  );

  void goOnline();
}, [initialLocation, mapReady, navigationMode, saveLocation, goOnline]);
  useEffect(() => {
    if (
      !navigationMode ||
      !mapReady ||
      !initialLocation ||
      !liveLocation ||
      automaticRouteStartedRef.current
    ) {
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

    enabled:
      isTracking && showDirections && selectedCoordinatesRef.current !== null,

    refreshRoute: getDirections,

    minimumDistanceMeters: 50,
    minimumIntervalMilliseconds: 30_000,
  });

  const selectSearchResultBase = useSearchResultSelect({
    saveLocation,
    addToSearchHistory,
  });

  const handleSearchResultSelect = useCallback(
    async (result: Parameters<typeof selectSearchResultBase>[0]) => {
      userSelectedLocationRef.current = true;
      await selectSearchResultBase(result);
    },
    [selectSearchResultBase],
  );

  const recenterMap = useRecenterMap({
    mapRef,
    currentLocationRef,
  });
  useEffect(() => {
    if (
      navigationMode ||
      initialGpsRequestedRef.current ||
      userSelectedLocationRef.current
    ) {
      return;
    }

    initialGpsRequestedRef.current = true;
    void getCurrentLocation(true);
  }, [getCurrentLocation, navigationMode]);

const selectedMapStyle =
  style === "satellite"
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


const {
  nearbyWorkersCount,
  loadingWorkers,
  nearbyWorkersError,
  refreshNearbyWorkers,
} = useNearbyWorkers({
  mapRef,
  currentLocationRef:
    navigationMode ? currentLocationRef : selectedCoordinatesRef,
  enabled: showNearbyWorkers && mapReady,
  radiusKilometers: nearbyWorkerRadiusKilometers,
  onWorkerSelect: onNearbyWorkerSelect,
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

  const confirmAddressBase = useConfirmAddress({
    editableAddress,
    latitude,
    longitude,
    setMessage,
    setSelectedAddress,
    setSearchText,
    callback: callbackRef.current,
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
  const saveUserSelectedLocation = useCallback(
    async (
      nextLatitude: number,
      nextLongitude: number,
      nextAddress?: string,
      preserveView?: boolean,
    ) => {
      userSelectedLocationRef.current = true;

      await saveLocation(
        nextLatitude,
        nextLongitude,
        nextAddress,
        preserveView,
      );
    },
    [saveLocation],
  );

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
    hasCurrentLocation: currentLocationRef.current !== null,

    searchAddress,
    clearSearch,
    handleSearchResultSelect,
    handleCurrentLocation,
    clearSearchHistory,
    saveLocation: saveUserSelectedLocation,
    setShowLayers,
    getDirections,
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

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.12)] sm:rounded-[28px]">
      <div className="relative flex h-[68dvh] min-h-[500px] max-h-[760px] w-full overflow-hidden sm:h-[650px]">
        <div className="hidden w-[320px] shrink-0 lg:block">
          <MapSidebar {...sidebarProps} />
        </div>
        <div className="relative flex-1">
          <div ref={mapContainerRef} className="h-full w-full bg-slate-100" />

          {navigationMode && (
            <div className="pointer-events-none absolute left-4 bottom-4 z-20 rounded-xl border border-blue-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
              <p className="text-xs font-extrabold uppercase tracking-wide text-blue-700">
                Customer location locked
              </p>
              <p className="mt-1 max-w-64 text-xs text-slate-600">
                The destination comes from the confirmed booking and cannot be moved by the worker.
              </p>
            </div>
          )}
          {showNearbyWorkers && (
            <div className="pointer-events-none absolute right-3 top-3 z-20 sm:right-4 sm:top-4">
              <div className="rounded-xl border border-white/70 bg-white/95 px-3 py-2 shadow-lg backdrop-blur sm:rounded-2xl sm:px-4 sm:py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Nearby Workers
                </p>

                <p className="mt-1 text-sm font-bold text-slate-900 sm:text-lg">
                  {loadingWorkers
                    ? "Loading..."
                    : `${nearbyWorkersCount} available`}
                </p>

                {nearbyWorkersError && (
                  <p className="mt-1 max-w-52 text-xs text-red-600">
                    {nearbyWorkersError}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile map actions */}
        <div className="absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => setShowLayers(true)}
            className="min-h-11 rounded-xl border border-slate-200 bg-white/95 px-4 text-sm font-bold text-slate-700 shadow-lg backdrop-blur"
          >
            Layers
          </button>

          <button
            type="button"
            onClick={() => void getDirections()}
            disabled={routing || !currentLocationRef.current}
            className="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
          >
            {routing ? "Routing..." : "Route"}
          </button>
        </div>

        <LoadingOverlay visible={!mapReady} />

        {!navigationMode && <MobileSearch {...mobileSearchProps} />}

        <CompassIndicator bearing={bearing} />

        <CurrentLocationButton
          locating={locating}
          onClick={handleCurrentLocation}
        />
        <LayersModal {...layersModalProps} />

        <RouteCard
          visible={showDirections}
          selectedAddress={selectedAddress}
          distance={distance}
          duration={duration}
          onClose={() => setShowDirections(false)}
        />

        <MouseCoordinates coordinates={mouseCoordinates} />

        <MessageBanner message={message} />
      </div>

      {!navigationMode && (
        <LocationConfirmSection
          editableAddress={editableAddress}
          selectedAddress={selectedAddress}
          latitude={latitude}
          longitude={longitude}
          confirmed={locationConfirmed}
          onAddressChange={setEditableAddress}
          onConfirm={confirmAddress}
          onChangeLocation={unlockLocation}
        />
      )}
    </div>
  );
}