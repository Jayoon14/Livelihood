import { useEffect } from "react";
import type {
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from "react";

import {
  FullscreenControl,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  ScaleControl,
  type MapMouseEvent,
} from "maplibre-gl";

import type { Coordinates } from "../types";
import { DEFAULT_CENTER, STYLES } from "../mapStyles";

interface UseMapInitializationParams {
  mapContainerRef: MutableRefObject<HTMLDivElement | null>;
  mapRef: MutableRefObject<MapLibreMap | null>;
  markerRef: MutableRefObject<Marker | null>;
  routeCoordinatesRef: MutableRefObject<[number, number][]>;

  drawRoute: (coordinates: [number, number][]) => void;

  saveLocation: (
    latitude: number,
    longitude: number,
    suppliedAddress?: string,
    moveCamera?: boolean,
  ) => Promise<void>;

  setMapReady: Dispatch<SetStateAction<boolean>>;
  setBearing: Dispatch<SetStateAction<number>>;
  setMouseCoordinates: Dispatch<SetStateAction<Coordinates>>;
}

export function useMapInitialization({
  mapContainerRef,
  mapRef,
  markerRef,
  routeCoordinatesRef,
  drawRoute,
  saveLocation,
  setMapReady,
  setBearing,
  setMouseCoordinates,
}: UseMapInitializationParams) {
  useEffect(() => {
    const container = mapContainerRef.current;

    if (!container || mapRef.current) {
      return;
    }

    const map = new MapLibreMap({
      container,
      style: STYLES.standard,
      center: DEFAULT_CENTER,
      zoom: 14,
      attributionControl: {
        compact: true,
      },
    });

    const markerElement = document.createElement("div");

    markerElement.className =
      "h-12 w-12 rounded-full border-4 border-white bg-blue-600 shadow-2xl";

    const marker = new Marker({
      element: markerElement,
      draggable: true,
      anchor: "center",
    })
      .setLngLat(DEFAULT_CENTER)
      .addTo(map);

    marker.on("dragend", async () => {
      const coordinates = marker.getLngLat();

      await saveLocation(
        coordinates.lat,
        coordinates.lng,
        undefined,
        false,
      );
    });

    map.on("click", async (event: MapMouseEvent) => {
      setMouseCoordinates([
        event.lngLat.lng,
        event.lngLat.lat,
      ]);

      await saveLocation(
        event.lngLat.lat,
        event.lngLat.lng,
      );
    });

    map.on("load", () => {
      setMapReady(true);
    });

    map.on("rotate", () => {
      setBearing(map.getBearing());
    });

    map.on("style.load", () => {
      setMapReady(true);

      if (routeCoordinatesRef.current.length > 1) {
        drawRoute(routeCoordinatesRef.current);
      }
    });

    map.addControl(
    new NavigationControl({
        showZoom: true,
        showCompass: true,
        visualizePitch: true,
    }),
    "top-right",
    );

    map.addControl(
    new FullscreenControl(),
    "top-right",
    );

    map.addControl(
    new ScaleControl({
        maxWidth: 120,
        unit: "metric",
    }),
    "bottom-left",
    );

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      marker.remove();
      map.remove();

      markerRef.current = null;
      mapRef.current = null;
    };
  }, [
    drawRoute,
    mapContainerRef,
    mapRef,
    markerRef,
    routeCoordinatesRef,
    saveLocation,
    setBearing,
    setMapReady,
    setMouseCoordinates,
  ]);
}