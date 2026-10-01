import { CheckCircle2, Circle } from "lucide-react";

interface BookingTimeline {
  created_at?: string | null;
  accepted_at?: string | null;
  trip_started_at?: string | null;
  completed_at?: string | null;
  status?: string | null;
}

interface Props {
  booking: BookingTimeline;
}

function formatActivityDate(value?: string | null): string {
  if (!value) return "Waiting...";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Waiting...";
  return date.toLocaleString("en-PH");
}

export default function BookingActivity({ booking }: Props) {
  const status = booking.status ?? "Pending";
  const approved = [
    "Approved",
    "On Going",
    "Waiting Customer Confirmation",
    "Completed",
  ].includes(status);
  const started = ["On Going", "Waiting Customer Confirmation", "Completed"].includes(status);
  const completed = ["Waiting Customer Confirmation", "Completed"].includes(status);
  const cancelled = status === "Cancelled";

  const activities = [
    {
      title: "Booking Submitted",
      done: Boolean(booking.created_at),
      date: booking.created_at,
    },
    {
      title: cancelled ? "Worker Cancelled" : "Worker Approved",
      done: cancelled || approved,
      date: cancelled ? booking.completed_at : booking.accepted_at,
    },
    {
      title: "Booking Started",
      done: started,
      date: booking.trip_started_at,
    },
    {
      title: "Job Completed",
      done: completed,
      date: booking.completed_at,
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900 sm:p-6">
      <h3 className="mb-6 text-xl font-bold text-slate-900 dark:text-white">Booking Activity</h3>
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
                <div className="mt-1 w-0.5 flex-1 bg-gray-300 dark:bg-slate-700" />
              )}
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white">{item.title}</h4>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {item.done ? formatActivityDate(item.date) : "Waiting..."}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
