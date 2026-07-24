interface Props {
  searchText: string;
  results: any[];
  searching: boolean;
  locating: boolean;
  routing: boolean;
  searchHistory: any[];
  selectedAddress: string;
  distance: number | null;
  duration: number | null;
  hasCurrentLocation: boolean;

  searchAddress: (value: string) => void;
  clearSearch: () => void;
  handleSearchResultSelect: (result: any) => void;
  handleCurrentLocation: () => void;
  clearSearchHistory: () => void;
  saveLocation: (
    latitude: number,
    longitude: number,
    address: string,
  ) => void | Promise<void>;
  setShowLayers: (value: boolean) => void;
  getDirections: () => void;
}

export function useSidebarProps(props: Props) {
  return {
    searchText: props.searchText,
    results: props.results,
    searching: props.searching,
    locating: props.locating,
    routing: props.routing,
    searchHistory: props.searchHistory,
    selectedAddress: props.selectedAddress,
    distance: props.distance,
    duration: props.duration,
    hasCurrentLocation: props.hasCurrentLocation,

    onSearchChange: props.searchAddress,
    onClearSearch: props.clearSearch,
    onSelectSearchResult: props.handleSearchResultSelect,
    onCurrentLocationClick: props.handleCurrentLocation,
    onClearSearchHistory: props.clearSearchHistory,

    onSelectHistoryPlace: (place: any) =>
      props.saveLocation(
        place.latitude,
        place.longitude,
        place.address,
      ),

    onOpenLayers: () => props.setShowLayers(true),
    onGetDirections: props.getDirections,
  };
}