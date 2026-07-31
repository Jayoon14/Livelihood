import { CheckCircle2, MapPin, Pencil, LockKeyhole } from "lucide-react";

interface Props {
  editableAddress: string;
  selectedAddress: string;
  latitude: number;
  longitude: number;
  confirmed: boolean;

  onAddressChange: (value: string) => void;
  onConfirm: () => void;
  onChangeLocation: () => void;
}

export default function LocationConfirmSection({
  editableAddress,
  selectedAddress,
  latitude,
  longitude,
  confirmed,
  onAddressChange,
  onConfirm,
  onChangeLocation,
}: Props) {
  const hasValidCoordinates =
    Number.isFinite(latitude) && Number.isFinite(longitude);

  const canConfirm =
    hasValidCoordinates && Boolean(editableAddress.trim() || selectedAddress.trim());

  return (
    <section className="border-t border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              confirmed
                ? "bg-emerald-600 text-white"
                : "bg-blue-600 text-white"
            }`}
          >
            {confirmed ? <LockKeyhole size={18} /> : <MapPin size={18} />}
          </span>

          <div className="min-w-0">
            <h3 className="font-extrabold text-slate-950">
              {confirmed
                ? "Service location confirmed"
                : "Confirm service location"}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {confirmed
                ? "This exact customer location is locked and will be used for the booking."
                : "Confirm first before continuing. Add the exact house number, street, or landmark."}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Pencil
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={editableAddress}
              onChange={(event) => onAddressChange(event.target.value)}
              disabled={confirmed}
              placeholder="Enter the exact service address or landmark"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-emerald-50 disabled:text-emerald-800"
            />
          </div>

          {confirmed ? (
            <button
              type="button"
              onClick={onChangeLocation}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-5 text-sm font-bold text-blue-700 transition hover:bg-blue-50"
            >
              <Pencil size={16} />
              Change Location
            </button>
          ) : (
            <button
              type="button"
              onClick={onConfirm}
              disabled={!canConfirm}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            >
              <CheckCircle2 size={17} />
              Confirm Location
            </button>
          )}
        </div>

        <div
          className={`rounded-xl border px-4 py-3 ${
            confirmed
              ? "border-emerald-200 bg-emerald-50"
              : "border-slate-200 bg-slate-50"
          }`}
        >
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {confirmed ? "Locked customer address" : "Selected address"}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-800">
            {selectedAddress || editableAddress || "No location selected yet."}
          </p>

          {hasValidCoordinates && (
            <p className="mt-1 text-xs text-slate-500">
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
