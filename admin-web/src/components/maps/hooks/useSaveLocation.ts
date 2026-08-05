import { useCallback } from "react";
import type {
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from "react";

import {
  Marker,
  type Map as MapLibreMap,
} from "maplibre-gl";

import type {
  Coordinates,
  SearchResult,
} from "../types";

import { reverseGeocode } from "../geocode";

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
        display: flex;
        width: 44px;
        height: 44px;
        align-items: center;
        justify-content: center;
        border: 4px solid white;
        border-radius: 9999px 9999px 9999px 0;
        background: #dc2626;
        box-shadow:
          0 10px 25px rgba(15, 23, 42, 0.3),
          0 0 0 5px rgba(220, 38, 38, 0.16);
        transform: rotate(-45deg);
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
        style="transform: rotate(45deg);"
      >
        <path
          d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"
        ></path>

        <circle
          cx="12"
          cy="10"
          r="3"
        ></circle>
      </svg>
    </div>
  `;

  return markerElement;
}

interface UseSaveLocationParams {
  mapRef: MutableRefObject<MapLibreMap | null>;

  destinationMarkerRef: MutableRefObject<Marker | null>;

  selectedCoordinatesRef: MutableRefObject<Coordinates>;

  callbackRef: MutableRefObject<
    (
      latitude: number,
      longitude: number,
      address: string,
    ) => void
  >;

  setLongitude: Dispatch<SetStateAction<number>>;
  setLatitude: Dispatch<SetStateAction<number>>;
  setSelectedAddress: Dispatch<SetStateAction<string>>;
  setEditableAddress: Dispatch<SetStateAction<string>>;
  setSearchText: Dispatch<SetStateAction<string>>;
  setResults: Dispatch<SetStateAction<SearchResult[]>>;
  setMessage: Dispatch<SetStateAction<string>>;
}

export function useSaveLocation({
  mapRef,
  destinationMarkerRef,
  selectedCoordinatesRef,
  callbackRef,
  setLongitude,
  setLatitude,
  setSelectedAddress,
  setEditableAddress,
  setSearchText,
  setResults,
  setMessage,
}: UseSaveLocationParams) {
  return useCallback(
    async (
      latitude: number,
      longitude: number,
      suppliedAddress?: string,
      moveCamera = true,
    ) => {
      const address =
        suppliedAddress ??
        (await reverseGeocode(
          latitude,
          longitude,
        ));

      selectedCoordinatesRef.current = [
        longitude,
        latitude,
      ];

      setLongitude(longitude);
      setLatitude(latitude);
      setSelectedAddress(address);
      setEditableAddress(address);
      setSearchText(address);
      setResults([]);
      setMessage("");

      const placeDestinationMarker = (): boolean => {
        const map = mapRef.current;

        if (!map) {
          return false;
        }

        const existingElement =
          destinationMarkerRef.current?.getElement();

        if (
          !destinationMarkerRef.current ||
          !existingElement?.isConnected
        ) {
          destinationMarkerRef.current?.remove();

          destinationMarkerRef.current = new Marker({
            element: createCustomerMarkerElement(),
            anchor: "bottom",
            draggable: false,
          })
            .setLngLat([longitude, latitude])
            .addTo(map);
        } else {
          destinationMarkerRef.current.setLngLat([
            longitude,
            latitude,
          ]);
        }

        return true;
      };

      if (!placeDestinationMarker()) {
        window.setTimeout(placeDestinationMarker, 100);
        window.setTimeout(placeDestinationMarker, 350);
      }

      if (moveCamera) {
        mapRef.current?.flyTo({
          center: [
            longitude,
            latitude,
          ],
          zoom: 17,
          duration: 1000,
          essential: true,
        });
      }

      callbackRef.current(
        latitude,
        longitude,
        address,
      );
    },
    [
      callbackRef,
      destinationMarkerRef,
      mapRef,
      selectedCoordinatesRef,
      setEditableAddress,
      setLatitude,
      setLongitude,
      setMessage,
      setResults,
      setSearchText,
      setSelectedAddress,
    ],
  );
}