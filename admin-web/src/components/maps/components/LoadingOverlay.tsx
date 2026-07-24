import { LoaderCircle } from "lucide-react";

interface LoadingOverlayProps {
  visible: boolean;
}

export default function LoadingOverlay({
  visible,
}: LoadingOverlayProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className="absolute inset-y-0 right-0 z-30 flex items-center justify-center bg-white/70 backdrop-blur-sm lg:left-[320px]">
      <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-2xl">
        <LoaderCircle className="animate-spin text-blue-600" />

        <span className="font-semibold text-slate-700">
          Loading map...
        </span>
      </div>
    </div>
  );
}