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
  setShowDirections: React.Dispatch<React.SetStateAction<boolean>>;
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

      if (!response.ok) {
        throw new Error("Routing failed.");
      }

      const data = (await response.json()) as RouteResult;
      const route = data.routes?.[0];

      if (!route) {
        throw new Error("No route found.");
      }

      drawRoute(route.geometry.coordinates);

      setDistance(route.distance);
      setDuration(route.duration);
      setShowDirections(true);

      const bounds = new LngLatBounds(
        route.geometry.coordinates[0],
        route.geometry.coordinates[0],
      );

      route.geometry.coordinates.forEach((point) =>
        bounds.extend(point),
      );

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