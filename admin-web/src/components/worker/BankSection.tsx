import { Building2, CreditCard, ShieldCheck } from "lucide-react";

import QRUploader from "./QRUploader";

interface BankSectionProps {
  values: {
    enable_bank: boolean;
    bank_name: string;
    account_name: string;

    // Existing database field.
    // Gagamitin muna natin ito bilang card number.
    account_number: string;

    card_expiration: string;
    bank_qr: string;
  };

  onChange: (field: string, value: boolean | string) => void;
}

export default function BankSection({
  values,
  onChange,
}: BankSectionProps) {
  function formatCardNumber(value: string) {
    const digitsOnly = value.replace(/\D/g, "").slice(0, 19);

    return digitsOnly
      .replace(/(.{4})/g, "$1 ")
      .trim();
  }

  function formatExpiration(value: string) {
    const digitsOnly = value.replace(/\D/g, "").slice(0, 4);

    if (digitsOnly.length <= 2) {
      return digitsOnly;
    }

    return `${digitsOnly.slice(0, 2)} / ${digitsOnly.slice(2)}`;
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      {/* HEADER */}

      <div className="flex flex-col gap-5 border-b border-gray-100 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Building2 size={27} />
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Bank Transfer
            </h2>

            <p className="mt-1 text-sm leading-6 text-gray-500">
              Receive payments directly through your bank or supported card.
            </p>
          </div>
        </div>

        {/* CUSTOM TOGGLE */}

        <label className="inline-flex cursor-pointer items-center gap-3">
          <span className="text-sm font-semibold text-gray-600">
            {values.enable_bank ? "Enabled" : "Disabled"}
          </span>

          <input
            type="checkbox"
            checked={values.enable_bank}
            onChange={(event) =>
              onChange("enable_bank", event.target.checked)
            }
            className="peer sr-only"
          />

          <span className="relative h-8 w-14 rounded-full bg-gray-300 transition peer-checked:bg-blue-600 peer-focus-visible:ring-4 peer-focus-visible:ring-blue-100">
            <span className="absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-6" />
          </span>
        </label>
      </div>

      {values.enable_bank && (
        <div className="p-6">
          <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-5 sm:p-6">
            <div className="grid gap-5">
              {/* BANK NAME */}

              <div>
                <label
                  htmlFor="bank-name"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Bank Name
                </label>

                <select
                  id="bank-name"
                  value={values.bank_name}
                  onChange={(event) =>
                    onChange("bank_name", event.target.value)
                  }
                  className="h-14 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm font-medium text-gray-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="">Select your bank</option>
                  <option value="BDO">BDO</option>
                  <option value="BPI">BPI</option>
                  <option value="Metrobank">Metrobank</option>
                  <option value="UnionBank">UnionBank</option>
                  <option value="LandBank">LandBank</option>
                  <option value="Security Bank">
                    Security Bank
                  </option>
                  <option value="PNB">PNB</option>
                  <option value="RCBC">RCBC</option>
                  <option value="Other">Other Bank</option>
                </select>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                {/* ACCOUNT NAME */}

                <div>
                  <label
                    htmlFor="bank-account-name"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Account Name
                  </label>

                  <input
                    id="bank-account-name"
                    type="text"
                    autoComplete="name"
                    value={values.account_name}
                    onChange={(event) =>
                      onChange("account_name", event.target.value)
                    }
                    placeholder="Enter account name"
                    className="h-14 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm font-medium text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                {/* CARD NUMBER */}

                <div>
                  <label
                    htmlFor="bank-card-number"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Card Number
                  </label>

                  <div className="relative">
                    <input
                      id="bank-card-number"
                      type="text"
                      inputMode="numeric"
                      autoComplete="cc-number"
                      value={values.account_number}
                      onChange={(event) =>
                        onChange(
                          "account_number",
                          formatCardNumber(event.target.value),
                        )
                      }
                      placeholder="Enter card number"
                      className="h-14 w-full rounded-xl border border-gray-300 bg-white px-4 pr-[205px] text-sm font-medium tracking-wide text-gray-800 outline-none transition placeholder:tracking-normal placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />

                    <div className="absolute inset-y-0 right-3 hidden items-center gap-1.5 sm:flex">
                      <MastercardLogo />
                      <VisaLogo />
                      <AmexLogo />
                      <JcbLogo />
                    </div>
                  </div>

                  {/* MOBILE CARD LOGOS */}

                  <div className="mt-3 flex items-center gap-2 sm:hidden">
                    <MastercardLogo />
                    <VisaLogo />
                    <AmexLogo />
                    <JcbLogo />
                  </div>
                </div>

                {/* EXPIRATION DATE */}

                <div>
                  <label
                    htmlFor="card-expiration"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Expiration Date
                  </label>

                  <input
                    id="card-expiration"
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    value={values.card_expiration}
                    onChange={(event) =>
                      onChange(
                        "card_expiration",
                        formatExpiration(event.target.value),
                      )
                    }
                    placeholder="MM / YY"
                    className="h-14 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm font-medium tracking-wide text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                {/* SECURITY CODE */}

                <div>
                  <label
                    htmlFor="card-security-code"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Security Code
                  </label>

                  <div className="relative">
                    <input
                      id="card-security-code"
                      type="text"
                      value=""
                      disabled
                      placeholder="Handled by payment gateway"
                      className="h-14 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-100 px-4 pr-14 text-sm font-medium text-gray-500 outline-none"
                    />

                    <div className="absolute inset-y-0 right-4 flex items-center text-gray-400">
                      <CreditCard size={23} />
                    </div>
                  </div>

                  <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-gray-500">
                    <ShieldCheck
                      size={14}
                      className="mt-0.5 shrink-0 text-emerald-600"
                    />

                    Security codes must never be stored in the database.
                  </p>
                </div>
              </div>

              {/* QR UPLOADER */}

              <div className="pt-2">
                <QRUploader
                  label="Bank QR Code (Optional)"
                  folder="bank"
                  value={values.bank_qr}
                  onUploaded={(url) =>
                    onChange("bank_qr", url)
                  }
                  onRemove={() =>
                  onChange("bank_qr", "")
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
   CARD LOGOS
========================== */

function MastercardLogo() {
  return (
    <div
      title="Mastercard"
      className="flex h-7 w-11 items-center justify-center rounded bg-slate-900"
    >
      <div className="flex -space-x-1.5">
        <span className="h-4 w-4 rounded-full bg-red-500" />
        <span className="h-4 w-4 rounded-full bg-amber-400 opacity-95" />
      </div>
    </div>
  );
}

function VisaLogo() {
  return (
    <div
      title="Visa"
      className="flex h-7 w-11 items-center justify-center rounded bg-blue-700 px-1"
    >
      <span className="text-[10px] font-black italic tracking-tight text-white">
        VISA
      </span>
    </div>
  );
}

function AmexLogo() {
  return (
    <div
      title="American Express"
      className="flex h-7 w-11 items-center justify-center rounded bg-sky-500 px-1"
    >
      <span className="text-[8px] font-black tracking-tighter text-white">
        AMEX
      </span>
    </div>
  );
}

function JcbLogo() {
  return (
    <div
      title="JCB"
      className="flex h-7 w-11 items-center justify-center overflow-hidden rounded bg-white shadow-sm ring-1 ring-gray-200"
    >
      <span className="flex h-full w-1/3 items-center justify-center bg-sky-600 text-[8px] font-black text-white">
        J
      </span>

      <span className="flex h-full w-1/3 items-center justify-center bg-red-500 text-[8px] font-black text-white">
        C
      </span>

      <span className="flex h-full w-1/3 items-center justify-center bg-green-500 text-[8px] font-black text-white">
        B
      </span>
    </div>
  );
}