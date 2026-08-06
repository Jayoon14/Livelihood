import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { Link } from "react-router-dom";
import {
  Briefcase,
  Calendar,
  Clock,
  User,
} from "lucide-react";

import { useProfile } from "../../context/ProfileContextValue";
import {
  getUpcomingBooking,
  type UpcomingBooking,
} from "../../services/bookingReminderService";

export default function UpcomingBookingCard() {
  const { profile } = useProfile();

  const [booking, setBooking] =
    useState<UpcomingBooking | null>(null);

  const loadBooking = useCallback(async () => {
    if (!profile?.id) {
      setBooking(null);
      return;
    }

    const data = await getUpcomingBooking(
      profile.id,
    );

    setBooking(data);
  }, [profile]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadBooking();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadBooking]);

  return (
    <div className="rounded-2xl bg-white p-6 shadow">
      <h2 className="mb-5 text-xl font-bold">
        Upcoming Booking
      </h2>

      {!booking ? (
        <p className="text-gray-500">
          No upcoming bookings.
        </p>
      ) : (
        <>
          <div className="space-y-3">
            <p className="flex items-center gap-2">
              <Calendar size={18} />
              {booking.booking_date}
            </p>

            <p className="flex items-center gap-2">
              <Clock size={18} />
              {booking.booking_time ||
                "Time to be confirmed"}
            </p>

            <p className="flex items-center gap-2">
              <User size={18} />
              {booking.worker
                ? [
                    booking.worker.first_name,
                    booking.worker.last_name,
                  ]
                    .filter(Boolean)
                    .join(" ") || "Assigned worker"
                : "Worker to be assigned"}
            </p>

            <p className="flex items-center gap-2">
              <Briefcase size={18} />
              {booking.service?.service_name ||
                "Selected service"}
            </p>

            <span className="mt-2 inline-block rounded-full bg-blue-100 px-3 py-1 text-blue-700">
              {booking.status}
            </span>
          </div>

          <Link
            to={`/customer/bookings/${booking.id}`}
            className="mt-6 block rounded-xl bg-blue-600 py-3 text-center text-white hover:bg-blue-700"
          >
            View Booking
          </Link>
        </>
      )}
    </div>
  );
}
