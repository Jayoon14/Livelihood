import { useCallback } from "react";
import type {
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from "react";

import type {
  Map as MapLibreMap,
  Marker,
} from "maplibre-gl";

import type {
  Coordinates,
  SearchResult,
} from "../types";

import { reverseGeocode } from "../geocode";

interface UseSaveLocationParams {
  mapRef: MutableRefObject<MapLibreMap | null>;
  markerRef: MutableRefObject<Marker | null>;

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
  markerRef,
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
        (await reverseGeocode(latitude, longitude));

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

      markerRef.current?.setLngLat([
        longitude,
        latitude,
      ]);

      if (moveCamera) {
        mapRef.current?.flyTo({
          center: [longitude, latitude],
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
      mapRef,
      markerRef,
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