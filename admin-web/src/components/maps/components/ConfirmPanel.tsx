import { Check, MapPin, PencilLine } from "lucide-react";

interface ConfirmPanelProps {
  editableAddress: string;
  selectedAddress: string;
  latitude: number;
  longitude: number;
  onAddressChange: (value: string) => void;
  onConfirm: () => void;
}

export default function ConfirmPanel({
  editableAddress,
  selectedAddress,
  latitude,
  longitude,
  onAddressChange,
  onConfirm,
}: ConfirmPanelProps) {
  return (
    <div className="border-t border-slate-100 p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="rounded-2xl bg-blue-600 p-3 text-white shadow-lg shadow-blue-200">
          <MapPin size={22} />
        </span>

        <div>
          <h3 className="text-lg font-bold text-slate-900">
            Confirm service location
          </h3>

          <p className="text-sm text-slate-500">
            Add the exact house number, street, or landmark.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <PencilLine
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            value={editableAddress}
            onChange={(e) => onAddressChange(e.target.value)}
            placeholder="House number, street, barangay, landmark..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <button
          type="button"
          onClick={onConfirm}
          className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-blue-200 hover:bg-blue-700"
        >
          <Check size={18} />
          Confirm Location
        </button>
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 p-4">
        <p className="font-semibold text-slate-800">
          Selected address
        </p>

        <p className="mt-1 text-sm leading-6 text-slate-600">
          {selectedAddress ||
            "Search, use your current location, or click the map."}
        </p>

        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-white px-3 py-1.5">
            Latitude: {latitude.toFixed(6)}
          </span>

          <span className="rounded-full bg-white px-3 py-1.5">
            Longitude: {longitude.toFixed(6)}
          </span>
        </div>
      </div>
    </div>
  );
}