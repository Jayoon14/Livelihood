import type { StyleSpecification } from "maplibre-gl";

import type { StyleKey } from "./types";

export const DEFAULT_CENTER: [number, number] = [
  121.1251,
  14.2786,
];

export const SEARCH_HISTORY_KEY =
  "livelihoodgo_search_history";

export interface MapStyleOption {
  key: StyleKey;
  label: string;
  className: string;
}

function rasterStyle(
  sourceId: string,
  layerId: string,
  tiles: string[],
  attribution: string,
  maxzoom = 20,
  pitch = 0,
): StyleSpecification {
  return {
    version: 8,
    metadata: {
      livelihoodgoPitch: pitch,
    },
    sources: {
      [sourceId]: {
        type: "raster",
        tiles,
        tileSize: 256,
        attribution,
        maxzoom,
      },
    },
    layers: [
      {
        id: layerId,
        type: "raster",
        source: sourceId,
        minzoom: 0,
        maxzoom: 24,
      },
    ],
  };
}

export const STANDARD_STYLE = rasterStyle(
  "standard-map",
  "standard-map-layer",
  ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
  "© OpenStreetMap contributors",
  19,
);

export const BRIGHT_STYLE = rasterStyle(
  "bright-map",
  "bright-map-layer",
  [
    "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
    "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
    "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
    "https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
  ],
  "© OpenStreetMap contributors © CARTO",
);

export const DARK_STYLE = rasterStyle(
  "dark-map",
  "dark-map-layer",
  [
    "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
    "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
    "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
    "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
  ],
  "© OpenStreetMap contributors © CARTO",
);

export const THREE_D_STYLE = rasterStyle(
  "terrain-map",
  "terrain-map-layer",
  ["https://tile.opentopomap.org/{z}/{x}/{y}.png"],
  "© OpenStreetMap contributors, SRTM | © OpenTopoMap",
  17,
  55,
);

export const SATELLITE_STYLE = rasterStyle(
  "satellite-map",
  "satellite-map-layer",
  [
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  ],
  "Tiles © Esri",
  19,
);

export const STYLES = {
  standard: STANDARD_STYLE,
  bright: BRIGHT_STYLE,
  dark: DARK_STYLE,
  threeD: THREE_D_STYLE,
} as const satisfies Record<
  Exclude<StyleKey, "satellite">,
  StyleSpecification
>;

export const STYLE_OPTIONS: readonly MapStyleOption[] = [
  {
    key: "standard",
    label: "Standard",
    className:
      "bg-gradient-to-br from-emerald-100 via-green-50 to-blue-100",
  },
  {
    key: "bright",
    label: "Bright",
    className:
      "bg-gradient-to-br from-sky-100 via-white to-slate-100",
  },
  {
    key: "dark",
    label: "Dark",
    className:
      "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700",
  },
  {
    key: "threeD",
    label: "3D",
    className:
      "bg-gradient-to-br from-emerald-100 via-cyan-100 to-violet-200",
  },
  {
    key: "satellite",
    label: "Satellite",
    className:
      "bg-gradient-to-br from-emerald-900 via-cyan-800 to-slate-900",
  },
];