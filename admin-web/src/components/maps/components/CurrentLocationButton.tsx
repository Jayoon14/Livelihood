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
      className="absolute bottom-18 right-3 z-30 flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-blue-600 shadow-lg transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 sm:bottom-auto sm:top-36 dark:border-slate-700 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-slate-800"
    >
      {locating ? (
        <LoaderCircle size={20} className="animate-spin" />
      ) : (
        <LocateFixed size={20} />
      )}
    </button>
  );
}