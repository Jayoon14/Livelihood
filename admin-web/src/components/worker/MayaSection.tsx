import { Smartphone } from "lucide-react";

import QRUploader from "./QRUploader";

interface MayaSectionProps {
  values: {
    enable_maya: boolean;
    maya_name: string;
    maya_number: string;
    maya_qr: string;
  };

  onChange: (
    field: string,
    value: boolean | string,
  ) => void;
}

export default function MayaSection({
  values,
  onChange,
}: MayaSectionProps) {
  function formatMayaNumber(value: string) {
    return value.replace(/\D/g, "").slice(0, 11);
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      {/* HEADER */}

      <div className="flex flex-col gap-5 border-b border-gray-100 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <MayaLogo />

          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Maya
            </h2>

            <p className="mt-1 text-sm leading-6 text-gray-500">
              Receive customer payments directly through your Maya account.
            </p>
          </div>
        </div>

        {/* SLIDE TOGGLE */}

        <label className="inline-flex cursor-pointer items-center gap-3">
          <span className="text-sm font-semibold text-gray-600">
            {values.enable_maya ? "Enabled" : "Disabled"}
          </span>

          <input
            type="checkbox"
            checked={values.enable_maya}
            onChange={(event) =>
              onChange("enable_maya", event.target.checked)
            }
            className="peer sr-only"
          />

          <span className="relative h-8 w-14 rounded-full bg-gray-300 transition peer-checked:bg-green-500 peer-focus-visible:ring-4 peer-focus-visible:ring-green-100">
            <span className="absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-6" />
          </span>
        </label>
      </div>

      {values.enable_maya && (
        <div className="p-6">
          <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
            <div className="grid gap-5 lg:grid-cols-2">
              {/* ACCOUNT NAME */}

              <div>
                <label
                  htmlFor="maya-account-name"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Maya Account Name
                </label>

                <input
                  id="maya-account-name"
                  type="text"
                  autoComplete="name"
                  value={values.maya_name}
                  onChange={(event) =>
                    onChange("maya_name", event.target.value)
                  }
                  placeholder="Enter account name"
                  className="h-14 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm font-medium text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-green-500 focus:ring-4 focus:ring-green-100"
                />
              </div>

              {/* MAYA NUMBER */}

              <div>
                <label
                  htmlFor="maya-number"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Maya Mobile Number
                </label>

                <div className="relative">
                  <input
                    id="maya-number"
                    type="text"
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={11}
                    value={values.maya_number}
                    onChange={(event) =>
                      onChange(
                        "maya_number",
                        formatMayaNumber(event.target.value),
                      )
                    }
                    placeholder="09XXXXXXXXX"
                    className="h-14 w-full rounded-xl border border-gray-300 bg-white px-4 pr-14 text-sm font-medium tracking-wide text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-green-500 focus:ring-4 focus:ring-green-100"
                  />

                  <div className="absolute inset-y-0 right-4 flex items-center text-green-600">
                    <Smartphone size={21} />
                  </div>
                </div>

                <p className="mt-2 text-xs text-gray-500">
                  Enter the 11-digit mobile number registered with Maya.
                </p>
              </div>

              {/* QR */}

              <div className="lg:col-span-2">
                <QRUploader
                  label="Maya QR Code"
                  folder="maya"
                  value={values.maya_qr}
                  onUploaded={(url) =>
                    onChange("maya_qr", url)
                  }
                  onRemove={() =>
                    onChange("maya_qr", "")
                  }
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ==========================
   MAYA LOGO
========================== */

function MayaLogo() {
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-green-50">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 shadow-sm">
        <span className="text-lg font-black text-white">
          M
        </span>
      </div>
    </div>
  );
}