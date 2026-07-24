import type { Map as MapLibreMap } from "maplibre-gl";

export function addTrafficLayer(
  map: MapLibreMap,
  tomTomApiKey: string,
) {
  if (!map.isStyleLoaded()) return;

  if (!map.getSource("live-traffic")) {
    map.addSource("live-traffic", {
      type: "raster",
      tiles: [
        `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${tomTomApiKey}&tileSize=256&thickness=8`,
      ],
      tileSize: 256,
    });
  }

  if (!map.getLayer("live-traffic-layer")) {
    map.addLayer({
      id: "live-traffic-layer",
      type: "raster",
      source: "live-traffic",
      paint: {
        "raster-opacity": 0.9,
      },
    });
  }
}

export function removeTrafficLayer(
  map: MapLibreMap,
) {
  if (!map.isStyleLoaded()) return;

  if (map.getLayer("live-traffic-layer")) {
    map.removeLayer("live-traffic-layer");
  }

  if (map.getSource("live-traffic")) {
    map.removeSource("live-traffic");
  }
}