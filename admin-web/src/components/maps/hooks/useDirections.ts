import { useCallback } from "react";
import { LngLatBounds } from "maplibre-gl";
import type { Map as MapLibreMap } from "maplibre-gl";

import type {
  Coordinates,
  RouteResult,
} from "../types";

interface UseDirectionsProps {
  mapRef: React.MutableRefObject<MapLibreMap | null>;

  currentLocationRef: React.MutableRefObject<Coordinates | null>;
  selectedCoordinatesRef: React.MutableRefObject<Coordinates>;

  drawRoute: (coordinates: [number, number][]) => void;
  getCurrentLocation: (selectAsDestination?: boolean) => void;

  setRouting: React.Dispatch<React.SetStateAction<boolean>>;
  setMessage: React.Dispatch<React.SetStateAction<string>>;
  setDistance: React.Dispatch<React.SetStateAction<number | null>>;
  setDuration: React.Dispatch<React.SetStateAction<number | null>>;
  setShowDirections: React.Dispatch<
    React.SetStateAction<boolean>
  >;
}

export function useDirections({
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
}: UseDirectionsProps) {
  return useCallback(async () => {
    if (!currentLocationRef.current) {
      getCurrentLocation(false);

      setMessage(
        "Allow current location, then press Directions again.",
      );

      return;
    }

    const origin = currentLocationRef.current;
    const destination = selectedCoordinatesRef.current;

    console.log("Directions coordinates:", {
      origin,
      destination,
    });

    const longitudeDifference = Math.abs(
      origin[0] - destination[0],
    );

    const latitudeDifference = Math.abs(
      origin[1] - destination[1],
    );

    if (
      longitudeDifference < 0.000001 &&
      latitudeDifference < 0.000001
    ) {
      setMessage(
        "Worker and customer locations are currently the same.",
      );

      return;
    }

    setRouting(true);
    setMessage("");

    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${origin[0]},${origin[1]};${destination[0]},${destination[1]}?overview=full&geometries=geojson`,
      );

      if (!response.ok) {
        throw new Error("Routing failed.");
      }

      const data = (await response.json()) as RouteResult;

      console.log("OSRM route response:", data);

      const route = data.routes?.[0];

      if (!route) {
        throw new Error("No route found.");
      }

      drawRoute(route.geometry.coordinates);

setDistance(route.distance);
setDuration(route.duration);
setShowDirections(true);

const map = mapRef.current;

if (!map) {
  throw new Error("Map is not available.");
}

const routeCoordinates = route.geometry.coordinates;

const bounds = new LngLatBounds();

routeCoordinates.forEach((point) => {
  bounds.extend(point);
});

console.log("Fitting route bounds:", {
  origin,
  destination,
  coordinateCount: routeCoordinates.length,
  southwest: bounds.getSouthWest(),
  northeast: bounds.getNorthEast(),
});

window.setTimeout(() => {
  map.resize();

  map.fitBounds(bounds, {
    padding: {
      top: 100,
      right: 100,
      bottom: 100,
      left: 100,
    },
    duration: 1200,
    maxZoom: 17,
  });
}, 100);
    } catch (error) {
      console.error("Directions error:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Directions are temporarily unavailable.",
      );
    } finally {
      setRouting(false);
    }
  }, [
    drawRoute,
    getCurrentLocation,
    currentLocationRef,
    selectedCoordinatesRef,
    mapRef,
    setDistance,
    setDuration,
    setMessage,
    setRouting,
    setShowDirections,
  ]);
}