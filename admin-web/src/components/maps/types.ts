export interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export interface SavedPlace {
  address: string;
  latitude: number;
  longitude: number;
}

export interface RouteResult {
  routes?: Array<{
    distance: number;
    duration: number;
    geometry: {
      type: "LineString";
      coordinates: [number, number][];
    };
  }>;
}

export type StyleKey =
  | "standard"
  | "bright"
  | "dark"
  | "threeD"
  | "satellite";

export type Coordinates = [number, number];