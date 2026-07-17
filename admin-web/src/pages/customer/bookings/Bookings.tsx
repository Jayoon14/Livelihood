  import { useEffect, useState } from "react";
  import { useNavigate } from "react-router-dom";

  import CustomerLayout from "../../../layouts/CustomerLayout";
  import { supabase } from "../../../lib/supabase";
  import { hasReviewed } from "../../../services/reviewService";
  import { cancelBooking } from "../../../services/bookingService";
  import BookingTimeline from "../../../components/customer/BookingTimeline";
  import {
  Calendar,
  Clock,
  MessageCircle,
  Eye,
  CreditCard,
  Receipt,
  Star,
  RotateCcw,
  Trash2,
} from "lucide-react";


  export default function Bookings() {

  const [bookings, setBookings] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Newest");
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();


  function getStatusColor(status: string) {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-700";

      case "Approved":
        return "bg-blue-100 text-blue-700";

      case "On Going":
        return "bg-purple-100 text-purple-700";

      case "Completed":
        return "bg-green-100 text-green-700";

      case "Cancelled":
        return "bg-red-100 text-red-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  }


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
        .select(`
            *,
            worker:profiles!bookings_worker_id_fkey(
            first_name,
            middle_name,
            last_name,
            profile_picture
          )
        `)
        .eq("customer_id", user.id)
        .order("created_at", {
          ascending: false,
        });


      if (!error && data) {

          const updated = await Promise.all(
            data.map(async (booking) => ({
                ...booking,
                reviewed: await hasReviewed(
                    booking.id,
                    user.id
                )
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


          async function handleDelete(id: number) {

            const confirmDelete = window.confirm(
              "Delete this booking from your history?"
            );

            if (!confirmDelete) return;

            try {

              const { error } = await supabase
                .from("bookings")
                .delete()
                .eq("id", id);

              if (error) {
                throw error;
              }

              alert("Booking deleted successfully.");

              await loadBookings();

            } catch (error) {

              console.error(error);

              alert("Unable to delete booking.");

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

      <div className="space-y-6 p-6">

        {filteredBookings.map((booking) => (

          <div
            key={booking.id}
            className="bg-white rounded-2xl border shadow-sm hover:shadow-lg transition"
          >
            {/* HEADER */}

            <div className="flex justify-between items-start border-b p-6">

              <div className="flex items-center gap-4">

                <img
                  src={
                    booking.worker?.profile_picture ||
                    "https://placehold.co/70x70"
                  }
                  alt="Worker"
                  className="w-16 h-16 rounded-full object-cover border"
                />

                <div>

                  <button
                    onClick={() =>
                      navigate(`/customer/worker/${booking.worker_id}`)
                    }
                    className="text-xl font-bold hover:text-blue-600"
                  >
                    {[
                      booking.worker?.first_name,
                      booking.worker?.middle_name,
                      booking.worker?.last_name,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  </button>

                  <p className="text-gray-500 mt-1">
                    {booking.service_name || "Service"}
                  </p>

                </div>

              </div>


              <div className="text-right">

              <span
                className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(
                  booking.status
                )}`}
              >
                {booking.status}
              </span>


                <p className="text-gray-400 mt-3 text-sm">
                  Total Amount
                </p>


                <h2 className="text-3xl font-bold text-blue-700">
                  ₱{booking.price ?? 0}
                </h2>

              </div>

            </div>


            {/* DETAILS */}
            <div className="p-5">

              <div className="grid grid-cols-2 gap-5 mt-5">

              <div className="bg-gray-50 rounded-xl p-4 border">

              <p className="flex items-center gap-2 text-gray-500 text-sm">
                <Calendar size={18} />
                Booking Date
              </p>

                <p className="font-semibold text-lg">
                  {booking.booking_date}
                </p>

              </div>

              <div className="bg-gray-50 rounded-xl p-4 border">

                <p className="flex items-center gap-2 text-gray-500 text-sm">
                  <Clock size={18} />
                  Booking Time
                </p>
                <p className="font-semibold text-lg">
                  {booking.booking_time}
                </p>

              </div>

            </div>



              <div className="mt-6">

                <BookingTimeline
                  status={booking.status}
                />

              </div>




              {/* ACTIONS */}
              <div className="flex flex-wrap gap-3 mt-8">


                {booking.status === "Pending" && (

                  <>
                    <span className="text-yellow-600 font-medium self-center">
                      Waiting...
                    </span>


                    <button
                      onClick={() => handleCancel(booking.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-xl"
                    >
                      Cancel Booking
                    </button>
                  </>

                )}




                {booking.status === "Approved" && (

                <button
                  onClick={() => navigate(`/chat/${booking.id}`)}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-xl"
                >
                  <MessageCircle size={18} />
                  Open Chat
                </button>

                )}

                {booking.status === "Waiting Customer Confirmation" && (

                <button
                  onClick={() =>
                    navigate(`/customer/completion-proof/${booking.id}`)
                  }
                  className="bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-xl"
                >
                  View Completion Proof
                </button>

)}
                {booking.status === "Completed" && (

                  <>

                    {!booking.payment_status ||
                    booking.payment_status === "Pending" ? (

                  <button
                    onClick={() =>
                      navigate(`/customer/payment/${booking.id}`)
                    }
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl"
                  >
                    <CreditCard size={18} />
                    Continue Payment
                  </button>
                    ) : (

                  <button
                    onClick={() =>
                      navigate(`/customer/receipt/${booking.id}`)
                    }
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-xl"
                  >
                    <Receipt size={18} />
                    Receipt
                  </button>

                    )}




                    {booking.payment_status === "Paid" && (

                      <>

                        {!booking.reviewed ? (

                          <button
                            onClick={() =>
                              navigate(`/customer/review/${booking.id}`)
                            }
                            className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-5 py-3 rounded-xl"
                          >
                            <Star size={18} />
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
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl"
                  >
                    <RotateCcw size={18} />
                    Rebook
                  </button>
                                        </>

                    )}

                  </>

                )}

              <button
                onClick={() =>
                  navigate(`/customer/bookings/${booking.id}`)
                }
                className="flex items-center gap-2 bg-gray-700 hover:bg-gray-800 text-white px-5 py-3 rounded-xl"
              >
                <Eye size={18} />
                View Details
              </button>

              </div>
              <div className="border-t mt-6 pt-4 flex gap-3">

            <button
              onClick={() => navigate(`/chat/${booking.id}`)}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-xl"
            >
              <MessageCircle size={18} />
              Message Worker
            </button>

            {booking.payment_status === "Paid" && !booking.reviewed && (
              <button
                onClick={() =>
                  navigate(`/customer/review/${booking.id}`)
                }
                className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-5 py-3 rounded-xl"
              >
                <Star size={18} />
                Leave Review
              </button>
            )}

          </div>



             {booking.status === "Cancelled" && (
                
              <div className="mt-5">

                <span className="text-red-600 font-semibold">
                  Booking Cancelled
                </span>

              </div>

            )}


            <div className="border-t mt-6 pt-4 flex justify-end">

                    <button
                      onClick={() => handleDelete(booking.id)}
                      className="flex items-center gap-2 text-red-600 hover:text-red-700 font-semibold"
                    >
                  <Trash2 size={18} />
                   Delete Booking
                </button>
            </div>

            </div>

          </div>

        ))}

      </div>

                  )}

                </div>

              </div>

            </CustomerLayout>

          );

        }