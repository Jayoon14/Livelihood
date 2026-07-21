import QRUploader from "./QRUploader";

interface GCashSectionProps {
  values: {
    enable_gcash: boolean;
    gcash_name: string;
    gcash_number: string;
    gcash_qr: string;
  };

  onChange: (field: string, value: any) => void;
}

export default function GCashSection({ values, onChange }: GCashSectionProps) {
  return (
    <div className="bg-white rounded-2xl shadow border p-6 mt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">GCash</h2>

          <p className="text-gray-500 text-sm">
            Enable GCash payment for customers.
          </p>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={values.enable_gcash}
            onChange={(e) => onChange("enable_gcash", e.target.checked)}
          />
          Enable
        </label>
      </div>

      {values.enable_gcash && (
        <div className="mt-6 space-y-5">
          <div>
            <label className="block mb-2 font-medium">GCash Account Name</label>

            <input
              type="text"
              value={values.gcash_name}
              onChange={(e) => onChange("gcash_name", e.target.value)}
              placeholder="Juan Dela Cruz"
              className="w-full border rounded-xl p-3"
            />
          </div>

          <div>
            <label className="block mb-2 font-medium">GCash Number</label>

            <input
              type="text"
              maxLength={11}
              value={values.gcash_number}
              onChange={(e) => onChange("gcash_number", e.target.value)}
              placeholder="09XXXXXXXXX"
              className="w-full border rounded-xl p-3"
            />
          </div>

          <QRUploader
            label="GCash QR"
            folder="gcash"
            value={values.gcash_qr}
            onUploaded={(url) => onChange("gcash_qr", url)}
          />
        </div>
      )}
    </div>
  );
}
