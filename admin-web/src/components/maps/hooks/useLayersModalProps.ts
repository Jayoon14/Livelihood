import type { StyleKey } from "../types";

interface Props {
  showLayers: boolean;
  style: StyleKey;
  trafficEnabled: boolean;
  tomTomApiKey?: string;

  setShowLayers: (value: boolean) => void;
  setStyle: (value: StyleKey) => void;
  setTrafficEnabled: (value: boolean) => void;
}

export function useLayersModalProps(props: Props) {
  return {
    visible: props.showLayers,
    style: props.style,
    trafficEnabled: props.trafficEnabled,
    tomTomApiKey: props.tomTomApiKey,

    onClose: () => props.setShowLayers(false),
    onStyleChange: props.setStyle,
    onTrafficChange: props.setTrafficEnabled,
  };
}