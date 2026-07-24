import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from "react";

import type { Coordinates } from "../types";

interface LiveLocationData {
  coordinates: Coordinates;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

interface UseLiveLocationParams {
  currentLocationRef: MutableRefObject<Coordinates | null>;

  setMessage: Dispatch<SetStateAction<string>>;
  setLocating: Dispatch<SetStateAction<boolean>>;

  onLocationUpdate?: (
    location: LiveLocationData,
  ) => void | Promise<void>;
}

export function useLiveLocation({
  currentLocationRef,
  setMessage,
  setLocating,
  onLocationUpdate,
}: UseLiveLocationParams) {
  const watchIdRef = useRef<number | null>(null);

  const [isTracking, setIsTracking] = useState(false);
  const [liveLocation, setLiveLocation] =
    useState<LiveLocationData | null>(null);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(
        watchIdRef.current,
      );

      watchIdRef.current = null;
    }

    setIsTracking(false);
    setLocating(false);
  }, [setLocating]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setMessage(
        "Geolocation is not supported by this browser.",
      );
      return;
    }

    if (watchIdRef.current !== null) {
      return;
    }

    setLocating(true);
    setMessage("");

    watchIdRef.current =
      navigator.geolocation.watchPosition(
        async (position) => {
          const coordinates: Coordinates = [
            position.coords.longitude,
            position.coords.latitude,
          ];

          const locationData: LiveLocationData = {
            coordinates,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp,
          };

          currentLocationRef.current = coordinates;

          setLiveLocation(locationData);
          setIsTracking(true);
          setLocating(false);
          setMessage("");

          try {
            await onLocationUpdate?.(locationData);
          } catch (error) {
            console.error(
              "Live location update error:",
              error,
            );
          }
        },
        (error) => {
          setLocating(false);

          switch (error.code) {
            case error.PERMISSION_DENIED:
              setMessage(
                "Location permission was denied. Please allow location access.",
              );
              stopTracking();
              break;

            case error.POSITION_UNAVAILABLE:
              setMessage(
                "Your current location is temporarily unavailable.",
              );
              break;

            case error.TIMEOUT:
              setMessage(
                "Location update timed out. Retrying automatically.",
              );
              break;

            default:
              setMessage(
                "Unable to track your current location.",
              );
          }

          console.warn(
            "Live geolocation warning:",
            error.message,
          );
        },
        {
          enableHighAccuracy: false,
          timeout: 20000,
          maximumAge: 10000,
        },
      );

    setIsTracking(true);
  }, [
    currentLocationRef,
    onLocationUpdate,
    setLocating,
    setMessage,
    stopTracking,
  ]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(
          watchIdRef.current,
        );
      }
    };
  }, []);

  return {
    liveLocation,
    isTracking,
    startTracking,
    stopTracking,
  };
}