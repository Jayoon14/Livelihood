import { useCallback } from "react";
import type { MutableRefObject } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";

import type { Coordinates } from "../types";

interface UseRecenterMapProps {
  mapRef: MutableRefObject<MapLibreMap | null>;
  currentLocationRef: MutableRefObject<Coordinates | null>;
}

export function useRecenterMap({
  mapRef,
  currentLocationRef,
}: UseRecenterMapProps) {
  return useCallback(() => {
    if (!mapRef.current || !currentLocationRef.current) {
      return;
    }

    mapRef.current.flyTo({
      center: currentLocationRef.current,
      zoom: 17,
      bearing: 0,
      pitch: 0,
      duration: 1500,
      essential: true,
    });
  }, [mapRef, currentLocationRef]);
}