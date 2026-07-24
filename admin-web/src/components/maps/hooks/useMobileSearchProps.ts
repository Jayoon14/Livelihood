interface Props {
  searchText: string;
  searching: boolean;
  locating: boolean;
  results: any[];

  searchAddress: (value: string) => void;
  clearSearch: () => void;
  handleCurrentLocation: () => void;
  handleSearchResultSelect: (result: any) => void;
}

export function useMobileSearchProps(props: Props) {
  return {
    searchText: props.searchText,
    searching: props.searching,
    locating: props.locating,
    results: props.results,

    onSearchChange: props.searchAddress,
    onClearSearch: props.clearSearch,
    onCurrentLocation: props.handleCurrentLocation,
    onSelectResult: props.handleSearchResultSelect,
  };
}