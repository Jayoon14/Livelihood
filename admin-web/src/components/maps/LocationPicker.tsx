import { useCallback, useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import type { Coordinates } from "./types";
import { DEFAULT_CENTER } from "./mapStyles";

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
import { useNearbyWorkers } from "./hooks/useNearbyWorkers";
import { useLiveLocation } from "./hooks/useLiveLocation";
import { useSearchHistory } from "./hooks/useSearchHistory";
import { useRouteLayer } from "./hooks/useRouteLayer";
import { useTrafficLayer } from "./hooks/useTrafficLayer";
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

  showNearbyWorkers?: boolean;
  nearbyWorkerRadiusKilometers?: number;

  initialLocation?: InitialLocation;
  navigationMode?: boolean;
}
export default function LocationPicker({
  onLocationSelect,
  showNearbyWorkers = false,
  nearbyWorkerRadiusKilometers = 20,
  initialLocation,
  navigationMode = false,
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const callbackRef = useRef(onLocationSelect);

  const selectedCoordinatesRef = useRef<Coordinates>(DEFAULT_CENTER);
  const currentLocationRef = useRef<Coordinates | null>(null);
  const routeCoordinatesRef = useRef<[number, number][]>([]);
  
  const tomTomApiKey = import.meta.env.VITE_TOMTOM_API_KEY as
    | string
    | undefined;

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

    trafficEnabled,
    setTrafficEnabled,

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

  useEffect(() => {
    callbackRef.current = onLocationSelect;
  }, [onLocationSelect]);

  const drawRoute = useRouteLayer({
    mapRef,
    routeCoordinatesRef,
  });

  const saveLocation = useSaveLocation({
    mapRef,
    markerRef,
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

  const getCurrentLocation = useCurrentLocation({
    currentLocationRef,
    saveLocation,
    setLocating,
    setMessage,
  });

const {
  liveLocation,
  isTracking,
  startTracking,
} = useLiveLocation({
  currentLocationRef,
  setMessage,
  setLocating,

  onLocationUpdate: ({ coordinates }) => {
    console.log("Live GPS coordinates:", coordinates);
  },
});
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
    followUser &&
    !showDirections &&
    !navigationMode,
});
  useMapInitialization({
    mapContainerRef,
    mapRef,
    markerRef,
    routeCoordinatesRef,
    drawRoute,
    saveLocation,
    setMapReady,
    setBearing,
    setMouseCoordinates,
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

  // Siguraduhing customer coordinates ang destination.
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

  startTracking();
}, [
  initialLocation,
  mapReady,
  navigationMode,
  saveLocation,
  startTracking,
]);
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
  currentLocationRef.current =
    liveLocation.coordinates;

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
}, [
  getDirections,
  initialLocation,
  liveLocation,
  mapReady,
  navigationMode,
]);

useLiveRouteRefresh({
  coordinates: liveLocation?.coordinates ?? null,

  enabled:
    isTracking &&
    showDirections &&
    selectedCoordinatesRef.current !== null,

  refreshRoute: getDirections,

  minimumDistanceMeters: 50,
  minimumIntervalMilliseconds: 30_000,
});

  const handleSearchResultSelect = useSearchResultSelect({
    saveLocation,
    addToSearchHistory,
  });

  const recenterMap = useRecenterMap({
    mapRef,
    currentLocationRef,
  });

useEffect(() => {
  if (navigationMode) {
    // Kunin lang ang worker GPS.
    // Huwag gawing destination ang worker location.
    getCurrentLocation(false);
    return;
  }

  getCurrentLocation(true);
}, [getCurrentLocation, navigationMode]);

  useMapStyle({
    mapRef,
    style,
    setMapReady,
  });

  useTrafficLayer({
    mapRef,
    mapReady,
    trafficEnabled,
    tomTomApiKey,
  });

  const {
  nearbyWorkersCount,
  loadingWorkers,
  nearbyWorkersError,
  refreshNearbyWorkers,
} = useNearbyWorkers({
  mapRef,
  currentLocationRef,
  enabled: showNearbyWorkers && mapReady,
  radiusKilometers: nearbyWorkerRadiusKilometers,
});

  const confirmAddress = useConfirmAddress({
    editableAddress,
    latitude,
    longitude,
    setMessage,
    setSelectedAddress,
    setSearchText,
    callback: callbackRef.current,
  });

  const clearSearch = useClearSearch({
    setSearchText,
    setResults,
  });

const handleCurrentLocation = useCallback(() => {
  startTracking();

  if (currentLocationRef.current) {
    recenterMap();
    refreshNearbyWorkers();
    return;
  }

  getCurrentLocation(true);
}, [
  getCurrentLocation,
  recenterMap,
  refreshNearbyWorkers,
  startTracking,
]);
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
    saveLocation,
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
    trafficEnabled,
    tomTomApiKey,
    setShowLayers,
    setStyle,
    setTrafficEnabled,
  });

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.15)]">
      <div className="relative flex h-[520px] w-full overflow-hidden sm:h-[600px]">
        <MapSidebar {...sidebarProps} />
        <div className="relative flex-1">
          <div ref={mapContainerRef} className="h-full w-full bg-slate-100" />
          {showNearbyWorkers && (
          <div className="pointer-events-none absolute left-4 top-4 z-20">
            <div className="rounded-2xl border border-white/70 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Nearby Workers
              </p>

              <p className="mt-1 text-lg font-bold text-slate-900">
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

        <LoadingOverlay visible={!mapReady} />

        <MobileSearch {...mobileSearchProps} />

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
            onAddressChange={setEditableAddress}
            onConfirm={confirmAddress}
          />
        )}
    </div>
  );
}
