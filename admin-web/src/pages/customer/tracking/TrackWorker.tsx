import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Clock3,
  LocateFixed,
  MapPin,
  Navigation,
  Radio,
  WifiOff,
} from "lucide-react";
import {
  GeoJSONSource,
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import CustomerLayout from "../../../layouts/CustomerLayout";
import { supabase } from "../../../lib/supabase";

interface BookingData {
  id: number;
  customer_id: string;
  worker_id: string;

  status: string;
  trip_status: string | null;

  customer_address: string | null;
  customer_latitude: number | null;
  customer_longitude: number | null;

  worker?: {
    first_name: string | null;
    middle_name: string | null;
    last_name: string | null;
    profile_picture: string | null;
  } | null;

  services?: {
    service_name: string | null;
  } | null;
}

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

interface RouteInformation {
  distanceMeters: number;
  durationSeconds: number;
  trafficDelaySeconds: number;
  noTrafficDurationSeconds: number;
  trafficLengthMeters: number;
}
const ROUTE_SOURCE_ID = "customer-worker-route-source";
const ROUTE_LAYER_ID = "customer-worker-route-layer";
const STALE_GPS_THRESHOLD = 2 * 60 * 1000; // 2 minutes
const ROUTE_REFRESH_INTERVAL = 12_000; // 12 seconds
const MIN_ROUTE_MOVEMENT_METERS = 15;

const MAP_STYLE = {
  version: 8 as const,

  sources: {
    openStreetMap: {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },

  layers: [
    {
      id: "openStreetMap",
      type: "raster" as const,
      source: "openStreetMap",
    },
  ],
};

function formatDistance(distanceMeters: number | null) {
  if (distanceMeters === null) {
    return "Calculating...";
  }

  if (distanceMeters < 1_000) {
    return `${Math.round(distanceMeters)} m`;
  }

  return `${(distanceMeters / 1_000).toFixed(1)} km`;
}

function formatDuration(durationSeconds: number | null) {
  if (durationSeconds === null) {
    return "Calculating...";
  }

  const minutes = Math.max(1, Math.ceil(durationSeconds / 60));

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0
    ? `${hours} hr ${remainingMinutes} min`
    : `${hours} hr`;
}
function getTrafficStatus(
  trafficDelaySeconds: number,
  durationSeconds: number,
) {
  const delayMinutes = Math.ceil(trafficDelaySeconds / 60);

  const delayRatio =
    durationSeconds > 0 ? trafficDelaySeconds / durationSeconds : 0;

  if (delayMinutes <= 2 || delayRatio < 0.1) {
    return {
      label: "Light Traffic",
      description: "Road conditions are currently clear.",
      className: "bg-emerald-50 text-emerald-700",
      dotClassName: "bg-emerald-500",
    };
  }

  if (delayMinutes <= 10 || delayRatio < 0.3) {
    return {
      label: "Moderate Traffic",
      description: "Some traffic delays are expected.",
      className: "bg-amber-50 text-amber-700",
      dotClassName: "bg-amber-500",
    };
  }

  return {
    label: "Heavy Traffic",
    description: "Significant traffic delays are expected.",
    className: "bg-red-50 text-red-700",
    dotClassName: "bg-red-500",
  };
}

function isValidCoordinates(longitude: number, latitude: number) {
  return (
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  );
}

function isFreshWorkerLocation(location: WorkerLocationRow) {
  const updatedAt = new Date(location.updated_at).getTime();

  return (
    location.is_online &&
    Number.isFinite(updatedAt) &&
    Date.now() - updatedAt <= STALE_GPS_THRESHOLD
  );
}

function getDistanceBetweenCoordinates(
  first: [number, number],
  second: [number, number],
) {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (value: number) => (value * Math.PI) / 180;

  const firstLatitude = toRadians(first[1]);
  const secondLatitude = toRadians(second[1]);
  const latitudeDifference = toRadians(second[1] - first[1]);
  const longitudeDifference = toRadians(second[0] - first[0]);

  const a =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDifference / 2) ** 2;

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizeRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function createWorkerMarkerElement() {
  const markerElement = document.createElement("div");

  markerElement.style.width = "54px";
  markerElement.style.height = "54px";
  markerElement.style.display = "flex";
  markerElement.style.alignItems = "center";
  markerElement.style.justifyContent = "center";

  markerElement.innerHTML = `
    <div
      data-worker-marker-icon
      style="
        position: relative;
        display: flex;
        width: 48px;
        height: 48px;
        align-items: center;
        justify-content: center;
        border: 4px solid white;
        border-radius: 9999px;
        background: #2563eb;
        box-shadow:
          0 10px 25px rgba(15, 23, 42, 0.3),
          0 0 0 5px rgba(37, 99, 235, 0.18);
      "
    >
      <svg
        width="25"
        height="25"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
      </svg>

      <span
        style="
          position: absolute;
          right: -2px;
          bottom: -2px;
          width: 14px;
          height: 14px;
          border: 3px solid white;
          border-radius: 9999px;
          background: #22c55e;
        "
      ></span>
    </div>
  `;

  return markerElement;
}

function createCustomerMarkerElement() {
  const markerElement = document.createElement("div");

  markerElement.style.width = "48px";
  markerElement.style.height = "48px";
  markerElement.style.display = "flex";
  markerElement.style.alignItems = "center";
  markerElement.style.justifyContent = "center";

  markerElement.innerHTML = `
    <div
      style="
        display: flex;
        width: 44px;
        height: 44px;
        align-items: center;
        justify-content: center;
        border: 4px solid white;
        border-radius: 9999px 9999px 9999px 0;
        background: #dc2626;
        box-shadow:
          0 10px 25px rgba(15, 23, 42, 0.3),
          0 0 0 5px rgba(220, 38, 38, 0.16);
        transform: rotate(-45deg);
      "
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
        style="transform: rotate(45deg);"
      >
        <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"></path>
        <circle cx="12" cy="10" r="3"></circle>
      </svg>
    </div>
  `;

  return markerElement;
}

export default function TrackWorker() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const tomTomApiKey = import.meta.env.VITE_TOMTOM_API_KEY;

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  const workerMarkerRef = useRef<Marker | null>(null);
  const customerMarkerRef = useRef<Marker | null>(null);

  const workerCoordinatesRef = useRef<[number, number] | null>(null);
  const workerAnimationFrameRef = useRef<number | null>(null);
  const routeRequestNumberRef = useRef(0);
  const lastRouteRequestAtRef = useRef(0);
  const lastRouteOriginRef = useRef<[number, number] | null>(null);
  const customerAddressRef = useRef<string | null>(null);

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [workerLocation, setWorkerLocation] =
    useState<WorkerLocationRow | null>(null);

  const [routeInformation, setRouteInformation] =
    useState<RouteInformation | null>(null);

  const [loading, setLoading] = useState(true);
  const [routeLoading, setRouteLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [lastLocationFetchAt, setLastLocationFetchAt] =
    useState<string | null>(null);

  const [, forceRefresh] = useState(0);
  const customerCoordinates = useMemo<[number, number] | null>(() => {
    const longitude = booking?.customer_longitude;
    const latitude = booking?.customer_latitude;

    if (
      longitude === null ||
      longitude === undefined ||
      latitude === null ||
      latitude === undefined
    ) {
      return null;
    }

    return [longitude, latitude];
  }, [booking?.customer_longitude, booking?.customer_latitude]);

  useEffect(() => {
    customerAddressRef.current = booking?.customer_address ?? null;
  }, [booking?.customer_address]);

  const workerName = [
    booking?.worker?.first_name,
    booking?.worker?.middle_name,
    booking?.worker?.last_name,
  ]
    .filter(Boolean)
    .join(" ");
  const trackingFinished =
    booking?.status === "Completed" ||
    booking?.status === "Cancelled" ||
    booking?.trip_status === "Completed";

  const workerArrived =
    booking?.trip_status === "Arrived" || booking?.status === "Arrived";

  const serviceInProgress =
    booking?.status === "On Going" || booking?.trip_status === "On Trip";

  const trafficStatus = routeInformation
    ? getTrafficStatus(
        routeInformation.trafficDelaySeconds,
        routeInformation.durationSeconds,
      )
    : null;

  const updateWorkerHeading = useCallback((heading: number | null) => {
    const markerElement = workerMarkerRef.current?.getElement();

    const markerIcon = markerElement?.querySelector<HTMLElement>(
      "[data-worker-marker-icon]",
    );

    if (!markerIcon) {
      return;
    }

    const validHeading =
      typeof heading === "number" && Number.isFinite(heading) ? heading : 0;

    markerIcon.style.transition = "transform 400ms ease";

    markerIcon.style.transform = `rotate(${validHeading}deg)`;
  }, []);

  const animateWorkerMarker = useCallback(
    (destination: [number, number], durationMilliseconds = 1_000) => {
      const marker = workerMarkerRef.current;

      if (!marker) {
        return;
      }

      if (workerAnimationFrameRef.current !== null) {
        cancelAnimationFrame(workerAnimationFrameRef.current);
      }

      const startingCoordinates = workerCoordinatesRef.current ?? destination;

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

        marker.setLngLat([longitude, latitude]);

        if (progress < 1) {
          workerAnimationFrameRef.current = requestAnimationFrame(animate);

          return;
        }

        workerCoordinatesRef.current = destination;
        workerAnimationFrameRef.current = null;
      };

      workerAnimationFrameRef.current = requestAnimationFrame(animate);
    },
    [],
  );

  const drawRoute = useCallback((routeCoordinates: [number, number][]) => {
    const map = mapRef.current;

    if (!map || !map.isStyleLoaded()) {
      return;
    }

    const routeGeoJson = {
      type: "Feature" as const,

      properties: {},

      geometry: {
        type: "LineString" as const,
        coordinates: routeCoordinates,
      },
    };

    const existingSource = map.getSource(ROUTE_SOURCE_ID) as
      | GeoJSONSource
      | undefined;

    if (existingSource) {
      existingSource.setData(routeGeoJson);
    } else {
      map.addSource(ROUTE_SOURCE_ID, {
        type: "geojson",
        data: routeGeoJson,
      });
    }

    if (!map.getLayer(ROUTE_LAYER_ID)) {
      map.addLayer({
        id: ROUTE_LAYER_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,

        layout: {
          "line-cap": "round",
          "line-join": "round",
        },

        paint: {
          "line-color": "#2563eb",
          "line-width": 7,
          "line-opacity": 0.9,
        },
      });
    }
  }, []);

  const clearRoute = useCallback(() => {
    const map = mapRef.current;

    if (!map || !map.isStyleLoaded()) {
      setRouteInformation(null);
      return;
    }

    if (map.getLayer(ROUTE_LAYER_ID)) {
      map.removeLayer(ROUTE_LAYER_ID);
    }

    if (map.getSource(ROUTE_SOURCE_ID)) {
      map.removeSource(ROUTE_SOURCE_ID);
    }

    setRouteInformation(null);
    lastRouteOriginRef.current = null;
    lastRouteRequestAtRef.current = 0;
  }, []);

  const requestRoute = useCallback(
    async (
      workerCoordinates: [number, number],
      destinationCoordinates: [number, number],
    ) => {
      const currentRequestNumber = ++routeRequestNumberRef.current;

      try {
        setRouteLoading(true);

        const apiKey = tomTomApiKey?.trim();

        if (!apiKey) {
          throw new Error(
            "TomTom API key is missing. Add VITE_TOMTOM_API_KEY to your environment file.",
          );
        }

        const [workerLongitude, workerLatitude] = workerCoordinates;
        const [customerLongitude, customerLatitude] = destinationCoordinates;

        const coordinatesAreValid =
          Number.isFinite(workerLatitude) &&
          Number.isFinite(workerLongitude) &&
          Number.isFinite(customerLatitude) &&
          Number.isFinite(customerLongitude) &&
          workerLatitude >= -90 &&
          workerLatitude <= 90 &&
          customerLatitude >= -90 &&
          customerLatitude <= 90 &&
          workerLongitude >= -180 &&
          workerLongitude <= 180 &&
          customerLongitude >= -180 &&
          customerLongitude <= 180;

        if (!coordinatesAreValid) {
          throw new Error("Worker or customer coordinates are invalid.");
        }

        const routePoints =
          `${workerLatitude},${workerLongitude}:` +
          `${customerLatitude},${customerLongitude}`;

        const query = new URLSearchParams({
          key: apiKey,
          traffic: "true",
          travelMode: "car",
          routeType: "fastest",
          computeTravelTimeFor: "all",
        });

        const routeUrl =
          `https://api.tomtom.com/routing/1/calculateRoute/` +
          `${routePoints}/json?${query.toString()}`;

        const response = await fetch(routeUrl, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          const responseBody = await response.text();

          console.error("TomTom route request failed:", {
            status: response.status,
            statusText: response.statusText,
            responseBody,
            worker: {
              latitude: workerLatitude,
              longitude: workerLongitude,
            },
            customer: {
              latitude: customerLatitude,
              longitude: customerLongitude,
            },
          });

          throw new Error(
            responseBody
              ? `Unable to calculate route (${response.status}): ${responseBody}`
              : `Unable to calculate route (${response.status} ${response.statusText}).`,
          );
        }

        const routeData = (await response.json()) as {
          routes?: Array<{
            summary?: {
              lengthInMeters?: number;
              travelTimeInSeconds?: number;
              trafficDelayInSeconds?: number;
              noTrafficTravelTimeInSeconds?: number;
              trafficLengthInMeters?: number;
            };
            legs?: Array<{
              points?: Array<{
                latitude: number;
                longitude: number;
              }>;
            }>;
          }>;
        };

        if (currentRequestNumber !== routeRequestNumberRef.current) {
          return;
        }

        const route = routeData.routes?.[0];

        if (!route) {
          throw new Error("TomTom did not return a route.");
        }

        const coordinates: [number, number][] = [];

        for (const leg of route.legs ?? []) {
          for (const point of leg.points ?? []) {
            if (
              Number.isFinite(point.longitude) &&
              Number.isFinite(point.latitude)
            ) {
              coordinates.push([point.longitude, point.latitude]);
            }
          }
        }

        if (coordinates.length < 2) {
          throw new Error("TomTom returned an empty route geometry.");
        }

        drawRoute(coordinates);

        const summary = route.summary;

        if (!summary) {
          throw new Error("TomTom returned a route without summary data.");
        }

        const distanceMeters = Number(summary.lengthInMeters ?? 0);
        const durationSeconds = Number(summary.travelTimeInSeconds ?? 0);
        const trafficDelaySeconds = Math.max(
          0,
          Number(summary.trafficDelayInSeconds ?? 0),
        );
        const noTrafficDurationSeconds = Number(
          summary.noTrafficTravelTimeInSeconds ?? durationSeconds,
        );
        const trafficLengthMeters = Math.max(
          0,
          Number(summary.trafficLengthInMeters ?? 0),
        );

        setRouteInformation({
          distanceMeters,
          durationSeconds,
          trafficDelaySeconds,
          noTrafficDurationSeconds,
          trafficLengthMeters,
        });

        const map = mapRef.current;

        if (map) {
          const bounds = new LngLatBounds();

          coordinates.forEach((coordinate) => bounds.extend(coordinate));

          map.fitBounds(bounds, {
            padding: {
              top: 90,
              right: 70,
              bottom: 90,
              left: 70,
            },
            maxZoom: 16,
            duration: 900,
          });
        }
      } catch (error) {
        if (currentRequestNumber !== routeRequestNumberRef.current) {
          return;
        }

        setRouteInformation(null);

        console.error(
          "Unable to calculate TomTom route:",
          error instanceof Error ? error.message : error,
        );
      } finally {
        if (currentRequestNumber === routeRequestNumberRef.current) {
          setRouteLoading(false);
        }
      }
    },
    [drawRoute, tomTomApiKey],
  );

  const requestRouteThrottled = useCallback(
    (
      workerCoordinates: [number, number],
      destinationCoordinates: [number, number],
      force = false,
    ) => {
      const now = Date.now();
      const lastOrigin = lastRouteOriginRef.current;
      const movedEnough =
        !lastOrigin ||
        getDistanceBetweenCoordinates(lastOrigin, workerCoordinates) >=
          MIN_ROUTE_MOVEMENT_METERS;
      const intervalElapsed =
        now - lastRouteRequestAtRef.current >= ROUTE_REFRESH_INTERVAL;

      if (!force && (!movedEnough || !intervalElapsed)) {
        return;
      }

      lastRouteRequestAtRef.current = now;
      lastRouteOriginRef.current = workerCoordinates;
      void requestRoute(workerCoordinates, destinationCoordinates);
    },
    [requestRoute],
  );

  const displayWorkerLocation = useCallback(
    (location: WorkerLocationRow, fitMap = false) => {
      const map = mapRef.current;

      if (!map) {
        return;
      }

      if (!isValidCoordinates(location.longitude, location.latitude)) {
        console.error("Invalid worker coordinates:", location);
        return;
      }

      const coordinates: [number, number] = [
        location.longitude,
        location.latitude,
      ];

      if (!workerMarkerRef.current) {
        const markerElement = createWorkerMarkerElement();

        const popup = new Popup({
          offset: 30,
          closeButton: false,
        }).setHTML(`
          <div style="min-width: 180px; padding: 5px;">
            <strong style="color: #0f172a;">
              ${workerName || "Your Worker"}
            </strong>

            <p
              style="
                margin: 6px 0 0;
                color: #2563eb;
                font-size: 13px;
                font-weight: 600;
              "
            >
              Live worker location
            </p>
          </div>
        `);

        workerMarkerRef.current = new Marker({
          element: markerElement,
          anchor: "center",
        })
          .setLngLat(coordinates)
          .setPopup(popup)
          .addTo(map);

        workerCoordinatesRef.current = coordinates;
      } else {
        animateWorkerMarker(coordinates);
      }

      updateWorkerHeading(location.heading);

      if (fitMap && customerCoordinates) {
        const bounds = new LngLatBounds();

        bounds.extend(coordinates);
        bounds.extend(customerCoordinates);

        map.fitBounds(bounds, {
          padding: 80,
          maxZoom: 16,
          duration: 800,
        });
      }

      if (
        customerCoordinates &&
        !trackingFinished &&
        isFreshWorkerLocation(location)
      ) {
        requestRouteThrottled(coordinates, customerCoordinates, fitMap);
      } else if (trackingFinished) {
        clearRoute();
      }
    },
    [
      animateWorkerMarker,
      customerCoordinates,
      clearRoute,
      requestRouteThrottled,
      trackingFinished,
      updateWorkerHeading,
      workerName,
    ],
  );
  useEffect(() => {
    async function loadBooking() {
      if (!bookingId) {
        setErrorMessage("Booking ID is missing.");
        setLoading(false);
        return;
      }

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          throw new Error("Customer account is not authenticated.");
        }

        const { data, error } = await supabase
          .from("bookings")
          .select(
            `
              id,
              customer_id,
              worker_id,
              status,
              trip_status,
              customer_address,
              customer_latitude,
              customer_longitude,
              worker:profiles!bookings_worker_id_fkey(
                first_name,
                middle_name,
                last_name,
                profile_picture
              ),
              services(
                service_name
              )
            `,
          )
          .eq("id", Number(bookingId))
          .eq("customer_id", user.id)
          .single();

        if (error) {
          throw error;
        }

        const rawBooking = data as unknown as BookingData & {
          worker?: BookingData["worker"] | BookingData["worker"][];
          services?: BookingData["services"] | BookingData["services"][];
        };

        setBooking({
          ...rawBooking,
          worker: normalizeRelation(rawBooking.worker),
          services: normalizeRelation(rawBooking.services),
        });
      } catch (error) {
        console.error("Unable to load tracking booking:", error);

        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load booking.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadBooking();
  }, [bookingId]);

  useEffect(() => {
    if (!mapContainerRef.current || !customerCoordinates || mapRef.current) {
      return;
    }

    const map = new MapLibreMap({
      container: mapContainerRef.current,
      style: MAP_STYLE,
      center: customerCoordinates,
      zoom: 15,
    });

    map.addControl(new NavigationControl(), "top-right");

    mapRef.current = map;

    map.on("load", () => {
      const customerMarkerElement = createCustomerMarkerElement();

      customerMarkerRef.current = new Marker({
        element: customerMarkerElement,
        anchor: "bottom",
      })
        .setLngLat(customerCoordinates)
        .setPopup(
          new Popup({
            offset: 28,
            closeButton: false,
          }).setHTML(`
            <div style="min-width: 180px; padding: 5px;">
              <strong style="color: #0f172a;">
                Service Location
              </strong>

              <p
                style="
                  margin: 6px 0 0;
                  color: #64748b;
                  font-size: 13px;
                "
              >
                ${customerAddressRef.current ?? "Customer location"}
              </p>
            </div>
          `),
        )
        .addTo(map);
    });

    return () => {
      if (workerAnimationFrameRef.current !== null) {
        cancelAnimationFrame(workerAnimationFrameRef.current);
      }

      workerMarkerRef.current?.remove();
      customerMarkerRef.current?.remove();

      map.remove();

      workerMarkerRef.current = null;
      customerMarkerRef.current = null;
      mapRef.current = null;
    };
  }, [customerCoordinates]);

  const fetchLatestWorkerLocation = useCallback(
    async (fitMap = false): Promise<void> => {
      if (!booking?.worker_id || trackingFinished) {
        return;
      }

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
        .eq("worker_id", booking.worker_id)
        .maybeSingle();

      if (error) {
        console.error(
          "Unable to load worker location:",
          error,
        );
        return;
      }

      setLastLocationFetchAt(
        new Date().toISOString(),
      );

      if (data) {
        const location =
          data as WorkerLocationRow;

        setWorkerLocation(location);
        displayWorkerLocation(location, fitMap);
      }
    },
    [
      booking?.worker_id,
      displayWorkerLocation,
      trackingFinished,
    ],
  );

  useEffect(() => {
    if (!booking?.worker_id || !mapRef.current || trackingFinished) {
      return;
    }

    void fetchLatestWorkerLocation(true);

    const channel = supabase
      .channel(`customer-track-worker-${booking.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "worker_locations",
          filter: `worker_id=eq.${booking.worker_id}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setWorkerLocation(null);
            workerMarkerRef.current?.remove();
            workerMarkerRef.current = null;
            workerCoordinatesRef.current = null;
            clearRoute();

            return;
          }

          const updatedLocation = payload.new as WorkerLocationRow;

          setWorkerLocation(updatedLocation);

          displayWorkerLocation(updatedLocation, false);
        },
      )
      .subscribe((status) => {
        setRealtimeConnected(status === "SUBSCRIBED");
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [
    booking?.id,
    booking?.worker_id,
    clearRoute,
    displayWorkerLocation,
    fetchLatestWorkerLocation,
    trackingFinished,
  ]);

  useEffect(() => {
    if (!booking?.id) {
      return;
    }

    const channel = supabase
      .channel(`customer-tracking-booking-${booking.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bookings",
          filter: `id=eq.${booking.id}`,
        },
        (payload) => {
          const updatedBooking = payload.new as Partial<BookingData>;

          setBooking((currentBooking) =>
            currentBooking
              ? {
                  ...currentBooking,
                  ...updatedBooking,
                }
              : currentBooking,
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [booking?.id]);

  useEffect(() => {
    if (
      !booking?.worker_id ||
      trackingFinished
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      /*
       * Realtime normally delivers each update. Polling is a
       * fallback for temporary websocket interruptions.
       */
      void fetchLatestWorkerLocation(false);
    }, 20_000);

    return () => {
      window.clearInterval(timer);
    };
  }, [
    booking?.worker_id,
    fetchLatestWorkerLocation,
    trackingFinished,
  ]);

  useEffect(() => {
    if (!trackingFinished) {
      return;
    }

    clearRoute();
  }, [clearRoute, trackingFinished]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      forceRefresh((value) => value + 1);
    }, 30_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  if (loading) {
    return (
      <CustomerLayout>
        <div className="p-10 text-center">Loading live worker tracking...</div>
      </CustomerLayout>
    );
  }

  if (errorMessage || !booking || !customerCoordinates) {
    return (
      <CustomerLayout>
        <div className="mx-auto max-w-3xl p-8">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            {errorMessage || "This booking has no saved customer coordinates."}
          </div>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-5 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white"
          >
            Go Back
          </button>
        </div>
      </CustomerLayout>
    );
  }

  const workerOnline = workerLocation
    ? isFreshWorkerLocation(workerLocation)
    : false;

  const workerNearby =
    !trackingFinished &&
    workerOnline &&
    routeInformation !== null &&
    routeInformation.distanceMeters <= 150;

  return (
    <CustomerLayout>
      <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
        <header className="rounded-3xl bg-white p-6 shadow-sm">
          <button
            type="button"
            onClick={() => navigate("/customer/bookings")}
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to bookings
          </button>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                <Navigation className="h-7 w-7" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Track Worker
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  View the worker's current location, route, distance, and
                  estimated arrival.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <div
                className={`rounded-2xl px-5 py-3 ${
                  workerOnline ? "bg-emerald-50" : "bg-slate-100"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Worker GPS
                </p>

                <p
                  className={`mt-1 flex items-center gap-2 font-bold ${
                    workerOnline ? "text-emerald-700" : "text-slate-600"
                  }`}
                >
                  {workerOnline ? (
                    <Radio className="h-4 w-4" />
                  ) : (
                    <WifiOff className="h-4 w-4" />
                  )}

                  {workerOnline ? "Online" : "Offline"}
                </p>
              </div>

              <div className="rounded-2xl bg-blue-50 px-5 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  Trip Status
                </p>

                <p className="mt-1 font-bold text-blue-900">
                  {booking.trip_status || booking.status}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
          <aside className="space-y-5">
            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <img
                  src={
                    booking.worker?.profile_picture ||
                    "https://placehold.co/80x80"
                  }
                  alt="Worker"
                  className="h-16 w-16 rounded-full border object-cover"
                />

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Your Worker
                  </p>

                  <h2 className="mt-1 text-lg font-bold text-slate-900">
                    {workerName || "Worker"}
                  </h2>

                  <p className="text-sm text-slate-500">
                    {booking.services?.service_name || "Service"}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="font-bold text-slate-900">
                Live Trip Information
              </h2>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-blue-50 p-4">
                  <MapPin className="h-5 w-5 text-blue-600" />

                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Distance
                  </p>

                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {trackingFinished
                      ? "Completed"
                      : formatDistance(
                          routeInformation?.distanceMeters ?? null,
                        )}
                  </p>
                </div>

                <div className="rounded-2xl bg-violet-50 p-4">
                  <Clock3 className="h-5 w-5 text-violet-600" />

                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    ETA
                  </p>

                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {trackingFinished
                      ? "-"
                      : formatDuration(
                          routeInformation?.durationSeconds ?? null,
                        )}
                  </p>
                </div>

                <div className="rounded-2xl bg-orange-50 p-4">
                  <Clock3 className="h-5 w-5 text-orange-600" />

                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Traffic Delay
                  </p>

                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {trackingFinished
                      ? "-"
                      : routeInformation
                        ? routeInformation.trafficDelaySeconds <= 0
                          ? "No delay"
                          : formatDuration(routeInformation.trafficDelaySeconds)
                        : "Calculating..."}
                  </p>
                </div>

                <div
                  className={`rounded-2xl p-4 ${
                    trafficStatus?.className ?? "bg-slate-100 text-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-3 w-3 rounded-full ${
                        trafficStatus?.dotClassName ?? "bg-slate-400"
                      }`}
                    />

                    <p className="text-xs font-semibold uppercase tracking-wide">
                      Traffic Status
                    </p>
                  </div>

                  <p className="mt-3 text-lg font-bold">
                    {trackingFinished
                      ? "Tracking ended"
                      : (trafficStatus?.label ?? "Calculating...")}
                  </p>
                </div>
              </div>
              {trafficStatus && !trackingFinished && (
                <div
                  className={`mt-4 rounded-2xl p-4 ${trafficStatus.className}`}
                >
                  <p className="text-sm font-medium">
                    {trafficStatus.description}
                  </p>

                  {routeInformation && (
                    <p className="mt-1 text-xs opacity-80">
                      Estimated travel without traffic:{" "}
                      {formatDuration(
                        routeInformation.noTrafficDurationSeconds,
                      )}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-4 rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Service Address
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {booking.customer_address || "Customer service location"}
                </p>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <LocateFixed className="h-4 w-4 text-blue-600" />
                  {trackingFinished
                    ? "Live tracking ended"
                    : routeLoading
                      ? "Updating route..."
                      : realtimeConnected
                        ? "Live tracking connected"
                        : "Connecting to live tracking..."}
                </p>

                {workerLocation?.updated_at && (
                  <p className="mt-2 text-xs text-slate-500">
                    Last GPS update:{" "}
                    {new Date(workerLocation.updated_at).toLocaleString()}
                  </p>
                )}

                {!realtimeConnected &&
                  lastLocationFetchAt && (
                    <p className="mt-1 text-xs text-amber-600">
                      Realtime is reconnecting. Latest location was refreshed at{" "}
                      {new Date(
                        lastLocationFetchAt,
                      ).toLocaleTimeString()}.
                    </p>
                  )}
              </div>
            </section>

            {!workerLocation && !trackingFinished && (
              <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5 text-yellow-800">
                <p className="font-bold">Waiting for worker location</p>

                <p className="mt-1 text-sm">
                  The worker must be online with GPS enabled before live
                  tracking appears.
                </p>
              </div>
            )}

            {!workerOnline && workerLocation && !trackingFinished && (
              <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 text-orange-800">
                <p className="font-bold">Worker is currently offline</p>

                <p className="mt-1 text-sm">
                  The map is showing the worker's last saved GPS location.
                </p>
              </div>
            )}
            {workerNearby && !workerArrived && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
                <p className="font-bold">
                  Worker is nearby
                </p>

                <p className="mt-1 text-sm">
                  Your worker is within approximately 150 meters of the service location.
                </p>
              </div>
            )}

            {workerArrived && !trackingFinished && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-800">
                <p className="font-bold">Worker has arrived</p>

                <p className="mt-1 text-sm">
                  Your worker is now at the service location.
                </p>
              </div>
            )}

            {serviceInProgress && !workerArrived && !trackingFinished && (
              <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5 text-violet-800">
                <p className="font-bold">Service is in progress</p>

                <p className="mt-1 text-sm">
                  Live worker location is still being updated.
                </p>
              </div>
            )}

            {trackingFinished && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
                <p className="font-bold">Tracking completed</p>

                <p className="mt-1 text-sm">
                  This booking is already {booking.status.toLowerCase()}.
                </p>
              </div>
            )}
          </aside>

          <main className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div
              ref={mapContainerRef}
              className="h-155 w-full bg-slate-100"
            />
          </main>
        </div>
      </div>
    </CustomerLayout>
  );
}