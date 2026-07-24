import { useCallback } from "react";
import type { MutableRefObject } from "react";
import type {
  GeoJSONSource,
  Map as MapLibreMap,
} from "maplibre-gl";

interface UseRouteLayerParams {
  mapRef: MutableRefObject<MapLibreMap | null>;
  routeCoordinatesRef: MutableRefObject<[number, number][]>;
}

export function useRouteLayer({
  mapRef,
  routeCoordinatesRef,
}: UseRouteLayerParams) {
  return useCallback(
    (coordinates: [number, number][]) => {
      const map = mapRef.current;

      routeCoordinatesRef.current = coordinates;

      if (!map || !map.isStyleLoaded()) {
        return;
      }

      const routeData = {
        type: "Feature" as const,
        properties: {},
        geometry: {
          type: "LineString" as const,
          coordinates,
        },
      };

      const existingSource = map.getSource("route") as
        | GeoJSONSource
        | undefined;

      if (existingSource) {
        existingSource.setData(routeData);
        return;
      }

      map.addSource("route", {
        type: "geojson",
        data: routeData,
      });

      map.addLayer({
        id: "route-shadow",
        type: "line",
        source: "route",
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#0f172a",
          "line-width": 9,
          "line-opacity": 0.2,
        },
      });

      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#2563eb",
          "line-width": 6,
        },
      });
    },
    [mapRef, routeCoordinatesRef],
  );
}