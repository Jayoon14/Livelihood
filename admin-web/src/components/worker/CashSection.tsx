interface CashSectionProps {
  acceptCash: boolean;
  onChange: (value: boolean) => void;
}

export default function CashSection({
  acceptCash,
  onChange,
}: CashSectionProps) {
  return (
    <div className="bg-white rounded-2xl shadow p-6 border">

      <div className="flex items-center justify-between">

        <div>
          <h2 className="text-xl font-semibold">
            Cash Payment
          </h2>

          <p className="text-gray-500 text-sm mt-1">
            Allow customers to pay you in cash.
          </p>
        </div>

        <label className="inline-flex items-center cursor-pointer">

          <input
            type="checkbox"
            checked={acceptCash}
            onChange={(e) => onChange(e.target.checked)}
            className="w-5 h-5"
          />

          <span className="ml-2 font-medium">
            Accept Cash
          </span>

        </label>

      </div>

      {acceptCash && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4">

          <p className="text-green-700 font-medium">
            ✅ Customers can choose Cash as their payment method.
          </p>

        </div>
      )}

      {!acceptCash && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">

          <p className="text-red-600 font-medium">
            ❌ Cash payments are disabled.
          </p>

        </div>
      )}

    </div>
  );
}