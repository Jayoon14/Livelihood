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

function createWorkerMarkerElement() {
  const markerElement = document.createElement("div");

  markerElement.style.width = "54px";
  markerElement.style.height = "54px";
  markerElement.style.display = "flex";
  markerElement.style.alignItems = "center";
  markerElement.style.justifyContent = "center";

  markerElement.innerHTML = `
    <div
      data-worker-marker-icon
      style="
        position: relative;
        display: flex;
        width: 48px;
        height: 48px;
        align-items: center;
        justify-content: center;
        border: 4px solid white;
        border-radius: 9999px;
        background: #2563eb;
        box-shadow:
          0 10px 25px rgba(15,23,42,.30),
          0 0 0 5px rgba(37,99,235,.18);
      "
    >
      <svg
        width="25"
        height="25"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
      </svg>

      <span
        style="
          position:absolute;
          right:-2px;
          bottom:-2px;
          width:14px;
          height:14px;
          border:3px solid white;
          border-radius:9999px;
          background:#22c55e;
        "
      ></span>
    </div>
  `;

  return markerElement;
}

function createCustomerMarkerElement() {
  const markerElement = document.createElement("div");

  markerElement.style.width = "48px";
  markerElement.style.height = "48px";
  markerElement.style.display = "flex";
  markerElement.style.alignItems = "center";
  markerElement.style.justifyContent = "center";

  markerElement.innerHTML = `
    <div
      style="
        display:flex;
        width:44px;
        height:44px;
        align-items:center;
        justify-content:center;
        border:4px solid white;
        border-radius:9999px 9999px 9999px 0;
        background:#dc2626;
        transform:rotate(-45deg);
        box-shadow:
          0 10px 25px rgba(15,23,42,.30),
          0 0 0 5px rgba(220,38,38,.16);
      "
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
        style="transform:rotate(45deg)"
      >
        <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"></path>
        <circle cx="12" cy="10" r="3"></circle>
      </svg>
    </div>
  `;

  return markerElement;
}

interface UseMapInitializationParams {
  mapContainerRef: MutableRefObject<HTMLDivElement | null>;
  mapRef: MutableRefObject<MapLibreMap | null>;

  markerRef: MutableRefObject<Marker | null>;
  destinationMarkerRef: MutableRefObject<Marker | null>;

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

  initialLocation?: {
    latitude: number;
    longitude: number;
    address: string;
  };

  navigationMode: boolean;
}

export function useMapInitialization({
  mapContainerRef,
  mapRef,
  markerRef,
  destinationMarkerRef,
  routeCoordinatesRef,
  drawRoute,
  saveLocation,
  setMapReady,
  setBearing,
  setMouseCoordinates,
  initialLocation,
  navigationMode,
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

let workerMarker: Marker | null = null;

if (navigationMode) {
  const workerMarkerElement = createWorkerMarkerElement();

  // Nakatago muna hanggang confirmed online ang worker.
  workerMarkerElement.style.display = "none";

  workerMarker = new Marker({
    element: workerMarkerElement,
    draggable: false,
    anchor: "center",
  })
    .setLngLat(DEFAULT_CENTER)
    .addTo(map);
}

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
    map.on("rotate", () => {
      setBearing(map.getBearing());
    });

    map.on("load", () => {
      setMapReady(true);

      if (
        navigationMode &&
        initialLocation
      ) {
        const customerMarkerElement =
          createCustomerMarkerElement();

        destinationMarkerRef.current =
          new Marker({
            element: customerMarkerElement,
            anchor: "bottom",
          })
            .setLngLat([
              initialLocation.longitude,
              initialLocation.latitude,
            ])
            .addTo(map);
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
    markerRef.current = workerMarker;

    return () => {
      workerMarker?.remove();
      destinationMarkerRef.current?.remove();

      map.remove();

      markerRef.current = null;
      destinationMarkerRef.current = null;
      mapRef.current = null;
    };
  }, [
  destinationMarkerRef,
  drawRoute,
  initialLocation,
  mapContainerRef,
  mapRef,
  markerRef,
  navigationMode,
  routeCoordinatesRef,
  saveLocation,
  setBearing,
  setMapReady,
  setMouseCoordinates,
]);
}