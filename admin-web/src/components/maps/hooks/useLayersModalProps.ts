import type { StyleKey } from "../types";

interface Props {
  showLayers: boolean;
  style: StyleKey;

  setShowLayers: (value: boolean) => void;
  setStyle: (value: StyleKey) => void;
}

export function useLayersModalProps(props: Props) {
  return {
    visible: props.showLayers,
    style: props.style,

    onClose: () => props.setShowLayers(false),
    onStyleChange: props.setStyle,
  };
}