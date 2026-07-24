import { useCallback } from "react";
import type { SearchResult } from "../types";

interface Props {
  saveLocation: (
    latitude: number,
    longitude: number,
    address: string,
  ) => Promise<void>;

  addToSearchHistory: (place: {
    address: string;
    latitude: number;
    longitude: number;
  }) => void;
}

export function useSearchResultSelect({
  saveLocation,
  addToSearchHistory,
}: Props) {
  return useCallback(
    async (result: SearchResult) => {
      const latitude = Number(result.lat);
      const longitude = Number(result.lon);

      await saveLocation(
        latitude,
        longitude,
        result.display_name,
      );

      addToSearchHistory({
        address: result.display_name,
        latitude,
        longitude,
      });
    },
    [saveLocation, addToSearchHistory],
  );
}