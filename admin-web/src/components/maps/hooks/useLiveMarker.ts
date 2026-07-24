import { useEffect } from "react";
import type { Marker } from "maplibre-gl";
import type { Coordinates } from "../types";

interface UseLiveMarkerParams {
  marker: Marker | null;
  coordinates: Coordinates | null;
}

export function useLiveMarker({
  marker,
  coordinates,
}: UseLiveMarkerParams) {
  useEffect(() => {
    if (!marker || !coordinates) return;

    marker.setLngLat(coordinates);
  }, [marker, coordinates]);
}