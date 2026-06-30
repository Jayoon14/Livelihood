import { useEffect, useState } from "react";
import WorkerLayout from "../../../layouts/WorkerLayout";
import { getWorkerBookings } from "../../../services/workerBookingService";
import { supabase } from "../../../lib/supabase";

export default function Dashboard() {
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const data = await getWorkerBookings(user.id);

    setBookings(data);
  }

  return (
    <WorkerLayout>

      <h1 className="text-3xl font-bold mb-8">
        Incoming Bookings
      </h1>

      <div className="bg-white rounded-2xl shadow p-6">

        <table className="w-full">

          <thead>

            <tr className="border-b">

              <th className="text-left p-3">
                Date
              </th>

              <th className="text-left p-3">
                Time
              </th>

              <th className="text-left p-3">
                Address
              </th>

              <th className="text-left p-3">
                Status
              </th>

            </tr>

          </thead>

          <tbody>

            {bookings.map((booking)=>(

              <tr
                key={booking.id}
                className="border-b"
              >

                <td className="p-3">
                  {booking.booking_date}
                </td>

                <td className="p-3">
                  {booking.booking_time}
                </td>

                <td className="p-3">
                  {booking.address}
                </td>

                <td className="p-3">
                  {booking.status}
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </WorkerLayout>
  );
}