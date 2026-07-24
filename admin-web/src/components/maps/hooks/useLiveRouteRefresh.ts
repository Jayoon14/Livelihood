import { useEffect, useRef } from "react";
import type { Coordinates } from "../types";

interface UseLiveRouteRefreshParams {
  coordinates: Coordinates | null;
  enabled: boolean;
  refreshRoute: () => void | Promise<void>;
  minimumDistanceMeters?: number;
  minimumIntervalMilliseconds?: number;
}

function calculateDistanceMeters(
  first: Coordinates,
  second: Coordinates,
): number {
  const earthRadius = 6_371_000;

  const firstLatitude = (first[1] * Math.PI) / 180;
  const secondLatitude = (second[1] * Math.PI) / 180;

  const latitudeDifference =
    ((second[1] - first[1]) * Math.PI) / 180;

  const longitudeDifference =
    ((second[0] - first[0]) * Math.PI) / 180;

  const value =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDifference / 2) ** 2;

  const centralAngle =
    2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));

  return earthRadius * centralAngle;
}

export function useLiveRouteRefresh({
  coordinates,
  enabled,
  refreshRoute,
  minimumDistanceMeters = 25,
  minimumIntervalMilliseconds = 10_000,
}: UseLiveRouteRefreshParams) {
  const previousCoordinatesRef =
    useRef<Coordinates | null>(null);

  const previousRefreshTimeRef = useRef(0);
  const refreshingRef = useRef(false);

  useEffect(() => {
    if (!enabled || !coordinates) {
      return;
    }

    const previousCoordinates =
      previousCoordinatesRef.current;

    const currentTime = Date.now();

    const elapsedTime =
      currentTime - previousRefreshTimeRef.current;

    const traveledDistance = previousCoordinates
      ? calculateDistanceMeters(
          previousCoordinates,
          coordinates,
        )
      : Number.POSITIVE_INFINITY;

    const movedFarEnough =
      traveledDistance >= minimumDistanceMeters;

    const waitedLongEnough =
      elapsedTime >= minimumIntervalMilliseconds;

    if (!movedFarEnough && !waitedLongEnough) {
      return;
    }

    if (refreshingRef.current) {
      return;
    }

    refreshingRef.current = true;

    Promise.resolve(refreshRoute())
      .then(() => {
        previousCoordinatesRef.current = coordinates;
        previousRefreshTimeRef.current = Date.now();
      })
      .catch((error: unknown) => {
        console.error("Live route refresh error:", error);
      })
      .finally(() => {
        refreshingRef.current = false;
      });
  }, [
    coordinates,
    enabled,
    minimumDistanceMeters,
    minimumIntervalMilliseconds,
    refreshRoute,
  ]);

  useEffect(() => {
    if (!enabled) {
      previousCoordinatesRef.current = null;
      previousRefreshTimeRef.current = 0;
      refreshingRef.current = false;
    }
  }, [enabled]);
}