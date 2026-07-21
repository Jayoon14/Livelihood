import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, User, Briefcase } from "lucide-react";

import { useProfile } from "../../context/ProfileContext";
import { getUpcomingBooking } from "../../services/bookingReminderService";

export default function UpcomingBookingCard() {
  const { profile } = useProfile();

  const [booking, setBooking] = useState<any>(null);

  useEffect(() => {
    loadBooking();
  }, [profile]);

  async function loadBooking() {
    if (!profile) return;

    const data = await getUpcomingBooking(profile.id);

    setBooking(data);
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-xl font-bold mb-5">Upcoming Booking</h2>

      {!booking ? (
        <p className="text-gray-500">No upcoming bookings.</p>
      ) : (
        <>
          <div className="space-y-3">
            <p className="flex items-center gap-2">
              <Calendar size={18} />
              {booking.booking_date}
            </p>

            <p className="flex items-center gap-2">
              <Clock size={18} />
              {booking.booking_time}
            </p>

            <p className="flex items-center gap-2">
              <User size={18} />
              {booking.worker.first_name} {booking.worker.last_name}
            </p>

            <p className="flex items-center gap-2">
              <Briefcase size={18} />
              {booking.service.service_name}
            </p>

            <span className="inline-block mt-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700">
              {booking.status}
            </span>
          </div>

          <Link
            to={`/customer/bookings/${booking.id}`}
            className="block mt-6 text-center bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700"
          >
            View Booking
          </Link>
        </>
      )}
    </div>
  );
}
