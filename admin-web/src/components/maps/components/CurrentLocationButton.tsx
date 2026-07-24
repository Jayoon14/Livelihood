import { LoaderCircle, LocateFixed } from "lucide-react";

interface CurrentLocationButtonProps {
  locating: boolean;
  onClick: () => void;
}

export default function CurrentLocationButton({
  locating,
  onClick,
}: CurrentLocationButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={locating}
      title="Current location"
      aria-label="Go to current location"
      className="absolute right-3 top-36 z-30 flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-blue-600 shadow-lg transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {locating ? (
        <LoaderCircle size={20} className="animate-spin" />
      ) : (
        <LocateFixed size={20} />
      )}
    </button>
  );
}