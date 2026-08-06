import { useEffect, useRef, type RefObject } from "react";
import type { Marker } from "maplibre-gl";
import type { Coordinates } from "../types";

interface UseMarkerHeadingParams {
  markerRef: RefObject<Marker | null>;
  coordinates: Coordinates | null;
  gpsHeading?: number | null;
  minimumMovementMeters?: number;
}

function calculateDistanceMeters(
  from: Coordinates,
  to: Coordinates,
): number {
  const earthRadius = 6_371_000;

  const firstLatitude = (from[1] * Math.PI) / 180;
  const secondLatitude = (to[1] * Math.PI) / 180;

  const latitudeDifference =
    ((to[1] - from[1]) * Math.PI) / 180;

  const longitudeDifference =
    ((to[0] - from[0]) * Math.PI) / 180;

  const value =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDifference / 2) ** 2;

  const centralAngle =
    2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));

  return earthRadius * centralAngle;
}

function calculateBearing(
  from: Coordinates,
  to: Coordinates,
): number {
  const fromLatitude = (from[1] * Math.PI) / 180;
  const toLatitude = (to[1] * Math.PI) / 180;

  const longitudeDifference =
    ((to[0] - from[0]) * Math.PI) / 180;

  const y =
    Math.sin(longitudeDifference) *
    Math.cos(toLatitude);

  const x =
    Math.cos(fromLatitude) *
      Math.sin(toLatitude) -
    Math.sin(fromLatitude) *
      Math.cos(toLatitude) *
      Math.cos(longitudeDifference);

  const bearing =
    (Math.atan2(y, x) * 180) / Math.PI;

  return (bearing + 360) % 360;
}

export function useMarkerHeading({
  markerRef,
  coordinates,
  gpsHeading,
  minimumMovementMeters = 3,
}: UseMarkerHeadingParams) {
  const previousCoordinatesRef =
    useRef<Coordinates | null>(null);

  const previousHeadingRef = useRef(0);

  useEffect(() => {
    const marker = markerRef.current;

    if (!marker || !coordinates) {
      return;
    }

    marker.setRotationAlignment("map");
    marker.setPitchAlignment("map");

    let nextHeading: number | null = null;

    // Gamitin muna ang heading na galing mismo sa GPS.
    if (
      typeof gpsHeading === "number" &&
      Number.isFinite(gpsHeading) &&
      gpsHeading >= 0
    ) {
      nextHeading = gpsHeading;
    }

    const previousCoordinates =
      previousCoordinatesRef.current;

    // Fallback: kalkulahin mula sa previous at bagong coordinates.
    if (nextHeading === null && previousCoordinates) {
      const movementDistance =
        calculateDistanceMeters(
          previousCoordinates,
          coordinates,
        );

      if (movementDistance >= minimumMovementMeters) {
        nextHeading = calculateBearing(
          previousCoordinates,
          coordinates,
        );
      }
    }

    if (nextHeading !== null) {
      marker.setRotation(nextHeading);
      previousHeadingRef.current = nextHeading;
    } else {
      marker.setRotation(previousHeadingRef.current);
    }

    previousCoordinatesRef.current = coordinates;
  }, [
    coordinates,
    gpsHeading,
    minimumMovementMeters,
    markerRef,
  ]);
}