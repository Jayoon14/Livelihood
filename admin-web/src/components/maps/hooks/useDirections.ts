import { useCallback } from "react";
import { LngLatBounds } from "maplibre-gl";
import type { Map as MapLibreMap } from "maplibre-gl";

import { calculateOsrmRoute } from "../../../services/osrmRoutingService";
import type { Coordinates } from "../types";

interface UseDirectionsProps {
  mapRef: React.MutableRefObject<MapLibreMap | null>;

  currentLocationRef: React.MutableRefObject<Coordinates | null>;
  selectedCoordinatesRef: React.MutableRefObject<Coordinates>;

  drawRoute: (coordinates: [number, number][]) => void;
  getCurrentLocation: (selectAsDestination?: boolean) => Promise<Coordinates | null>;

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
  return useCallback(async (destinationOverride?: Coordinates) => {
    if (!currentLocationRef.current) {
      setMessage("Getting your current location...");
      await getCurrentLocation(false);
    }

    const origin = currentLocationRef.current;

    if (!origin) {
      return;
    }
    const destination = destinationOverride ?? selectedCoordinatesRef.current;

    setRouting(true);
    setMessage("");

    try {
      const route = await calculateOsrmRoute(origin, destination);

      drawRoute(route.coordinates);
      setDistance(route.distanceMeters);
      setDuration(route.durationSeconds);
      setShowDirections(true);

      const map = mapRef.current;

      if (!map) {
        throw new Error("Map is not available.");
      }

      const bounds = new LngLatBounds();

      route.coordinates.forEach((point) => {
        bounds.extend(point);
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
      console.error("OSRM directions error:", error);

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
