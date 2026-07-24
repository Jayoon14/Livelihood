import { useEffect, useRef } from "react";
import type { Marker } from "maplibre-gl";
import type { Coordinates } from "../types";

interface UseSmoothMarkerParams {
  marker: Marker | null;
  coordinates: Coordinates | null;
  duration?: number;
}

export function useSmoothMarker({
  marker,
  coordinates,
  duration = 500,
}: UseSmoothMarkerParams) {
  const animationRef = useRef<number | null>(null);
  const previousRef = useRef<Coordinates | null>(null);

  useEffect(() => {
    if (!marker || !coordinates) return;

    if (!previousRef.current) {
      previousRef.current = coordinates;
      marker.setLngLat(coordinates);
      return;
    }

    const start = performance.now();
    const from = previousRef.current;
    const to = coordinates;

    const animate = (time: number) => {
      const progress = Math.min((time - start) / duration, 1);

      const lng =
        from[0] + (to[0] - from[0]) * progress;

      const lat =
        from[1] + (to[1] - from[1]) * progress;

      marker.setLngLat([lng, lat]);

      if (progress < 1) {
        animationRef.current =
          requestAnimationFrame(animate);
      }
    };

    animationRef.current =
      requestAnimationFrame(animate);

    previousRef.current = coordinates;

    return () => {
    if (animationRef.current !== null) {
    cancelAnimationFrame(animationRef.current);
    }
        };
  }, [marker, coordinates, duration]);
}