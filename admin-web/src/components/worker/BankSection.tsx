import {
  Building2,
  Landmark,
  ShieldCheck,
} from "lucide-react";

import QRUploader from "./QRUploader";

interface BankSectionProps {
  values: {
    enable_bank: boolean;
    bank_name: string;
    account_name: string;
    account_number: string;
    card_expiration: string;
    bank_qr: string;
  };
  onChange: (
    field: string,
    value: boolean | string,
  ) => void;
}

const BANKS = [
  "BDO",
  "BPI",
  "Metrobank",
  "UnionBank",
  "LandBank",
  "Security Bank",
  "PNB",
  "RCBC",
  "China Bank",
  "EastWest Bank",
  "DBP",
  "Other",
];

function formatAccountNumber(
  value: string,
): string {
  return value
    .replace(/[^A-Za-z0-9-]/g, "")
    .slice(0, 34);
}

export default function BankSection({
  values,
  onChange,
}: BankSectionProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:rounded-3xl dark:border-slate-700 dark:bg-slate-900">
      <header className="flex flex-col gap-5 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-6 dark:border-slate-800">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
            <Building2 className="h-7 w-7" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Bank Transfer
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Receive payments through your bank
              account. Do not enter debit or credit
              card details.
            </p>
          </div>
        </div>

        <label className="inline-flex cursor-pointer items-center gap-3">
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            {values.enable_bank
              ? "Enabled"
              : "Disabled"}
          </span>

          <input
            type="checkbox"
            checked={values.enable_bank}
            onChange={(event) =>
              onChange(
                "enable_bank",
                event.target.checked,
              )
            }
            className="peer sr-only"
          />

          <span className="relative h-8 w-14 rounded-full bg-slate-300 transition peer-checked:bg-blue-600 peer-focus-visible:ring-4 peer-focus-visible:ring-blue-100 dark:bg-slate-700 dark:peer-focus-visible:ring-blue-950">
            <span className="absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-6" />
          </span>
        </label>
      </header>

      {values.enable_bank && (
        <div className="p-5 sm:p-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-6 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="grid gap-5 lg:grid-cols-2">
              <Field label="Bank Name">
                <select
                  value={values.bank_name}
                  onChange={(event) =>
                    onChange(
                      "bank_name",
                      event.target.value,
                    )
                  }
                  className={inputClassName}
                >
                  <option value="">
                    Select your bank
                  </option>

                  {BANKS.map((bank) => (
                    <option
                      key={bank}
                      value={bank}
                    >
                      {bank === "Other"
                        ? "Other Bank"
                        : bank}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Account Name">
                <input
                  type="text"
                  autoComplete="name"
                  value={values.account_name}
                  onChange={(event) =>
                    onChange(
                      "account_name",
                      event.target.value,
                    )
                  }
                  placeholder="Name registered with the bank"
                  className={inputClassName}
                />
              </Field>

              <Field
                label="Bank Account Number"
                help="Enter the bank account number only. Do not enter a card number, CVV, PIN, or one-time password."
              >
                <div className="relative">
                  <input
                    type="text"
                    inputMode="text"
                    autoComplete="off"
                    value={values.account_number}
                    onChange={(event) =>
                      onChange(
                        "account_number",
                        formatAccountNumber(
                          event.target.value,
                        ),
                      )
                    }
                    placeholder="Enter account number"
                    className={`${inputClassName} pr-12`}
                  />

                  <Landmark className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-500" />
                </div>
              </Field>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />

                  <p className="leading-6">
                    LivelihoodGo should never collect
                    or store card expiration dates,
                    CVVs, PINs, or OTPs in this form.
                  </p>
                </div>
              </div>

              <div className="lg:col-span-2">
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

const inputClassName =
  "h-14 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-950";

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
        {label}
      </span>

      {children}

      {help && (
        <span className="mt-2 block text-xs leading-5 text-slate-500 dark:text-slate-400">
          {help}
        </span>
      )}
    </label>
  );
}
