import { useCallback } from "react";
import type {
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from "react";

import type { Coordinates } from "../types";

interface UseCurrentLocationParams {
  currentLocationRef: MutableRefObject<Coordinates | null>;

  saveLocation: (
    latitude: number,
    longitude: number,
    suppliedAddress?: string,
    moveCamera?: boolean,
  ) => Promise<void>;

  setLocating: Dispatch<SetStateAction<boolean>>;
  setMessage: Dispatch<SetStateAction<string>>;
}

export function useCurrentLocation({
  currentLocationRef,
  saveLocation,
  setLocating,
  setMessage,
}: UseCurrentLocationParams) {
  return useCallback(
    (selectAsDestination = true) => {
      if (!navigator.geolocation) {
        setMessage(
          "Geolocation is not supported by this browser.",
        );
        return;
      }

      setLocating(true);
      setMessage("");

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coordinates: Coordinates = [
            position.coords.longitude,
            position.coords.latitude,
          ];

          currentLocationRef.current = coordinates;

          try {
            if (selectAsDestination) {
              await saveLocation(
                position.coords.latitude,
                position.coords.longitude,
              );
            }
          } catch (error) {
            console.error(
              "Unable to save current location:",
              error,
            );

            setMessage(
              "Your location was found, but its address could not be loaded.",
            );
          } finally {
            setLocating(false);
          }
        },

        (error) => {
          console.error("Geolocation error:", error);

          setLocating(false);

          switch (error.code) {
            case error.PERMISSION_DENIED:
              setMessage(
                "Location permission was denied. Please allow location access in your browser.",
              );
              break;

            case error.POSITION_UNAVAILABLE:
              setMessage(
                "Your current location is unavailable. Please try again.",
              );
              break;

            case error.TIMEOUT:
              setMessage(
                "Location request timed out. Please try again or select a location on the map.",
              );
              break;

            default:
              setMessage(
                "Unable to access your location. Please choose a point on the map.",
              );
          }
        },

        {
          enableHighAccuracy: false,
          timeout: 20000,
          maximumAge: 60000,
        },
      );
    },
    [
      currentLocationRef,
      saveLocation,
      setLocating,
      setMessage,
    ],
  );
}