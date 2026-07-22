import { Banknote, CheckCircle2, Info, XCircle } from "lucide-react";

interface CashSectionProps {
  acceptCash: boolean;
  onChange: (value: boolean) => void;
}

export default function CashSection({
  acceptCash,
  onChange,
}: CashSectionProps) {
  return (
    <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      {/* HEADER */}

      <div className="flex flex-col gap-5 border-b border-gray-100 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <CashLogo />

          <div>
            <h2 className="text-xl font-bold text-gray-900">Cash Payment</h2>

            <p className="mt-1 text-sm leading-6 text-gray-500">
              Allow customers to pay you directly in cash after the service.
            </p>
          </div>
        </div>

        {/* SLIDE TOGGLE */}

        <label className="inline-flex cursor-pointer items-center gap-3">
          <span className="text-sm font-semibold text-gray-600">
            {acceptCash ? "Enabled" : "Disabled"}
          </span>

          <input
            type="checkbox"
            checked={acceptCash}
            onChange={(event) => onChange(event.target.checked)}
            className="peer sr-only"
          />

          <span className="relative h-8 w-14 rounded-full bg-gray-300 transition peer-checked:bg-emerald-500 peer-focus-visible:ring-4 peer-focus-visible:ring-emerald-100">
            <span className="absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-6" />
          </span>
        </label>
      </div>

      {/* STATUS CONTENT */}

      <div className="p-6">
        {acceptCash ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <CheckCircle2 size={22} />
              </div>

              <div>
                <h3 className="font-bold text-emerald-900">
                  Cash payment is enabled
                </h3>

                <p className="mt-1 text-sm leading-6 text-emerald-700">
                  Customers can select Cash as their payment method. Make sure
                  to confirm the payment before marking the booking as fully
                  paid.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <XCircle size={22} />
              </div>

              <div>
                <h3 className="font-bold text-red-900">
                  Cash payment is disabled
                </h3>

                <p className="mt-1 text-sm leading-6 text-red-700">
                  Customers will not see Cash as an available payment option.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-blue-600">
              <Info size={18} />
            </div>

            <p className="text-sm leading-6 text-blue-700">
              Cash payments do not require an account number or QR code. You
              only need to enable this method and confirm the payment once it is
              received.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==========================
   CASH LOGO
========================== */

function CashLogo() {
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
      <Banknote size={28} />
    </div>
  );
}
