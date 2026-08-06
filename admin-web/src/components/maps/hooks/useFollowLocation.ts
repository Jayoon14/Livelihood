import {
  useEffect,
  type RefObject,
} from "react";
import type { Map } from "maplibre-gl";
import type { Coordinates } from "../types";

interface UseFollowLocationParams {
  mapRef: RefObject<Map | null>;
  coordinates: Coordinates | null;
  enabled: boolean;
}

export function useFollowLocation({
  mapRef,
  coordinates,
  enabled,
}: UseFollowLocationParams) {
  useEffect(() => {
    const map = mapRef.current;

    if (!enabled || !map || !coordinates) {
      return;
    }

    map.easeTo({
      center: coordinates,
      duration: 1000,
      zoom: Math.max(map.getZoom(), 17),
    });
  }, [coordinates, enabled, mapRef]);
}
