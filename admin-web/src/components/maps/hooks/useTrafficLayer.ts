import { useEffect } from "react";
import type { MutableRefObject } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";

import { addTrafficLayer, removeTrafficLayer } from "../traffic";

interface UseTrafficLayerParams {
  mapRef: MutableRefObject<MapLibreMap | null>;
  mapReady: boolean;
  trafficEnabled: boolean;
  tomTomApiKey?: string;
}

export function useTrafficLayer({
  mapRef,
  mapReady,
  trafficEnabled,
  tomTomApiKey,
}: UseTrafficLayerParams) {
  useEffect(() => {
    if (!mapReady) {
      return;
    }

    const map = mapRef.current;

    if (!map) {
      return;
    }

    if (trafficEnabled) {
      if (!tomTomApiKey) {
        return;
      }

      addTrafficLayer(map, tomTomApiKey);
      return;
    }

    removeTrafficLayer(map);
  }, [mapRef, mapReady, trafficEnabled, tomTomApiKey]);
}
