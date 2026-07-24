import { useCallback, useState } from "react";
import type { SavedPlace } from "../types";
import { SEARCH_HISTORY_KEY } from "../mapStyles";

export function useSearchHistory() {
  const [searchHistory, setSearchHistory] = useState<SavedPlace[]>(() => {
    try {
      const savedHistory = localStorage.getItem(SEARCH_HISTORY_KEY);

      if (!savedHistory) {
        return [];
      }

      return JSON.parse(savedHistory) as SavedPlace[];
    } catch (error) {
      console.error("Unable to load search history:", error);
      return [];
    }
  });

  const addToSearchHistory = useCallback((place: SavedPlace) => {
    setSearchHistory((currentHistory) => {
      const historyWithoutDuplicate = currentHistory.filter(
        (item) =>
          item.address !== place.address ||
          item.latitude !== place.latitude ||
          item.longitude !== place.longitude,
      );

      const updatedHistory = [place, ...historyWithoutDuplicate].slice(0, 5);

      try {
        localStorage.setItem(
          SEARCH_HISTORY_KEY,
          JSON.stringify(updatedHistory),
        );
      } catch (error) {
        console.error("Unable to save search history:", error);
      }

      return updatedHistory;
    });
  }, []);

  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);

    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch (error) {
      console.error("Unable to clear search history:", error);
    }
  }, []);

  return {
    searchHistory,
    addToSearchHistory,
    clearSearchHistory,
  };
}