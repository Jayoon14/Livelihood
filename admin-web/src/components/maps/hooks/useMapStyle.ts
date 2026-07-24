import { useEffect } from "react";
import type { MutableRefObject } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";

import type { StyleKey } from "../types";
import {
  SATELLITE_STYLE,
  STYLES,
} from "../mapStyles";

interface UseMapStyleParams {
  mapRef: MutableRefObject<MapLibreMap | null>;
  style: StyleKey;
  setMapReady: (ready: boolean) => void;
}

export function useMapStyle({
  mapRef,
  style,
  setMapReady,
}: UseMapStyleParams) {
  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    setMapReady(false);

    if (style === "satellite") {
      map.setStyle(SATELLITE_STYLE);

      map.easeTo({
        pitch: 0,
        bearing: 0,
        duration: 500,
      });

      return;
    }

    map.setStyle(STYLES[style]);

    map.easeTo({
      pitch: style === "threeD" ? 55 : 0,
      bearing: style === "threeD" ? -18 : 0,
      duration: 700,
    });
  }, [
    mapRef,
    style,
    setMapReady,
  ]);
}