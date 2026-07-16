interface Props {
  status: string;
}

export default function BookingTimeline({
  status,
}: Props) {
  const steps = [
    "Pending",
    "Approved",
    "On Going",
    "Completed",
  ];

  if (status === "Cancelled") {
    return (
      <div className="space-y-3">

        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center">
            ✓
          </div>
          <span>Pending</span>
        </div>

        <div className="ml-3 h-6 border-l-2 border-red-500"></div>

        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center">
            ✕
          </div>

          <span className="text-red-600 font-semibold">
            Cancelled
          </span>
        </div>

      </div>
    );
  }

  const current = steps.indexOf(status);

  return (
    <div className="space-y-3">

      {steps.map((step, index) => (

        <div key={step}>

          <div className="flex items-center gap-3">

            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-white
              ${
                index <= current
                  ? "bg-green-600"
                  : "bg-gray-300"
              }`}
            >
              {index <= current ? "✓" : ""}
            </div>

            <span
              className={
                index <= current
                  ? "font-semibold"
                  : "text-gray-400"
              }
            >
              {step}
            </span>

          </div>

          {index !== steps.length - 1 && (
            <div className="ml-3 h-6 border-l-2 border-gray-300"></div>
          )}

        </div>

      ))}

    </div>
  );
}

