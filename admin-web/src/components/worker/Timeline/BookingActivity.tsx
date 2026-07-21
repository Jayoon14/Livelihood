import { CheckCircle2, Circle } from "lucide-react";

interface Props {
  booking: any;
}

export default function BookingActivity({ booking }: Props) {
  const activities = [
    {
      title: "Booking Submitted",
      done: true,
      date: booking.created_at,
    },
    {
      title: "Worker Approved",
      done: booking.status === "Approved" || booking.status === "Completed",
      date: booking.updated_at,
    },
    {
      title: "Job Completed",
      done: booking.status === "Completed",
      date: booking.updated_at,
    },
  ];

  return (
    <div className="bg-white border rounded-2xl p-6">
      <h3 className="text-xl font-bold mb-6">Booking Activity</h3>

      <div className="space-y-6">
        {activities.map((item, index) => (
          <div key={item.title} className="flex gap-4">
            <div className="flex flex-col items-center">
              {item.done ? (
                <CheckCircle2 size={24} className="text-green-600" />
              ) : (
                <Circle size={24} className="text-gray-300" />
              )}

              {index !== activities.length - 1 && (
                <div className="w-[2px] flex-1 bg-gray-300 mt-1" />
              )}
            </div>

            <div>
              <h4 className="font-semibold">{item.title}</h4>

              <p className="text-gray-500 text-sm">
                {item.done
                  ? new Date(item.date).toLocaleString()
                  : "Waiting..."}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
