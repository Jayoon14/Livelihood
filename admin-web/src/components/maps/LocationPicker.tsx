import { useCallback, useEffect, useRef, useState } from "react";
import {
  FullscreenControl,
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  ScaleControl,
  type GeoJSONSource,
  type MapMouseEvent,
  type StyleSpecification,
} from "maplibre-gl";
import {
  Check,
  Crosshair,
  History,
  Layers3,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Navigation,
  PencilLine,
  Search,
  Satellite,
  TrafficCone,
  Trash2,
  X,
} from "lucide-react";

import "maplibre-gl/dist/maplibre-gl.css";

interface Props {
  onLocationSelect: (
    latitude: number,
    longitude: number,
    address: string,
  ) => void;
}

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface SavedPlace {
  address: string;
  latitude: number;
  longitude: number;
}

interface RouteResult {
  routes?: Array<{
    distance: number;
    duration: number;
    geometry: {
      type: "LineString";
      coordinates: [number, number][];
    };
  }>;
}

type StyleKey = "standard" | "bright" | "dark" | "threeD" | "satellite";
type Coordinates = [number, number];

const DEFAULT_CENTER: Coordinates = [121.1251, 14.2786];
const SEARCH_HISTORY_KEY = "livelihoodgo_search_history";

const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    satellite: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Tiles © Esri",
    },
    labels: {
      type: "raster",
      tiles: [
        "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Labels © Esri",
    },
  },
  layers: [
    {
      id: "satellite",
      type: "raster",
      source: "satellite",
    },
    {
      id: "satellite-labels",
      type: "raster",
      source: "labels",
    },
  ],
};

const STYLES: Record<Exclude<StyleKey, "satellite">, string> = {
  standard: "https://tiles.openfreemap.org/styles/liberty",
  bright: "https://tiles.openfreemap.org/styles/bright",
  dark: "https://tiles.openfreemap.org/styles/dark",
  threeD: "https://tiles.openfreemap.org/styles/3d",
};

const STYLE_OPTIONS: Array<{
  key: StyleKey;
  label: string;
  className: string;
}> = [
  { key: "standard", label: "Standard", className: "bg-emerald-100" },
  { key: "bright", label: "Bright", className: "bg-sky-100" },
  { key: "dark", label: "Dark", className: "bg-slate-800" },
  {
    key: "threeD",
    label: "3D",
    className: "bg-gradient-to-br from-emerald-100 to-violet-200",
  },
  {
    key: "satellite",
    label: "Satellite",
    className: "bg-gradient-to-br from-green-900 to-sky-900",
  },
];

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
    );

    if (!response.ok) throw new Error("Reverse geocoding failed.");

    const data = (await response.json()) as { display_name?: string };

    return data.display_name ?? `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch (error) {
    console.error(error);
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}
function formatDistance(meters: number) {
  return meters < 1000
    ? `${Math.round(meters)} m`
    : `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return minutes < 60
    ? `${minutes} min`
    : `${Math.floor(minutes / 60)} hr ${minutes % 60} min`;
}

export default function LocationPicker({ onLocationSelect }: Props) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const searchTimerRef = useRef<number | null>(null);
  const callbackRef = useRef(onLocationSelect);
  const selectedCoordinatesRef = useRef<Coordinates>(DEFAULT_CENTER);
  const currentLocationRef = useRef<Coordinates | null>(null);
  const routeCoordinatesRef = useRef<[number, number][]>([]);

  const [style, setStyle] = useState<StyleKey>("standard");
  const [showLayers, setShowLayers] = useState(false);
  const [showDirections, setShowDirections] = useState(false);
  const [trafficEnabled, setTrafficEnabled] = useState(false);

  const tomTomApiKey = import.meta.env.VITE_TOMTOM_API_KEY as
    | string
    | undefined;

  const [longitude, setLongitude] = useState(DEFAULT_CENTER[0]);
  const [latitude, setLatitude] = useState(DEFAULT_CENTER[1]);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [editableAddress, setEditableAddress] = useState("");
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);

  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [routing, setRouting] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [message, setMessage] = useState("");
  const [distance, setDistance] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [bearing, setBearing] = useState(0);
  const [searchHistory, setSearchHistory] = useState<SavedPlace[]>(() => {
    try {
      const savedHistory = localStorage.getItem(SEARCH_HISTORY_KEY);

      if (!savedHistory) {
        return [];
      }

      return JSON.parse(savedHistory) as SavedPlace[];
    } catch (error) {
      console.error("Unable to load search history:", error);
      return [];
    }
  });
  const [mouseCoordinates, setMouseCoordinates] =
    useState<Coordinates>(DEFAULT_CENTER);

  useEffect(() => {
    callbackRef.current = onLocationSelect;
  }, [onLocationSelect]);
  const addToSearchHistory = useCallback((place: SavedPlace) => {
    setSearchHistory((currentHistory) => {
      const historyWithoutDuplicate = currentHistory.filter(
        (item) =>
          item.address !== place.address &&
          !(
            item.latitude === place.latitude &&
            item.longitude === place.longitude
          ),
      );
      const updatedHistory = [place, ...historyWithoutDuplicate].slice(0, 5);

      try {
        localStorage.setItem(
          SEARCH_HISTORY_KEY,
          JSON.stringify(updatedHistory),
        );
      } catch (error) {
        console.error("Unable to save search history:", error);
      }

      return updatedHistory;
    });
  }, []);
  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);

    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch (error) {
      console.error("Unable to clear search history:", error);
    }
  }, []);

  const addTrafficLayer = useCallback(() => {
    const map = mapRef.current;

    if (!map || !map.isStyleLoaded() || !tomTomApiKey) return;

    if (!map.getSource("live-traffic")) {
      map.addSource("live-traffic", {
        type: "raster",
        tiles: [
          `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${tomTomApiKey}&tileSize=256&thickness=8`,
        ],
        tileSize: 256,
      });
    }

    if (!map.getLayer("live-traffic-layer")) {
      map.addLayer({
        id: "live-traffic-layer",
        type: "raster",
        source: "live-traffic",
        paint: {
          "raster-opacity": 0.9,
        },
      });
    }
  }, [tomTomApiKey]);

  const removeTrafficLayer = useCallback(() => {
    const map = mapRef.current;

    if (!map || !map.isStyleLoaded()) return;

    if (map.getLayer("live-traffic-layer")) {
      map.removeLayer("live-traffic-layer");
    }

    if (map.getSource("live-traffic")) {
      map.removeSource("live-traffic");
    }
  }, []);

  const drawRoute = useCallback((coordinates: [number, number][]) => {
    const map = mapRef.current;
    routeCoordinatesRef.current = coordinates;

    if (!map || !map.isStyleLoaded()) return;

    const data = {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates,
      },
    };

    const source = map.getSource("route") as GeoJSONSource | undefined;

    if (source) {
      source.setData(data);
      return;
    }

    map.addSource("route", {
      type: "geojson",
      data,
    });

    map.addLayer({
      id: "route-shadow",
      type: "line",
      source: "route",
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#0f172a",
        "line-width": 9,
        "line-opacity": 0.2,
      },
    });

    map.addLayer({
      id: "route-line",
      type: "line",
      source: "route",
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#2563eb",
        "line-width": 6,
      },
    });
  }, []);

  const saveLocation = useCallback(
    async (
      lat: number,
      lng: number,
      suppliedAddress?: string,
      moveCamera = true,
    ) => {
      const address = suppliedAddress ?? (await reverseGeocode(lat, lng));

      selectedCoordinatesRef.current = [lng, lat];
      setLongitude(lng);
      setLatitude(lat);
      setSelectedAddress(address);
      setEditableAddress(address);
      setSearchText(address);
      setResults([]);
      setMessage("");

      markerRef.current?.setLngLat([lng, lat]);

      if (moveCamera) {
        mapRef.current?.flyTo({
          center: [lng, lat],
          zoom: 17,
          duration: 1000,
          essential: true,
        });
      }

      callbackRef.current(lat, lng, address);
    },
    [],
  );

  const getCurrentLocation = useCallback(
    (selectAsDestination = true) => {
      if (!navigator.geolocation) {
        setMessage("Geolocation is not supported by this browser.");
        return;
      }

      setLocating(true);
      setMessage("");

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coordinates: Coordinates = [
            position.coords.longitude,
            position.coords.latitude,
          ];

          currentLocationRef.current = coordinates;

          if (selectAsDestination) {
            await saveLocation(
              position.coords.latitude,
              position.coords.longitude,
            );
          }

          setLocating(false);
        },
        (error) => {
          console.error(error);
          setLocating(false);
          setMessage(
            "Unable to access your location. Allow location permission or choose a point on the map.",
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 30000,
        },
      );
    },
    [saveLocation],
  );
  const recenterMap = () => {
    if (!mapRef.current || !currentLocationRef.current) return;

    mapRef.current.flyTo({
      center: currentLocationRef.current,
      zoom: 17,
      bearing: 0,
      pitch: 0,
      duration: 1500,
      essential: true,
    });
  };

  const getDirections = useCallback(async () => {
    if (!currentLocationRef.current) {
      getCurrentLocation(false);
      setMessage("Allow current location, then press Directions again.");
      return;
    }

    const origin = currentLocationRef.current;
    const destination = selectedCoordinatesRef.current;

    setRouting(true);
    setMessage("");

    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${origin[0]},${origin[1]};${destination[0]},${destination[1]}?overview=full&geometries=geojson`,
      );

      if (!response.ok) throw new Error("Routing failed.");

      const data = (await response.json()) as RouteResult;
      const route = data.routes?.[0];

      if (!route) throw new Error("No route found.");

      drawRoute(route.geometry.coordinates);
      setDistance(route.distance);
      setDuration(route.duration);
      setShowDirections(true);

      const bounds = new LngLatBounds(
        route.geometry.coordinates[0],
        route.geometry.coordinates[0],
      );

      route.geometry.coordinates.forEach((point) => bounds.extend(point));

      mapRef.current?.fitBounds(bounds, {
        padding: 90,
        duration: 1000,
      });
    } catch (error) {
      console.error(error);
      setMessage("Directions are temporarily unavailable.");
    } finally {
      setRouting(false);
    }
  }, [drawRoute, getCurrentLocation]);

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || mapRef.current) return;

    const map = new MapLibreMap({
      container,
      style: STYLES.standard,
      center: DEFAULT_CENTER,
      zoom: 14,
      attributionControl: {
        compact: true,
      },
    });

    const markerElement = document.createElement("div");
    markerElement.className =
      "h-12 w-12 rounded-full border-4 border-white bg-blue-600 shadow-2xl";

    const marker = new Marker({
      element: markerElement,
      draggable: true,
      anchor: "center",
    })
      .setLngLat(DEFAULT_CENTER)
      .addTo(map);

    marker.on("dragend", async () => {
      const coordinates = marker.getLngLat();
      await saveLocation(coordinates.lat, coordinates.lng, undefined, false);
    });

    map.on("click", async (event: MapMouseEvent) => {
      setMouseCoordinates([event.lngLat.lng, event.lngLat.lat]);
      await saveLocation(event.lngLat.lat, event.lngLat.lng);
    });

    map.on("load", () => setMapReady(true));
    map.on("rotate", () => {
      setBearing(map.getBearing());
    });

    map.on("style.load", () => {
      setMapReady(true);
      if (routeCoordinatesRef.current.length > 1) {
        drawRoute(routeCoordinatesRef.current);
      }
    });

    map.addControl(
      new NavigationControl({
        showZoom: true,
        showCompass: true,
        visualizePitch: true,
      }),
      "bottom-right",
    );

    map.addControl(new FullscreenControl(), "bottom-right");

    map.addControl(
      new ScaleControl({
        maxWidth: 120,
        unit: "metric",
      }),
      "bottom-left",
    );

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      marker.remove();
      map.remove();
      markerRef.current = null;
      mapRef.current = null;
    };
  }, [drawRoute, saveLocation]);

  useEffect(() => {
    getCurrentLocation(true);
  }, [getCurrentLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    setMapReady(false);

    if (style === "satellite") {
      map.setStyle(SATELLITE_STYLE);
      map.easeTo({ pitch: 0, bearing: 0, duration: 500 });
      return;
    }

    map.setStyle(STYLES[style]);
    map.easeTo({
      pitch: style === "threeD" ? 55 : 0,
      bearing: style === "threeD" ? -18 : 0,
      duration: 700,
    });
  }, [style]);

  useEffect(() => {
    if (!mapReady) return;

    if (trafficEnabled) {
      addTrafficLayer();
    } else {
      removeTrafficLayer();
    }
  }, [addTrafficLayer, mapReady, removeTrafficLayer, trafficEnabled]);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current !== null) {
        window.clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  function searchAddress(value: string) {
    setSearchText(value);

    if (searchTimerRef.current !== null) {
      window.clearTimeout(searchTimerRef.current);
    }

    if (value.trim().length < 3) {
      setResults([]);
      return;
    }

    searchTimerRef.current = window.setTimeout(async () => {
      setSearching(true);

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=7&countrycodes=ph&q=${encodeURIComponent(
            value,
          )}`,
        );

        if (!response.ok) throw new Error("Search failed.");

        setResults((await response.json()) as SearchResult[]);
      } catch (error) {
        console.error(error);
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 650);
  }

  function confirmAddress() {
    const address = editableAddress.trim();

    if (!address) {
      setMessage("Enter the exact service address.");
      return;
    }

    setSelectedAddress(address);
    setSearchText(address);
    callbackRef.current(latitude, longitude, address);
    setMessage("Location confirmed.");
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.15)]">
      <div className="relative flex h-[520px] w-full overflow-hidden sm:h-[600px]">
        <div className="relative z-20 hidden w-[320px] shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          ` {/* Sidebar header */}
          <div className="border-b border-slate-200 px-5 py-5">
            <h2 className="text-xl font-bold text-slate-900">Navigation</h2>

            <p className="mt-1 text-sm leading-5 text-slate-500">
              Search a destination or choose a point on the map.
            </p>
          </div>
          {/* Sidebar content */}
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {/* Search */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Search location
              </label>

              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600"
                />

                <input
                  value={searchText}
                  onChange={(event) => searchAddress(event.target.value)}
                  placeholder="Street, barangay, city..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-10 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />

                {searching ? (
                  <LoaderCircle
                    size={18}
                    className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-blue-600"
                  />
                ) : searchText ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchText("");
                      setResults([]);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                  >
                    <X size={16} />
                  </button>
                ) : null}
              </div>
            </div>

            {/* Desktop search suggestions */}
            {results.length > 0 && (
              <div className="mt-3 max-h-64 space-y-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                {results.map((result) => (
                  <button
                    key={result.place_id}
                    type="button"
                    onClick={async () => {
                      const latitude = Number(result.lat);
                      const longitude = Number(result.lon);

                      await saveLocation(
                        latitude,
                        longitude,
                        result.display_name,
                      );

                      addToSearchHistory({
                        address: result.display_name,
                        latitude,
                        longitude,
                      });
                    }}
                    className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-blue-50"
                  >
                    <span className="mt-0.5 rounded-full bg-blue-100 p-2 text-blue-600">
                      <MapPin size={16} />
                    </span>

                    <span className="line-clamp-2 text-sm leading-5 text-slate-700">
                      {result.display_name}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Current location */}
            <button
              type="button"
              onClick={() => getCurrentLocation(true)}
              className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-blue-300 hover:bg-blue-50"
            >
              <span className="rounded-xl bg-blue-100 p-2.5 text-blue-600">
                {locating ? (
                  <LoaderCircle size={18} className="animate-spin" />
                ) : (
                  <LocateFixed size={18} />
                )}
              </span>

              <span>
                <span className="block text-sm font-semibold text-slate-900">
                  Current location
                </span>

                <span className="block text-xs text-slate-500">
                  Use your device GPS
                </span>
              </span>
            </button>
            {/* Recent searches */}
            {searchHistory.length > 0 && (
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History size={17} className="text-slate-500" />

                    <p className="text-sm font-semibold text-slate-700">
                      Recent searches
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={clearSearchHistory}
                    title="Clear search history"
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="space-y-1">
                  {searchHistory.map((place) => (
                    <button
                      key={`${place.latitude}-${place.longitude}-${place.address}`}
                      type="button"
                      onClick={() =>
                        saveLocation(
                          place.latitude,
                          place.longitude,
                          place.address,
                        )
                      }
                      className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-slate-100"
                    >
                      <span className="mt-0.5 rounded-full bg-slate-100 p-2 text-slate-500">
                        <History size={15} />
                      </span>

                      <span className="min-w-0">
                        <span className="line-clamp-2 block text-sm leading-5 text-slate-700">
                          {place.address}
                        </span>

                        <span className="mt-1 block text-[11px] text-slate-400">
                          {place.latitude.toFixed(5)},{" "}
                          {place.longitude.toFixed(5)}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selected destination */}
            <div className="mt-5">
              <p className="mb-2 text-sm font-semibold text-slate-700">
                Selected destination
              </p>

              <div className="rounded-2xl bg-slate-100 p-4">
                <div className="flex items-start gap-3">
                  <MapPin size={18} className="mt-0.5 shrink-0 text-blue-600" />

                  <p className="text-sm leading-6 text-slate-700">
                    {selectedAddress || "No destination selected yet."}
                  </p>
                </div>
              </div>
            </div>

            {/* Map actions */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowLayers(true)}
                className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50"
              >
                <Layers3 size={18} />
                Layers
              </button>

              <button
                type="button"
                onClick={getDirections}
                className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-3 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
              >
                {routing ? (
                  <LoaderCircle size={18} className="animate-spin" />
                ) : (
                  <Navigation size={18} />
                )}
                Route
              </button>
            </div>

            {/* Route information */}
            {distance !== null && duration !== null && (
              <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-sm font-bold text-blue-900">
                  Route information
                </p>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white p-3">
                    <p className="text-xs text-slate-500">Distance</p>

                    <p className="mt-1 font-bold text-slate-900">
                      {formatDistance(distance)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-3">
                    <p className="text-xs text-slate-500">Estimated time</p>

                    <p className="mt-1 font-bold text-slate-900">
                      {formatDuration(duration)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="relative flex-1">
          <div ref={mapContainerRef} className="h-full w-full bg-slate-100" />
        </div>
        {!mapReady && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70 backdrop-blur-sm">
            <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-2xl">
              <LoaderCircle className="animate-spin text-blue-600" />
              <span className="font-semibold text-slate-700">
                Loading map...
              </span>
            </div>
          </div>
        )}
        <div className="absolute left-3 top-24 z-10 flex flex-col gap-2 sm:left-5 sm:top-28 lg:hidden">
          <div className="flex min-h-14 items-center gap-3 rounded-2xl border border-white/80 bg-white/95 px-4 shadow-2xl backdrop-blur-xl">
            <Search size={21} className="text-blue-600" />

            <input
              value={searchText}
              onChange={(event) => searchAddress(event.target.value)}
              placeholder="Search street, barangay, city, or landmark..."
              className="min-w-0 flex-1 bg-transparent py-4 text-sm font-medium outline-none"
            />

            {searching ? (
              <LoaderCircle className="animate-spin text-blue-600" size={20} />
            ) : searchText ? (
              <button
                type="button"
                onClick={() => {
                  setSearchText("");
                  setResults([]);
                }}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => {
                getCurrentLocation(true);

                recenterMap();
              }}
              className="rounded-full bg-blue-50 p-2.5 text-blue-600 hover:bg-blue-100"
            >
              {locating ? (
                <LoaderCircle className="animate-spin" size={19} />
              ) : (
                <Crosshair size={19} />
              )}
            </button>
          </div>

          {results.length > 0 && (
            <div className="mt-2 max-h-80 overflow-y-auto rounded-2xl border bg-white p-2 shadow-2xl">
              {results.map((result) => (
                <button
                  key={result.place_id}
                  type="button"
                  onClick={async () => {
                    const latitude = Number(result.lat);
                    const longitude = Number(result.lon);

                    await saveLocation(
                      latitude,
                      longitude,
                      result.display_name,
                    );

                    addToSearchHistory({
                      address: result.display_name,
                      latitude,
                      longitude,
                    });
                  }}
                  className="flex w-full items-start gap-3 rounded-xl p-3 text-left hover:bg-slate-50"
                >
                  <span className="rounded-full bg-blue-50 p-2 text-blue-600">
                    <MapPin size={18} />
                  </span>

                  <span className="line-clamp-2 text-sm leading-6 text-slate-700">
                    {result.display_name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="absolute bottom-28 left-3 z-20 lg:left-[332px]">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-xl">
            <div
              style={{
                transform: `rotate(${-bearing}deg)`,
                transition: "transform .2s linear",
              }}
            >
              🧭
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => getCurrentLocation(true)}
          className="absolute bottom-24 right-3 z-10 rounded-2xl bg-white/95 p-3 text-blue-600 shadow-xl backdrop-blur"
        >
          <LocateFixed size={21} />
        </button>
        {showLayers && (
          <div className="absolute inset-0 z-40 bg-slate-950/20 p-4 backdrop-blur-[2px]">
            <div className="h-full max-w-sm overflow-y-auto rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur-xl">
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Map appearance
                  </h3>
                  <p className="text-sm text-slate-500">
                    Choose your preferred map style.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowLayers(false)}
                  className="rounded-full p-2 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {STYLE_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => {
                      setStyle(option.key);
                      setShowLayers(false);
                    }}
                    className={`rounded-2xl border p-2 text-left ${
                      style === option.key
                        ? "border-blue-600 bg-blue-50"
                        : "border-slate-200"
                    }`}
                  >
                    <div
                      className={`mb-3 h-24 rounded-xl ${option.className}`}
                    />

                    <div className="flex items-center justify-between px-1 pb-1">
                      <span className="text-sm font-bold">{option.label}</span>

                      {style === option.key &&
                        (option.key === "satellite" ? (
                          <Satellite size={17} className="text-blue-600" />
                        ) : (
                          <Check size={17} className="text-blue-600" />
                        ))}
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-5 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  disabled={!tomTomApiKey}
                  onClick={() => setTrafficEnabled((current) => !current)}
                  className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
                    trafficEnabled
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 bg-white"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <div className="flex items-center gap-3">
                    <span className="rounded-xl bg-amber-50 p-2 text-amber-600">
                      <TrafficCone size={20} />
                    </span>

                    <div>
                      <p className="font-semibold text-slate-900">
                        Live Traffic
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Show current road conditions
                      </p>
                    </div>
                  </div>

                  <span
                    className={`relative h-7 w-12 rounded-full transition ${
                      trafficEnabled ? "bg-blue-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                        trafficEnabled ? "left-6" : "left-1"
                      }`}
                    />
                  </span>
                </button>

                {!tomTomApiKey && (
                  <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                    Add VITE_TOMTOM_API_KEY to your .env file to activate live
                    traffic.
                  </p>
                )}

                {tomTomApiKey && (
                  <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                    <div className="h-2 rounded-full bg-gradient-to-r from-green-500 via-yellow-400 to-red-600" />
                    <div className="mt-2 flex justify-between text-[11px] text-slate-500">
                      <span>Fast</span>
                      <span>Moderate</span>
                      <span>Slow</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {showDirections && (
          <div className="absolute bottom-4 left-3 right-20 z-20 max-w-md rounded-3xl bg-white/95 p-4 shadow-2xl backdrop-blur-xl sm:left-5 sm:right-auto sm:w-[410px] lg:hidden">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-slate-900">
                  Route to service location
                </p>
                <p className="mt-1 line-clamp-1 text-sm text-slate-500">
                  {selectedAddress}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowDirections(false)}
                className="rounded-full p-2 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {distance !== null && duration !== null && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-blue-50 p-3">
                  <p className="text-xs text-blue-600">Distance</p>
                  <p className="mt-1 text-lg font-bold text-blue-900">
                    {formatDistance(distance)}
                  </p>
                </div>

                <div className="rounded-2xl bg-emerald-50 p-3">
                  <p className="text-xs text-emerald-600">Estimated time</p>
                  <p className="mt-1 text-lg font-bold text-emerald-900">
                    {formatDuration(duration)}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
        <div className="absolute bottom-4 right-3 z-20 rounded-xl bg-black/75 px-3 py-2 text-xs text-white backdrop-blur">
          <div>Lat : {mouseCoordinates[1].toFixed(6)}</div>

          <div>Lng : {mouseCoordinates[0].toFixed(6)}</div>
        </div>
        {message && (
          <div className="absolute bottom-4 left-3 right-20 z-30 max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-xl sm:left-5 sm:right-auto">
            {message}
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="rounded-2xl bg-blue-600 p-3 text-white shadow-lg shadow-blue-200">
            <MapPin size={22} />
          </span>

          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Confirm service location
            </h3>
            <p className="text-sm text-slate-500">
              Add the exact house number, street, or landmark.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <PencilLine
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={editableAddress}
              onChange={(event) => setEditableAddress(event.target.value)}
              placeholder="House number, street, barangay, landmark..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <button
            type="button"
            onClick={confirmAddress}
            className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-blue-200 hover:bg-blue-700"
          >
            <Check size={18} />
            Confirm Location
          </button>
        </div>

        <div className="mt-4 rounded-2xl bg-slate-50 p-4">
          <p className="font-semibold text-slate-800">Selected address</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {selectedAddress ||
              "Search, use your current location, or click the map."}
          </p>

          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-white px-3 py-1.5">
              Latitude: {latitude.toFixed(6)}
            </span>
            <span className="rounded-full bg-white px-3 py-1.5">
              Longitude: {longitude.toFixed(6)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
