interface Props {
  status: string;
}

export default function BookingTimeline({ status }: Props) {
  const steps = [
    "Pending",
    "Approved",
    "On Going",
    "Completed",
  ];

  if (status === "Cancelled") {
    return (
      <div className="relative">
        <div className="absolute left-5 top-5 h-16 w-[3px] bg-red-300" />

        <div className="space-y-8">
          <div className="flex gap-4">
            <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-green-600 font-bold text-white shadow-md">
              ✓
            </div>

            <div>
              <p className="font-semibold">Pending</p>
              <p className="text-sm text-gray-500">
                Booking request submitted.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-red-600 font-bold text-white shadow-md">
              ✕
            </div>

            <div>
              <p className="font-semibold text-red-600">
                Cancelled
              </p>

              <p className="text-sm text-gray-500">
                This booking has been cancelled.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const current = steps.indexOf(status);

  return (
    <div>
      {/* Timeline */}
      <div className="space-y-8">
        {steps.map((step, index) => (
          <div
            key={step}
            className="relative flex gap-4"
          >
            {/* Vertical Line */}
            {index !== steps.length - 1 && (
              <div
                className={`absolute left-5 top-10 h-12 -translate-x-1/2 w-[3px] ${
                  index < current
                    ? "bg-green-600"
                    : "bg-gray-300"
                }`}
              />
            )}

            {/* Circle */}
            <div
              className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full font-bold shadow-md transition-all duration-300 ${
                index <= current
                  ? "bg-green-600 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {index <= current ? "✓" : ""}
            </div>

            {/* Content */}
            <div>
              <h4
                className={`font-semibold ${
                  index <= current
                    ? "text-gray-900"
                    : "text-gray-400"
                }`}
              >
                {step}
              </h4>

              <p className="mt-1 text-sm text-gray-500">
                {step === "Pending" &&
                  "Booking request submitted."}

                {step === "Approved" &&
                  "Worker accepted the booking."}

                {step === "On Going" &&
                  "Worker is currently providing the service."}

                {step === "Completed" &&
                  "Service has been completed successfully."}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ETA Card */}
      {(status === "Approved" ||
        status === "On Going") && (
        <div className="mt-10 rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
          <p className="text-sm text-gray-500">
            Estimated Completion
          </p>

          <h3 className="mt-2 text-3xl font-bold text-blue-700">
            Today
          </h3>

          <p className="mt-1 text-gray-600">
            4:00 PM
          </p>
        </div>
      )}

      {/* Success Card */}
      {status === "Completed" && (
        <div className="mt-10 rounded-3xl border border-green-100 bg-gradient-to-r from-green-50 to-emerald-50 p-6">
          <p className="text-sm text-gray-500">
            Service Status
          </p>

          <h3 className="mt-2 text-2xl font-bold text-green-700">
            Completed Successfully
          </h3>

          <p className="mt-1 text-gray-600">
            Thank you for choosing our service.
          </p>
        </div>
      )}
    </div>
  );
}