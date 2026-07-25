import { useCallback } from "react";
import type { MutableRefObject } from "react";
import type {
  GeoJSONSource,
  Map as MapLibreMap,
} from "maplibre-gl";

interface UseRouteLayerParams {
  mapRef: MutableRefObject<MapLibreMap | null>;
  routeCoordinatesRef: MutableRefObject<
    [number, number][]
  >;
}

const ROUTE_SOURCE_ID = "route";
const ROUTE_SHADOW_LAYER_ID = "route-shadow";
const ROUTE_LINE_LAYER_ID = "route-line";

export function useRouteLayer({
  mapRef,
  routeCoordinatesRef,
}: UseRouteLayerParams) {
  return useCallback(
    (coordinates: [number, number][]) => {
      const map = mapRef.current;

      routeCoordinatesRef.current = coordinates;

      if (!map || !map.isStyleLoaded()) {
        console.warn(
          "Route cannot be drawn because the map style is not ready.",
        );

        return;
      }

      if (coordinates.length < 2) {
        console.warn(
          "Route requires at least two coordinates.",
        );

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

      const existingSource = map.getSource(
        ROUTE_SOURCE_ID,
      ) as GeoJSONSource | undefined;

      if (existingSource) {
        existingSource.setData(routeData);
      } else {
        map.addSource(ROUTE_SOURCE_ID, {
          type: "geojson",
          data: routeData,
        });
      }

      /*
       * Important:
       * Huwag mag-return pagkatapos ng setData().
       * Posibleng existing ang source pero nawala ang layers
       * matapos ang map style reload.
       */

      if (!map.getLayer(ROUTE_SHADOW_LAYER_ID)) {
        map.addLayer({
          id: ROUTE_SHADOW_LAYER_ID,
          type: "line",
          source: ROUTE_SOURCE_ID,

          layout: {
            "line-cap": "round",
            "line-join": "round",
          },

          paint: {
            "line-color": "#0f172a",
            "line-width": 13,
            "line-opacity": 0.35,
          },
        });
      }

      if (!map.getLayer(ROUTE_LINE_LAYER_ID)) {
        map.addLayer({
          id: ROUTE_LINE_LAYER_ID,
          type: "line",
          source: ROUTE_SOURCE_ID,

          layout: {
            "line-cap": "round",
            "line-join": "round",
          },

          paint: {
            "line-color": "#2563eb",
            "line-width": 8,
            "line-opacity": 1,
          },
        });
      }

      // Ilagay sa ibabaw ang route para hindi matakpan.
      if (map.getLayer(ROUTE_SHADOW_LAYER_ID)) {
        map.moveLayer(ROUTE_SHADOW_LAYER_ID);
      }

      if (map.getLayer(ROUTE_LINE_LAYER_ID)) {
        map.moveLayer(ROUTE_LINE_LAYER_ID);
      }

      console.log("Route rendered on map:", {
        coordinateCount: coordinates.length,
        sourceExists: Boolean(
          map.getSource(ROUTE_SOURCE_ID),
        ),
        shadowLayerExists: Boolean(
          map.getLayer(ROUTE_SHADOW_LAYER_ID),
        ),
        routeLayerExists: Boolean(
          map.getLayer(ROUTE_LINE_LAYER_ID),
        ),
      });
    },
    [mapRef, routeCoordinatesRef],
  );
}