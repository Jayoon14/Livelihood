import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import CustomerLayout from "../../../layouts/CustomerLayout";
import { supabase } from "../../../lib/supabase";
import { hasReviewed } from "../../../services/reviewService";
import { cancelBooking } from "../../../services/bookingService";
import BookingTimeline from "../../../components/customer/BookingTimeline";


export default function Bookings() {

  const [bookings, setBookings] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Newest");
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
    channel.unsubscribe();
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
         const filteredBookings = [...bookings]
        .filter((booking: any) => {
          const workerName = [
            booking.worker?.first_name,
            booking.worker?.middle_name,
            booking.worker?.last_name,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          const matchesSearch =
            workerName.includes(search.toLowerCase()) ||
            booking.status.toLowerCase().includes(search.toLowerCase());

          const matchesStatus =
            statusFilter === "All" ||
            booking.status === statusFilter;

          return matchesSearch && matchesStatus;
        })
        .sort((a: any, b: any) => {
          switch (sortBy) {
            case "Oldest":
              return (
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime()
              );

            case "Upcoming":
              return (
                new Date(a.booking_date).getTime() -
                new Date(b.booking_date).getTime()
              );

            case "Completed":
              if (a.status === "Completed" && b.status !== "Completed") return -1;
              if (a.status !== "Completed" && b.status === "Completed") return 1;
              return 0;

            default:
              return (
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
              );
          }
        });
      async function handleCancel(id: number) {
      const confirmCancel = window.confirm(
        "Are you sure you want to cancel this booking?"
      );

      if (!confirmCancel) return;

      try {

        await cancelBooking(id);

        alert("Booking cancelled successfully.");

        loadBookings();

      } catch (error) {

        console.error(error);

        alert("Unable to cancel booking.");

      }

    }

  return (
    

    <CustomerLayout>

      <div className="space-y-6">

        <h1 className="text-3xl font-bold">
          My Bookings ({bookings.length})
        </h1>

        <div className="flex justify-between items-center mb-5">

            <h2 className="text-xl font-semibold">
              Manage Bookings
            </h2>

            <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search booking..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border rounded-lg px-4 py-2 w-64"
            />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded-lg px-4 py-2"
>
                <option>All</option>
                <option>Pending</option>
                <option>Approved</option>
                <option>Completed</option>
                <option>Cancelled</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border rounded-lg px-4 py-2"
              >
                <option>Newest</option>
                <option>Oldest</option>
                <option>Upcoming</option>
                <option>Completed</option>
              </select>

            </div>

          </div>

        <div className="bg-white rounded-2xl shadow overflow-hidden">

          {loading ? (

            <div className="p-10 text-center">
              Loading...
            </div>


          ) : filteredBookings.length === 0 ? (

            <div className="p-10 text-center">

              <div className="text-6xl">
                📅
              </div>

              <h2 className="text-2xl font-bold mt-4">
                You don't have any bookings yet.
              </h2>

              <p className="text-gray-500 mt-2">
                Start by finding a worker and booking a service.
              </p>

              <button
                onClick={() => navigate("/customer/workers")}
                className="mt-5 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl"
              >
                Find Workers
              </button>

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

                {filteredBookings.map((booking) => (

                  <tr
                    key={booking.id}
                    className="border-t"
                  >

                  <td className="p-4">

                    <button
                      onClick={() =>
                        navigate(`/customer/worker/${booking.worker_id}`)
                      }
                      className="text-blue-600 hover:underline"
                    >

                      {[
                        booking.worker?.first_name,
                        booking.worker?.middle_name,
                        booking.worker?.last_name,
                      ]
                        .filter(Boolean)
                        .join(" ")}

                    </button>

                  </td>


                    <td className="p-4">
                      {booking.booking_date}
                    </td>


                    <td className="p-4">
                      {booking.booking_time}
                    </td>


                    <td className="p-4 align-top">

                      <div className="mb-3">

                        <span
                          className={`px-3 py-1 rounded-full text-white text-sm

                          ${
                            booking.status === "Pending"
                              ? "bg-yellow-500"

                            : booking.status === "Approved"
                              ? "bg-blue-600"

                            : booking.status === "On Going"
                              ? "bg-purple-600"

                            : booking.status === "Completed"
                              ? "bg-green-600"

                            : "bg-red-600"
                          }`}
                        >

                          {booking.status}

                        </span>

                      </div>

                      <BookingTimeline
                        status={booking.status}
                      />
                      {booking.status === "Pending" && (

                      <div className="flex gap-2">

                        <span className="text-yellow-600 font-medium self-center">
                          Waiting...
                        </span>

                        <button
                          onClick={() => handleCancel(booking.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg"
                        >
                          Cancel
                        </button>

                      </div>

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


                      {booking.status === "Completed" && (
                        <div className="flex gap-2 flex-wrap">
                          {!booking.reviewed ? (
                            <button
                              onClick={() =>
                                navigate(`/customer/review/${booking.id}`)
                              }
                              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg"
                            >
                              Leave Review
                            </button>
                          ) : (
                            <span className="text-green-600 font-semibold self-center">
                              ⭐ Review Submitted
                            </span>
                          )}

                          <button
                            onClick={() =>
                              navigate(`/customer/book/${booking.worker_id}`, {
                                state: {
                                  serviceId: booking.service_id,
                                },
                              })
                            }
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                          >
                            Rebook
                          </button>
                           <button
                          onClick={() =>
                            navigate(`/customer/receipt/${booking.id}`)
                          }
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                        >
                          Receipt
                        </button>
                        </div>
                        
                      )}
                      
                    <button
                      onClick={() =>
                        navigate(`/customer/booking/${booking.id}`)
                      }
                      className="mt-2 bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg"
                    >
                      View Details
                    </button>


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