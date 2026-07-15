import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import CustomerLayout from "../../../layouts/CustomerLayout";
import { supabase } from "../../../lib/supabase";
import { hasReviewed } from "../../../services/reviewService";


export default function Bookings() {

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();


  useEffect(() => {

    let channel: any;

    async function initialize() {

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      await loadBookings();

      channel = supabase
        .channel("customer-bookings")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "bookings",
            filter: `customer_id=eq.${user.id}`,
          },
          () => {
            loadBookings();
          }
        )
        .subscribe();

    }

    initialize();

    return () => {

      if (channel) {
        supabase.removeChannel(channel);
      }

    };

  }, []);


  async function loadBookings() {

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {

      setLoading(false);
      return;

    }
    const { data, error } = await supabase
      .from("bookings")
      .select(
        `
        *,
        worker:profiles!bookings_worker_id_fkey(
          first_name,
          middle_name,
          last_name
        )
      `
      )
      .eq("customer_id", user.id)
      .order("created_at", {
        ascending: false,
      });


    if (!error && data) {

      const updated = await Promise.all(

        data.map(async (booking: any) => ({

          ...booking,

          reviewed: await hasReviewed(
            booking.id,
            user.id
          ),

        }))

      );


      setBookings(updated);

    }


    setLoading(false);

  }



  return (

    <CustomerLayout>

      <div className="space-y-6">

        <h1 className="text-3xl font-bold">
          My Bookings
        </h1>


        <div className="bg-white rounded-2xl shadow overflow-hidden">

          {loading ? (

            <div className="p-10 text-center">
              Loading...
            </div>


          ) : bookings.length === 0 ? (

            <div className="p-10 text-center text-gray-500">
              No bookings found.
            </div>


          ) : (

            <table className="w-full">

              <thead className="bg-slate-100">

                <tr>

                  <th className="p-4 text-left">
                    Worker
                  </th>


                  <th className="p-4 text-left">
                    Date
                  </th>


                  <th className="p-4 text-left">
                    Time
                  </th>


                  <th className="p-4 text-left">
                    Status
                  </th>


                  <th className="p-4 text-left">
                    Action
                  </th>

                </tr>

              </thead>


              <tbody>

                {bookings.map((booking) => (

                  <tr
                    key={booking.id}
                    className="border-t"
                  >

                    <td className="p-4">

                      {[
                        booking.worker?.first_name,
                        booking.worker?.middle_name,
                        booking.worker?.last_name,
                      ]
                        .filter(Boolean)
                        .join(" ")}

                    </td>


                    <td className="p-4">
                      {booking.booking_date}
                    </td>


                    <td className="p-4">
                      {booking.booking_time}
                    </td>


                    <td className="p-4">

                      <span
                        className={`px-3 py-1 rounded-full text-white text-sm ${
                          booking.status === "Pending"
                            ? "bg-yellow-500"
                            : booking.status === "Approved"
                            ? "bg-green-600"
                            : booking.status === "Completed"
                            ? "bg-blue-600"
                            : "bg-red-600"
                        }`}
                      >

                        {booking.status}

                      </span>

                    </td>
                                        <td className="p-4">

                      {booking.status === "Pending" && (

                        <span className="text-yellow-600 font-medium">
                          Waiting for worker approval...
                        </span>

                      )}


                      {booking.status === "Approved" && (

                        <button
                          onClick={() =>
                            navigate(
                              `/chat/${booking.id}`
                            )
                          }
                          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
                        >
                          Open Chat
                        </button>

                      )}


                      {booking.status === "Completed" &&
                        !booking.reviewed && (

                          <button
                            onClick={() =>
                              navigate(
                                `/customer/review/${booking.id}`
                              )
                            }
                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg"
                          >
                            Leave Review
                          </button>

                        )}


                      {booking.status === "Completed" &&
                        booking.reviewed && (

                          <span className="text-green-600 font-semibold">
                            ⭐ Review Submitted
                          </span>

                        )}


                      {booking.status === "Cancelled" && (

                        <span className="text-red-600 font-semibold">
                          Booking Cancelled
                        </span>

                      )}

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          )}

        </div>

      </div>

    </CustomerLayout>

  );

}