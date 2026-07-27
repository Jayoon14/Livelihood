import { useState } from "react";

import type { Coordinates, StyleKey } from "../types";

import { DEFAULT_CENTER } from "../mapStyles";

export function useLocationPickerState() {
  const [style, setStyle] = useState<StyleKey>("standard");
  const [showLayers, setShowLayers] = useState(false);
  const [showDirections, setShowDirections] = useState(false);


  const [longitude, setLongitude] = useState(DEFAULT_CENTER[0]);
  const [latitude, setLatitude] = useState(DEFAULT_CENTER[1]);

  const [selectedAddress, setSelectedAddress] = useState("");
  const [editableAddress, setEditableAddress] = useState("");

  const [locating, setLocating] = useState(false);
  const [routing, setRouting] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const [message, setMessage] = useState("");

  const [distance, setDistance] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  const [bearing, setBearing] = useState(0);

  const [mouseCoordinates, setMouseCoordinates] =
    useState<Coordinates>(DEFAULT_CENTER);

  return {
    style,
    setStyle,

    showLayers,
    setShowLayers,

    showDirections,
    setShowDirections,

    longitude,
    setLongitude,

    latitude,
    setLatitude,

    selectedAddress,
    setSelectedAddress,

    editableAddress,
    setEditableAddress,

    locating,
    setLocating,

    routing,
    setRouting,

    mapReady,
    setMapReady,

    message,
    setMessage,

    distance,
    setDistance,

    duration,
    setDuration,

    bearing,
    setBearing,

    mouseCoordinates,
    setMouseCoordinates,
  };
}
