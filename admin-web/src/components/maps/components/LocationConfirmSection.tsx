import ConfirmPanel from "./ConfirmPanel";

interface Props {
  editableAddress: string;
  selectedAddress: string;
  latitude: number;
  longitude: number;

  onAddressChange: (value: string) => void;
  onConfirm: () => void;
}

export default function LocationConfirmSection(props: Props) {
  return <ConfirmPanel {...props} />;
}