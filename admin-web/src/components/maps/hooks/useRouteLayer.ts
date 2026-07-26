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

const ROUTE_SOURCE_ID = "route";
const ROUTE_SHADOW_LAYER_ID = "route-shadow";
const ROUTE_LINE_LAYER_ID = "route-line";

export function useRouteLayer({
  mapRef,
  routeCoordinatesRef,
}: UseRouteLayerParams) {
  return useCallback(
    (coordinates: [number, number][]) => {
      routeCoordinatesRef.current = coordinates;

      const map = mapRef.current;

      if (!map) {
        return;
      }

      if (coordinates.length < 2) {
        console.warn("Route requires at least two coordinates.");
        return;
      }

      const renderRoute = () => {
        if (!map.isStyleLoaded()) {
          return;
        }

        const latestCoordinates = routeCoordinatesRef.current;

        if (latestCoordinates.length < 2) {
          return;
        }

        const routeData = {
          type: "Feature" as const,
          properties: {},
          geometry: {
            type: "LineString" as const,
            coordinates: latestCoordinates,
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

        // Route ang laging nasa ibabaw.
        if (map.getLayer(ROUTE_SHADOW_LAYER_ID)) {
          map.moveLayer(ROUTE_SHADOW_LAYER_ID);
        }

        if (map.getLayer(ROUTE_LINE_LAYER_ID)) {
          map.moveLayer(ROUTE_LINE_LAYER_ID);
        }

        console.log("Route rendered on map:", {
          coordinateCount: latestCoordinates.length,
          sourceExists: Boolean(map.getSource(ROUTE_SOURCE_ID)),
          shadowLayerExists: Boolean(
            map.getLayer(ROUTE_SHADOW_LAYER_ID),
          ),
          routeLayerExists: Boolean(
            map.getLayer(ROUTE_LINE_LAYER_ID),
          ),
        });
      };

      if (map.isStyleLoaded()) {
        renderRoute();
        return;
      }

      /*
       * once para hindi dumami ang event listeners
       * sa bawat route update.
       */
      map.once("style.load", renderRoute);
    },
    [mapRef, routeCoordinatesRef],
  );
}