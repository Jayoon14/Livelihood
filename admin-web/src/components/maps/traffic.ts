import type { Map as MapLibreMap } from "maplibre-gl";

const TRAFFIC_SOURCE_ID = "live-traffic";
const TRAFFIC_LAYER_ID = "live-traffic-layer";

export function addTrafficLayer(
  map: MapLibreMap,
  tomTomApiKey: string,
) {
  if (!map.isStyleLoaded()) {
    return;
  }

  if (!tomTomApiKey.trim()) {
    console.warn("TomTom API key is missing.");
    return;
  }

  const encodedApiKey = encodeURIComponent(tomTomApiKey.trim());

  if (!map.getSource(TRAFFIC_SOURCE_ID)) {
    map.addSource(TRAFFIC_SOURCE_ID, {
      type: "raster",

      tiles: [
        `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${encodedApiKey}&tileSize=256`,
      ],

      tileSize: 256,
      minzoom: 0,
      maxzoom: 22,

      attribution: "Traffic © TomTom",
    });
  }

  if (!map.getLayer(TRAFFIC_LAYER_ID)) {
    map.addLayer({
      id: TRAFFIC_LAYER_ID,
      type: "raster",
      source: TRAFFIC_SOURCE_ID,

      paint: {
        "raster-opacity": 0.85,
        "raster-fade-duration": 0,
      },
    });
  }
}

export function removeTrafficLayer(map: MapLibreMap) {
  if (!map.isStyleLoaded()) {
    return;
  }

  if (map.getLayer(TRAFFIC_LAYER_ID)) {
    map.removeLayer(TRAFFIC_LAYER_ID);
  }

  if (map.getSource(TRAFFIC_SOURCE_ID)) {
    map.removeSource(TRAFFIC_SOURCE_ID);
  }
}