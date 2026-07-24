import { useEffect } from "react";
import type { Map } from "maplibre-gl";
import type { Coordinates } from "../types";

interface UseFollowLocationParams {
  map: Map | null;
  coordinates: Coordinates | null;
  enabled: boolean;
}

export function useFollowLocation({
  map,
  coordinates,
  enabled,
}: UseFollowLocationParams) {
  useEffect(() => {
    if (!enabled) return;
    if (!map) return;
    if (!coordinates) return;

    map.easeTo({
      center: coordinates,
      duration: 1000,
      zoom: Math.max(map.getZoom(), 17),
    });
  }, [map, coordinates, enabled]);
}