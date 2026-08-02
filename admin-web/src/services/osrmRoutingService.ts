import type { Coordinates } from "../components/maps/types";

export interface OsrmRouteResult {
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
  trafficDelaySeconds: number;
  noTrafficDurationSeconds: number;
  trafficLengthMeters: number;
}

interface OsrmRouteResponse {
  code?: string;
  message?: string;
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: {
      type?: string;
      coordinates?: [number, number][];
    };
  }>;
}

function isValidCoordinates(coordinates: Coordinates): boolean {
  const [longitude, latitude] = coordinates;

  return (
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  );
}

export async function calculateOsrmRoute(
  origin: Coordinates,
  destination: Coordinates,
  signal?: AbortSignal,
): Promise<OsrmRouteResult> {
  if (!isValidCoordinates(origin) || !isValidCoordinates(destination)) {
    throw new Error("Worker or customer coordinates are invalid.");
  }

  const longitudeDifference = Math.abs(origin[0] - destination[0]);
  const latitudeDifference = Math.abs(origin[1] - destination[1]);

  if (
    longitudeDifference < 0.000001 &&
    latitudeDifference < 0.000001
  ) {
    throw new Error(
      "Worker and customer locations are currently the same.",
    );
  }

  /*
   * MapLibre and OSRM both use longitude,latitude coordinate order.
   * Both worker navigation and customer tracking call this exact service,
   * so they receive the same route geometry, distance, and ETA.
   */
  const routePoints =
    `${origin[0]},${origin[1]};` +
    `${destination[0]},${destination[1]}`;

  const query = new URLSearchParams({
    overview: "full",
    geometries: "geojson",
    steps: "false",
    alternatives: "false",
    continue_straight: "default",
  });

  const response = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${routePoints}?${query.toString()}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal,
    },
  );

  if (!response.ok) {
    const responseBody = await response.text();

    console.error("OSRM route request failed:", {
      status: response.status,
      statusText: response.statusText,
      responseBody,
      origin,
      destination,
    });

    throw new Error(
      responseBody
        ? `Unable to calculate route (${response.status}): ${responseBody}`
        : `Unable to calculate route (${response.status} ${response.statusText}).`,
    );
  }

  const data = (await response.json()) as OsrmRouteResponse;

  if (data.code && data.code !== "Ok") {
    throw new Error(data.message || "OSRM did not return a route.");
  }

  const route = data.routes?.[0];
  const coordinates = route?.geometry?.coordinates;

  if (!route || !Array.isArray(coordinates) || coordinates.length < 2) {
    throw new Error("OSRM returned an empty route geometry.");
  }

  const distanceMeters = Number(route.distance);
  const durationSeconds = Number(route.duration);

  if (
    !Number.isFinite(distanceMeters) ||
    distanceMeters <= 0 ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0
  ) {
    throw new Error("OSRM returned invalid route information.");
  }

  /*
   * The public OSRM demo server has no live traffic feed.
   * Keep these fields compatible with the existing customer UI.
   */
  return {
    coordinates,
    distanceMeters,
    durationSeconds,
    trafficDelaySeconds: 0,
    noTrafficDurationSeconds: durationSeconds,
    trafficLengthMeters: 0,
  };
}
