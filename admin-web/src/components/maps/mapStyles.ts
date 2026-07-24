import type { StyleSpecification } from "maplibre-gl";
import type { Coordinates, StyleKey } from "./types";

export const DEFAULT_CENTER: Coordinates = [121.1251, 14.2786];

export const SEARCH_HISTORY_KEY = "livelihoodgo_search_history";

export const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    satellite: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Tiles © Esri",
    },
    labels: {
      type: "raster",
      tiles: [
        "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Labels © Esri",
    },
  },
  layers: [
    {
      id: "satellite",
      type: "raster",
      source: "satellite",
    },
    {
      id: "satellite-labels",
      type: "raster",
      source: "labels",
    },
  ],
};

export const STYLES: Record<Exclude<StyleKey, "satellite">, string> = {
  standard: "https://tiles.openfreemap.org/styles/bright",
  bright: "https://tiles.openfreemap.org/styles/bright",
  dark: "https://tiles.openfreemap.org/styles/dark",
  threeD: "https://tiles.openfreemap.org/styles/bright",
};

export const STYLE_OPTIONS = [
  {
    key: "standard",
    label: "Standard",
    className: "bg-emerald-100",
  },
  {
    key: "bright",
    label: "Bright",
    className: "bg-sky-100",
  },
  {
    key: "dark",
    label: "Dark",
    className: "bg-slate-800",
  },
  {
    key: "threeD",
    label: "3D",
    className: "bg-gradient-to-br from-emerald-100 to-violet-200",
  },
  {
    key: "satellite",
    label: "Satellite",
    className: "bg-gradient-to-br from-green-900 to-sky-900",
  },
] as const;