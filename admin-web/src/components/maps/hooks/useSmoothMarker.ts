import {
  useEffect,
  useRef,
  type RefObject,
} from "react";
import type { Marker } from "maplibre-gl";
import type { Coordinates } from "../types";

interface UseSmoothMarkerParams {
  markerRef: RefObject<Marker | null>;
  coordinates: Coordinates | null;
  duration?: number;
}

export function useSmoothMarker({
  markerRef,
  coordinates,
  duration = 500,
}: UseSmoothMarkerParams) {
  const animationRef = useRef<number | null>(null);
  const previousRef = useRef<Coordinates | null>(null);

  useEffect(() => {
    const marker = markerRef.current;

    if (!marker || !coordinates) {
      return;
    }

    if (!previousRef.current) {
      previousRef.current = coordinates;
      marker.setLngLat(coordinates);
      return;
    }

    const start = performance.now();
    const from = previousRef.current;
    const to = coordinates;

    const animate = (time: number) => {
      const progress = Math.min(
        (time - start) / duration,
        1,
      );

      marker.setLngLat([
        from[0] + (to[0] - from[0]) * progress,
        from[1] + (to[1] - from[1]) * progress,
      ]);

      if (progress < 1) {
        animationRef.current =
          window.requestAnimationFrame(animate);
      }
    };

    animationRef.current =
      window.requestAnimationFrame(animate);

    previousRef.current = coordinates;

    return () => {
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(
          animationRef.current,
        );
        animationRef.current = null;
      }
    };
  }, [coordinates, duration, markerRef]);
}
