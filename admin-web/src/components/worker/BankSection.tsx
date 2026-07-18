import QRUploader from "./QRUploader";

interface BankSectionProps {
  values: {
    enable_bank: boolean;
    bank_name: string;
    account_name: string;
    account_number: string;
    bank_qr: string;
  };

  onChange: (field: string, value: any) => void;
}

export default function BankSection({
  values,
  onChange,
}: BankSectionProps) {
  return (
    <div className="bg-white rounded-2xl shadow border p-6 mt-6">

      <div className="flex items-center justify-between">

        <div>
          <h2 className="text-xl font-semibold">
            Bank Transfer
          </h2>

          <p className="text-gray-500 text-sm">
            Enable bank transfer payments.
          </p>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">

          <input
            type="checkbox"
            checked={values.enable_bank}
            onChange={(e) =>
              onChange(
                "enable_bank",
                e.target.checked
              )
            }
          />

          Enable

        </label>

      </div>

      {values.enable_bank && (

        <div className="mt-6 space-y-5">

          <div>

            <label className="block mb-2 font-medium">
              Bank Name
            </label>

            <input
              type="text"
              value={values.bank_name}
              onChange={(e) =>
                onChange(
                  "bank_name",
                  e.target.value
                )
              }
              placeholder="BDO, BPI, Metrobank..."
              className="w-full border rounded-xl p-3"
            />

          </div>

          <div>

            <label className="block mb-2 font-medium">
              Account Name
            </label>

            <input
              type="text"
              value={values.account_name}
              onChange={(e) =>
                onChange(
                  "account_name",
                  e.target.value
                )
              }
              placeholder="Juan Dela Cruz"
              className="w-full border rounded-xl p-3"
            />

          </div>

          <div>

            <label className="block mb-2 font-medium">
              Account Number
            </label>

            <input
              type="text"
              value={values.account_number}
              onChange={(e) =>
                onChange(
                  "account_number",
                  e.target.value
                )
              }
              placeholder="123456789012"
              className="w-full border rounded-xl p-3"
            />

          </div>

          <QRUploader
            label="Bank QR (Optional)"
            folder="bank"
            value={values.bank_qr}
            onUploaded={(url) =>
              onChange("bank_qr", url)
            }
          />

        </div>

      )}

    </div>
  );
}