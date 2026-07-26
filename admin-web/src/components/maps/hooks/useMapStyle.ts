import { useEffect } from "react";
import type { MutableRefObject } from "react";
import type {
  Map as MapLibreMap,
  StyleSpecification,
} from "maplibre-gl";

interface UseMapStyleParams {
  mapRef: MutableRefObject<MapLibreMap | null>;
  mapReady: boolean;
  mapStyle: StyleSpecification;
}

export function useMapStyle({
  mapRef,
  mapReady,
  mapStyle,
}: UseMapStyleParams) {
  useEffect(() => {
    if (!mapReady) {
      return;
    }

    const map = mapRef.current;

    if (!map) {
      return;
    }

    const applyStyle = () => {
      if (!map.isStyleLoaded()) {
        return;
      }

      map.setStyle(mapStyle, {
        diff: false,
      });
    };

    if (map.isStyleLoaded()) {
      applyStyle();
      return;
    }

    map.once("style.load", applyStyle);

    return () => {
      map.off("style.load", applyStyle);
    };
  }, [mapRef, mapReady, mapStyle]);
}