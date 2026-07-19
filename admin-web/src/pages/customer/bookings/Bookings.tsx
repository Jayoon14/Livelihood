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
  RotateCcw,
  Trash2,
} from "lucide-react";


  export default function Bookings() {

  const [bookings, setBookings] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Newest");
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [receiptBooking, setReceiptBooking] = useState<any>(null);
  const [reviewBooking, setReviewBooking] = useState<any>(null);
  const [rebookBooking, setRebookBooking] = useState<any>(null);
  const [chatBooking, setChatBooking] = useState<any>(null);
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [rebookNotes, setRebookNotes] = useState("");
  const [rebookAddress, setRebookAddress] = useState("");
  const [overallRating, setOverallRating] = useState(0);
  const [qualityRating, setQualityRating] = useState(0);
  const [professionalismRating, setProfessionalismRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  
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
                  {booking.payment_status === "Paid" ? (

                <button
                  onClick={() => {
                    setReceiptBooking(booking);
                  }}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-xl"
                >
                  <Receipt size={18} />
                  Receipt
                </button>

                  ) : (

                    <button
                      onClick={() =>
                        navigate(`/customer/payment/${booking.id}`)
                      }
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl"
                    >
                      <CreditCard size={18} />
                      Continue Payment
                    </button>

                  )}



                    {booking.payment_status === "Paid" && (

                      <>

                        {!booking.reviewed ? (

                      <button
                        onClick={() => {
                          setReviewBooking(booking);
                          setOverallRating(0);
                          setQualityRating(0);
                          setProfessionalismRating(0);
                          setCommunicationRating(0);
                          setReviewComment("");
                        }}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-xl"
                      >
                        Leave Review
                      </button>
                        ) : (

                          <span className="text-green-600 font-semibold self-center">
                            ⭐ Review Submitted
                          </span>

                        )}
                      <button
                      onClick={() => {
                        setRebookBooking(booking);
                        setPreferredDate("");
                        setPreferredTime("");
                        setRebookNotes("");
                        setRebookAddress(booking.address || "");
                      }}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl"
                      >
                        <RotateCcw size={18}/>
                        Rebook
                      </button>
           </>

                    )}

                  </>

                )}

                <button
            onClick={() => setSelectedBooking(booking)}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-800 text-white px-5 py-3 rounded-xl"
          >
            <Eye size={18} />
            View Details
          </button>
              </div>
              <div className="border-t mt-6 pt-4 flex gap-3">

          <button
            onClick={() => {
              setSelectedBooking(booking);
              setChatBooking(true);
            }}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl"
          >
            <MessageCircle size={18} />
            Message Worker
          </button>


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

      {selectedBooking &&
      !receiptBooking &&
      !reviewBooking &&
      !rebookBooking &&
      !chatBooking && (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">

        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto relative">

          {/* Close */}
          <button
            onClick={() => setSelectedBooking(null)}
            className="absolute top-5 right-6 text-4xl text-white hover:text-red-300 z-10"
          >
            ×
          </button>

          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-t-3xl p-8">

            <div className="flex items-center gap-6">

              <img
                src={
                  selectedBooking.worker?.profile_picture ||
                  "https://placehold.co/120x120"
                }
                className="w-28 h-28 rounded-full border-4 border-white object-cover shadow-lg"
              />

              <div className="flex-1">

                <h2 className="text-3xl font-bold text-white">
                  {[
                    selectedBooking.worker?.first_name,
                    selectedBooking.worker?.middle_name,
                    selectedBooking.worker?.last_name,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                </h2>

                <p className="text-blue-100 text-lg mt-1">
                  {selectedBooking.service_name}
                </p>

                <span
                  className={`inline-block mt-4 px-4 py-2 rounded-full text-sm font-semibold bg-white ${getStatusColor(
                    selectedBooking.status
                  )}`}
                >
                  {selectedBooking.status}
                </span>

              </div>

            </div>

          </div>

          {/* Body */}

          <div className="p-8 space-y-8">

            {/* Summary */}

            <div className="grid md:grid-cols-3 gap-5">

              <div className="bg-blue-50 rounded-2xl border p-6">

                <p className="text-gray-500 text-sm">
                  Total Amount
                </p>

                <h2 className="text-3xl font-bold text-blue-700 mt-2">
                  ₱{selectedBooking.price}
                </h2>

              </div>

              <div className="bg-gray-50 rounded-2xl border p-6">

                <p className="text-gray-500 text-sm">
                  Booking Date
                </p>

                <h3 className="text-xl font-semibold mt-2">
                  {selectedBooking.booking_date}
                </h3>

              </div>

              <div className="bg-gray-50 rounded-2xl border p-6">

                <p className="text-gray-500 text-sm">
                  Booking Time
                </p>

                <h3 className="text-xl font-semibold mt-2">
                  {selectedBooking.booking_time}
                </h3>

              </div>

            </div>

            {/* Address */}

            <div className="bg-gray-50 rounded-2xl border p-6">

              <h3 className="font-bold text-lg mb-3">
                📍 Service Address
              </h3>

              <p className="text-gray-700">
                {selectedBooking.address}
              </p>

            </div>

            {/* Notes */}

            <div className="bg-gray-50 rounded-2xl border p-6">

              <h3 className="font-bold text-lg mb-3">
                📝 Customer Notes
              </h3>

              <p className="text-gray-700">
                {selectedBooking.notes || "No additional notes."}
              </p>

            </div>

            {/* Booking Progress */}

            <div>

              <h3 className="text-2xl font-bold mb-5">
                Booking Progress
              </h3>

              <BookingTimeline
                status={selectedBooking.status}
              />
              

            </div>

          </div>

        </div>

      </div>
    )}
          {receiptBooking !== null && (
            <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">

              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl relative overflow-hidden">

                {/* Header */}

                <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-white">

                  <div className="flex justify-between items-center">

                    <div>

                      <h2 className="text-3xl font-bold">
                        Payment Receipt
                      </h2>

                      <p className="opacity-90">
                        Booking Receipt Summary
                      </p>

                    </div>

                    <button
                      onClick={() => setReceiptBooking(null)}
                      className="text-4xl hover:text-red-300"
                    >
                      ×
                    </button>

                  </div>

                </div>

                {/* Body */}

                <div className="p-8 space-y-6">

                  <div className="grid grid-cols-2 gap-6">

                    <div>

                      <p className="text-gray-500">
                        Worker
                      </p>

                      <h3 className="font-bold text-xl">
                        {[
                          receiptBooking.worker?.first_name,
                          receiptBooking.worker?.middle_name,
                          receiptBooking.worker?.last_name,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      </h3>

                    </div>

                    <div>

                      <p className="text-gray-500">
                        Service
                      </p>

                      <h3 className="font-bold text-xl">
                        {receiptBooking.service_name}
                      </h3>

                    </div>

                    <div>

                      <p className="text-gray-500">
                        Booking Date
                      </p>

                      <h3 className="font-semibold">
                        {receiptBooking.booking_date}
                      </h3>

                    </div>

                    <div>

                      <p className="text-gray-500">
                        Booking Time
                      </p>

                      <h3 className="font-semibold">
                        {receiptBooking.booking_time}
                      </h3>

                    </div>

                  </div>

                  <div className="border rounded-2xl p-6 bg-gray-50">

                    <div className="flex justify-between">

                      <span>Service Fee</span>

                      <span>
                        ₱{receiptBooking.price}
                      </span>

                    </div>

                    <div className="flex justify-between mt-3">

                      <span>Payment Status</span>

                      <span className="font-semibold text-green-600">
                        {receiptBooking.payment_status}
                      </span>

                    </div>

                    <div className="border-t mt-5 pt-5 flex justify-between">

                      <span className="font-bold text-xl">
                        Total Paid
                      </span>

                      <span className="text-3xl font-bold text-green-600">
                        ₱{receiptBooking.price}
                      </span>

                    </div>

                  </div>

                  <div className="flex justify-end gap-3">

                    <button
                      onClick={() => setReceiptBooking(null)}
                      className="px-6 py-3 rounded-xl border"
                    >
                      Close
                    </button>

                    <button
                      onClick={() =>
                        navigate(`/customer/receipt/${receiptBooking.id}`)
                      }
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl"
                    >
                      Open Full Receipt
                    </button>

                  </div>

                </div>

              </div>

            </div>
            
          )}
        {chatBooking && selectedBooking && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center">

        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[700px] flex overflow-hidden">

        {/* LEFT */}

        <div className="w-80 border-r bg-gray-50">

        <div className="p-6 border-b">

        <h2 className="text-2xl font-bold">
        Messages
        </h2>

        </div>

        <div className="p-5">

        <div className="flex items-center gap-4 p-4 rounded-2xl bg-blue-50">

        <img
        src={
        selectedBooking.worker?.profile_picture ||
        "https://placehold.co/70x70"
        }
        className="w-16 h-16 rounded-full object-cover"
        />

        <div>

        <h3 className="font-bold">

        {[
        selectedBooking.worker?.first_name,
        selectedBooking.worker?.middle_name,
        selectedBooking.worker?.last_name,
        ]
        .filter(Boolean)
        .join(" ")}

        </h3>

        <p className="text-gray-500 text-sm">
        {chatBooking.service_name}
        </p>

        <p className="text-green-600 text-xs mt-1">
        Booking Active
        </p>

        </div>

        </div>

        </div>

        </div>

        {/* RIGHT */}

        <div className="flex-1 flex flex-col">

        <div className="border-b p-6 flex justify-between items-center">

        <div className="flex items-center gap-4">

        <img
        src={
        selectedBooking.worker?.profile_picture ||
        "https://placehold.co/70x70"
        }
        className="w-14 h-14 rounded-full"
        />

        <div>

        <h2 className="text-xl font-bold">

        {[
        chatBooking.worker?.first_name,
        chatBooking.worker?.middle_name,
        chatBooking.worker?.last_name,
        ]
        .filter(Boolean)
        .join(" ")}

        </h2>

        <p className="text-gray-500">
        {chatBooking.service_name}
        </p>

        </div>

        </div>

        <button
        onClick={() => setChatBooking(false)}
        className="text-3xl hover:text-red-500"
        >
        ×
        </button>

        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-10">

        <MessageCircle
        size={90}
        className="text-purple-500"
        />

        <h2 className="text-3xl font-bold mt-6">
        Continue your conversation
        </h2>

        <p className="text-gray-500 mt-3 text-center max-w-lg">
        Chat directly with your worker regarding your booking,
        schedule updates, arrival time, or any additional requests.
        </p>

        <button
        onClick={()=>{
        setChatBooking(false);
        navigate(`/chat/${chatBooking.id}`);
        }}
        className="mt-8 bg-purple-600 hover:bg-purple-700 text-white px-10 py-4 rounded-2xl font-semibold text-lg"
        >
        Open Messenger
        </button>

        </div>

        </div>

        </div>

        </div>
        )}
        {rebookBooking && (

<div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">

<div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden">

{/* HEADER */}

<div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-7 text-white">

<div className="flex items-center gap-5">

<img
src={
rebookBooking.worker?.profile_picture ||
"https://placehold.co/100x100"
}
className="w-20 h-20 rounded-full border-4 border-white object-cover"
/>

<div>

<h2 className="text-3xl font-bold">
Rebook Service
</h2>

<p className="opacity-90">

{[
rebookBooking.worker?.first_name,
rebookBooking.worker?.middle_name,
rebookBooking.worker?.last_name,
]
.filter(Boolean)
.join(" ")}

</p>

</div>

</div>

</div>

{/* BODY */}

<div className="p-8 space-y-6">

<div className="bg-gray-50 rounded-2xl border p-5">

<h3 className="font-semibold mb-2">
Previous Service
</h3>

<p>{rebookBooking.service_name}</p>

<p className="text-blue-600 font-bold mt-2">
₱{rebookBooking.price}
</p>

</div>

<div>

<label className="font-medium">
Preferred Date
</label>

<input
type="date"
value={preferredDate}
onChange={(e)=>setPreferredDate(e.target.value)}
className="w-full mt-2 border rounded-xl px-4 py-3"
/>

</div>

<div>

<label className="font-medium">
Preferred Time
</label>

<input
type="time"
value={preferredTime}
onChange={(e)=>setPreferredTime(e.target.value)}
className="w-full mt-2 border rounded-xl px-4 py-3"
/>

</div>

<div>

<label className="font-medium">
Additional Notes
</label>

<textarea
rows={4}
value={rebookNotes}
onChange={(e)=>setRebookNotes(e.target.value)}
placeholder="Special requests..."
className="w-full mt-2 border rounded-xl px-4 py-3 resize-none"
/>

</div>
<div>

  <label className="block text-sm font-semibold text-gray-700 mb-2">
    Service Address
  </label>

  <textarea
    rows={3}
    value={rebookAddress}
    onChange={(e) => setRebookAddress(e.target.value)}
    placeholder="Enter your service address..."
    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none resize-none"
  />

  <p className="text-xs text-gray-500 mt-2">
    Update your address if the service will be performed at a different location.
  </p>

</div>

<div className="bg-blue-50 rounded-2xl border p-5">

<div className="flex justify-between">

<span>Total Amount</span>

<span className="font-bold text-2xl text-blue-700">
₱{rebookBooking.price}
</span>

</div>

</div>

<div className="flex justify-end gap-4">

<button
onClick={()=>setRebookBooking(null)}
className="border rounded-xl px-6 py-3"
>
Cancel
</button>

<button
onClick={()=>{

navigate(`/customer/book/${rebookBooking.worker_id}`,{
  state: {
    serviceId: rebookBooking.service_id,
    preferredDate,
    preferredTime,
    notes: rebookNotes,
    address: rebookAddress,
  },
})

}}
className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 py-3 font-semibold"
>
Confirm Rebook
</button>

</div>

</div>

</div>

</div>

)}
{reviewBooking && (
<div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">

<div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden">

<div className="bg-yellow-500 p-7 text-white">

<h2 className="text-3xl font-bold">
Leave Review
</h2>

<p>
Share your experience with this worker.
</p>

</div>

<div className="p-8 space-y-6">

<div>

<label className="font-semibold">
Overall Rating
</label>

<div className="flex gap-2 mt-3">
{[1,2,3,4,5].map((star)=>(
<button
key={star}
onClick={()=>setOverallRating(star)}
className="text-4xl"
>
{overallRating>=star ? "⭐":"☆"}
</button>
))}
</div>

</div>

<div>

<label className="font-semibold">
Quality of Work
</label>

<div className="flex gap-2 mt-3">
{[1,2,3,4,5].map((star)=>(
<button
key={star}
onClick={()=>setQualityRating(star)}
className="text-4xl"
>
{qualityRating>=star ? "⭐":"☆"}
</button>
))}
</div>

</div>

<div>

<label className="font-semibold">
Professionalism
</label>

<div className="flex gap-2 mt-3">
{[1,2,3,4,5].map((star)=>(
<button
key={star}
onClick={()=>setProfessionalismRating(star)}
className="text-4xl"
>
{professionalismRating>=star ? "⭐":"☆"}
</button>
))}
</div>

</div>

<div>

<label className="font-semibold">
Communication
</label>

<div className="flex gap-2 mt-3">
{[1,2,3,4,5].map((star)=>(
<button
key={star}
onClick={()=>setCommunicationRating(star)}
className="text-4xl"
>
{communicationRating>=star ? "⭐":"☆"}
</button>
))}
</div>

</div>

<div>

<label className="font-semibold">
Comment
</label>

<textarea
rows={5}
value={reviewComment}
onChange={(e)=>setReviewComment(e.target.value)}
placeholder="Tell us about your experience..."
className="w-full border rounded-xl p-4 mt-2"
/>

</div>

<div className="flex justify-end gap-3">

<button
onClick={()=>setReviewBooking(null)}
className="border px-6 py-3 rounded-xl"
>
Cancel
</button>

<button
onClick={async()=>{

// dito natin ilalagay save review

}}
className="bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-3 rounded-xl"
>
Submit Review
</button>

</div>

</div>

</div>

</div>
)}
</CustomerLayout>

);
}
