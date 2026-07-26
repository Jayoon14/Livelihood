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

const ROUTE_SHADOW_LAYER_ID = "route-shadow";
const ROUTE_LINE_LAYER_ID = "route-line";

function moveRouteLayersToTop(map: MapLibreMap) {
  if (map.getLayer(ROUTE_SHADOW_LAYER_ID)) {
    map.moveLayer(ROUTE_SHADOW_LAYER_ID);
  }

  if (map.getLayer(ROUTE_LINE_LAYER_ID)) {
    map.moveLayer(ROUTE_LINE_LAYER_ID);
  }
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

    const applyTrafficState = () => {
      if (!map.isStyleLoaded()) {
        return;
      }

      if (!trafficEnabled) {
        removeTrafficLayer(map);
        return;
      }

      if (!tomTomApiKey) {
        console.warn("TomTom API key is missing.");

        removeTrafficLayer(map);
        return;
      }

      addTrafficLayer(map, tomTomApiKey);

      // Panatilihin sa ibabaw ng traffic raster ang route.
      moveRouteLayersToTop(map);
    };

    if (map.isStyleLoaded()) {
      applyTrafficState();
    }

    /*
     * style.load runs again kapag pinalitan o ni-reload
     * ang buong MapLibre style.
     */
    map.on("style.load", applyTrafficState);

    return () => {
      map.off("style.load", applyTrafficState);

      /*
       * Cleanup lang kapag buhay pa ang map at loaded ang style.
       */
      if (map.isStyleLoaded()) {
        removeTrafficLayer(map);
      }
    };
  }, [mapRef, mapReady, trafficEnabled, tomTomApiKey]);
}