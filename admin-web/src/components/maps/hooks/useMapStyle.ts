import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import type {
  LayerSpecification,
  Map as MapLibreMap,
  SourceSpecification,
  StyleSpecification,
} from "maplibre-gl";

interface UseMapStyleParams {
  mapRef: MutableRefObject<MapLibreMap | null>;
  mapReady: boolean;
  mapStyle: StyleSpecification;
  pitch?: number;
  onStyleLoaded?: () => void;
}

interface PreservedOverlay {
  sources: Array<{
    id: string;
    specification: SourceSpecification;
  }>;
  layers: LayerSpecification[];
}

function resolvePitch(
  mapStyle: StyleSpecification,
  explicitPitch?: number,
): number {
  if (typeof explicitPitch === "number") {
    return explicitPitch;
  }

  const metadata = mapStyle.metadata as
    | Record<string, unknown>
    | undefined;

  return typeof metadata?.livelihoodgoPitch === "number"
    ? metadata.livelihoodgoPitch
    : 0;
}

function preserveGeoJsonOverlays(
  map: MapLibreMap,
  nextStyle: StyleSpecification,
): PreservedOverlay {
  const currentStyle = map.getStyle();
  const nextSourceIds = new Set(Object.keys(nextStyle.sources ?? {}));
  const sources: PreservedOverlay["sources"] = [];
  const preservedSourceIds = new Set<string>();

  for (const [id, specification] of Object.entries(
    currentStyle.sources ?? {},
  )) {
    if (
      nextSourceIds.has(id) ||
      specification.type !== "geojson"
    ) {
      continue;
    }

    sources.push({
      id,
      specification: specification as SourceSpecification,
    });
    preservedSourceIds.add(id);
  }

  const layers = (currentStyle.layers ?? []).filter(
    (layer): layer is LayerSpecification => {
      if (!("source" in layer)) {
        return false;
      }

      return (
        typeof layer.source === "string" &&
        preservedSourceIds.has(layer.source)
      );
    },
  );

  return { sources, layers };
}

function restoreGeoJsonOverlays(
  map: MapLibreMap,
  overlays: PreservedOverlay,
): void {
  for (const source of overlays.sources) {
    if (!map.getSource(source.id)) {
      map.addSource(source.id, source.specification);
    }
  }

  for (const layer of overlays.layers) {
    if (!map.getLayer(layer.id)) {
      map.addLayer(layer);
    }
  }
}

export function useMapStyle({
  mapRef,
  mapReady,
  mapStyle,
  pitch,
  onStyleLoaded,
}: UseMapStyleParams) {
  const callbackRef = useRef(onStyleLoaded);

  useEffect(() => {
    callbackRef.current = onStyleLoaded;
  }, [onStyleLoaded]);

  useEffect(() => {
    if (!mapReady) {
      return;
    }

    const map = mapRef.current;

    if (!map) {
      return;
    }

    let cancelled = false;
    let overlays: PreservedOverlay = {
      sources: [],
      layers: [],
    };

    try {
      overlays = preserveGeoJsonOverlays(map, mapStyle);
    } catch (error) {
      console.warn("Unable to preserve map overlays:", error);
    }

    const handleStyleLoaded = () => {
      if (cancelled) {
        return;
      }

      try {
        restoreGeoJsonOverlays(map, overlays);
      } catch (error) {
        console.error(
          "Unable to restore route after layer switch:",
          error,
        );
      }

      map.easeTo({
        pitch: resolvePitch(mapStyle, pitch),
        duration: 500,
      });

      map.resize();
      callbackRef.current?.();
    };

    map.once("style.load", handleStyleLoaded);

    try {
      map.setStyle(mapStyle, {
        diff: false,
      });
    } catch (error) {
      map.off("style.load", handleStyleLoaded);
      console.error("Unable to apply map style:", error);
    }

    return () => {
      cancelled = true;
      map.off("style.load", handleStyleLoaded);
    };
  }, [mapRef, mapReady, mapStyle, pitch]);
}
