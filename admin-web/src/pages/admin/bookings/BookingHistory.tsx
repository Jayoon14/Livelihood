import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

import AdminLayout from "../../../layouts/AdminLayout";
import { getBookingById } from "../../../services/bookingService";

export default function BookingHistory() {
  const { id } = useParams();

  const [booking, setBooking] = useState<any>(null);

  useEffect(() => {
    loadBooking();
  }, []);

  async function loadBooking() {
    if (!id) return;

    const data = await getBookingById(Number(id));
    setBooking(data);
  }

  if (!booking) {
    return (
      <AdminLayout>
        <div className="p-8">Loading...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <Link to="/bookings" className="text-blue-600 hover:underline">
          ← Back to Bookings
        </Link>

        <div className="bg-white rounded-xl shadow mt-6 p-8">
          <h1 className="text-3xl font-bold mb-8">Booking Details</h1>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-gray-500">Customer</p>
              <p className="font-semibold">
                {booking.customer?.first_name} {booking.customer?.last_name}
              </p>
            </div>

            <div>
              <p className="text-gray-500">Worker</p>
              <p className="font-semibold">
                {booking.worker?.first_name} {booking.worker?.last_name}
              </p>
            </div>

            <div>
              <p className="text-gray-500">Booking Date</p>
              <p>{booking.booking_date}</p>
            </div>

            <div>
              <p className="text-gray-500">Booking Time</p>
              <p>{booking.booking_time}</p>
            </div>

            <div>
              <p className="text-gray-500">Status</p>
              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700">
                {booking.status}
              </span>
            </div>

            <div>
              <p className="text-gray-500">Service</p>
              <p>{booking.service_name}</p>
            </div>

            <div className="col-span-2">
              <p className="text-gray-500">Address</p>
              <p>{booking.address}</p>
            </div>

            <div className="col-span-2">
              <p className="text-gray-500">Notes</p>
              <p>{booking.notes || "No notes"}</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
