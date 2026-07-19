import {
  CircleCheck,
  Clock3,
  CircleX,
} from "lucide-react";

interface Props {
  status: string;
}

export default function BookingTimeline({
  status,
}: Props) {
  return (
    <div className="mt-8">

      <h3 className="text-lg font-bold mb-6">
        Booking Progress
      </h3>

      <div className="space-y-6">

        {/* Submitted */}

        <div className="flex items-center gap-4">

          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">

            <CircleCheck size={20} />

          </div>

          <div>

            <p className="font-semibold">
              Booking Submitted
            </p>

            <p className="text-gray-500 text-sm">
              Customer sent a booking request.
            </p>

          </div>

        </div>

        <div className="ml-5 h-8 border-l-2 border-gray-300"></div>

        {/* Pending */}

        <div className="flex items-center gap-4">

          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${
              status === "Pending"
                ? "bg-yellow-500"
                : status === "Approved" ||
                  status === "Completed"
                ? "bg-green-600"
                : "bg-red-600"
            }`}
          >

            {status === "Cancelled" ? (
              <CircleX size={20} />
            ) : (
              <Clock3 size={20} />
            )}

          </div>

          <div>

            <p className="font-semibold">
              Worker Response
            </p>

            <p className="text-gray-500 text-sm">

              {status === "Pending"
                ? "Waiting for approval."

                : status === "Approved"
                ? "Booking accepted."

                : status === "Completed"
                ? "Booking accepted."

                : "Booking rejected."}

            </p>

          </div>

        </div>

        {status !== "Cancelled" && (
          <>
            <div className="ml-5 h-8 border-l-2 border-gray-300"></div>

            {/* Completed */}

            <div className="flex items-center gap-4">

              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${
                  status === "Completed"
                    ? "bg-purple-600"
                    : "bg-gray-300"
                }`}
              >

                <CircleCheck size={20} />

              </div>

              <div>

                <p className="font-semibold">
                  Job Completed
                </p>

                <p className="text-gray-500 text-sm">

                  {status === "Completed"
                    ? "Worker completed the service."
                    : "Waiting for completion."}

                </p>

              </div>

            </div>
          </>
        )}

      </div>

    </div>
  );
}