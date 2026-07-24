import { useCallback } from "react";

interface UseConfirmAddressProps {
  editableAddress: string;
  latitude: number;
  longitude: number;

  setMessage: (message: string) => void;
  setSelectedAddress: (address: string) => void;
  setSearchText: (address: string) => void;

  callback: (
    latitude: number,
    longitude: number,
    address: string,
  ) => void;
}

export function useConfirmAddress({
  editableAddress,
  latitude,
  longitude,
  setMessage,
  setSelectedAddress,
  setSearchText,
  callback,
}: UseConfirmAddressProps) {
  return useCallback(() => {
    const address = editableAddress.trim();

    if (!address) {
      setMessage("Enter the exact service address.");
      return;
    }

    setSelectedAddress(address);
    setSearchText(address);
    callback(latitude, longitude, address);
    setMessage("Location confirmed.");
  }, [
    editableAddress,
    latitude,
    longitude,
    setMessage,
    setSelectedAddress,
    setSearchText,
    callback,
  ]);
}