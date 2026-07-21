import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CustomerLayout from "../../../layouts/CustomerLayout";
import { supabase } from "../../../lib/supabase";

export default function CompletionProof() {
  const { bookingId } = useParams();

  const navigate = useNavigate();

  const [booking, setBooking] = useState<any>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProof();
  }, []);

  async function loadProof() {
    const { data } = await supabase
      .from("bookings")
      .select(
        `
        *,
        worker:profiles!bookings_worker_id_fkey(
          first_name,
          middle_name,
          last_name,
          profile_picture
        )
      `,
      )
      .eq("id", bookingId)
      .single();

    setBooking(data);

    setLoading(false);
  }

  async function acceptWork() {
    await supabase
      .from("bookings")
      .update({
        status: "Completed",
      })
      .eq("id", bookingId);

    alert("Job accepted.");

    navigate("/customer/bookings");
  }

  async function requestRevision() {
    await supabase
      .from("bookings")
      .update({
        status: "On Going",
      })
      .eq("id", bookingId);

    alert("Revision requested.");

    navigate("/customer/bookings");
  }

  if (loading) return <CustomerLayout>Loading...</CustomerLayout>;

  return (
    <CustomerLayout>
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-8">Job Completion Proof</h1>

          <div className="flex items-center gap-5 mb-8">
            <img
              src={booking.worker.profile_picture ?? "https://placehold.co/80"}
              className="w-20 h-20 rounded-full object-cover"
            />

            <div>
              <h2 className="text-xl font-bold">
                {booking.worker.first_name} {booking.worker.last_name}
              </h2>

              <p className="text-gray-500">
                Worker submitted completion proof.
              </p>
            </div>
          </div>

          <hr className="my-8" />

          <h2 className="font-bold text-lg">Work Summary</h2>

          <div className="bg-gray-100 rounded-xl p-5 mt-3">
            {booking.work_summary || "No summary submitted."}
          </div>

          <h2 className="font-bold text-lg mt-8">Notes</h2>

          <div className="bg-gray-100 rounded-xl p-5 mt-3">
            {booking.worker_notes || "No notes."}
          </div>

          <h2 className="font-bold text-lg mt-8">Hours Worked</h2>

          <div className="bg-gray-100 rounded-xl p-5 mt-3">
            {booking.hours_worked || "N/A"} Hours
          </div>

          <h2 className="font-bold text-lg mt-8">Uploaded Images</h2>

          <div className="grid grid-cols-3 gap-4 mt-5">
            <img src={booking.image1} className="rounded-xl border" />

            <img src={booking.image2} className="rounded-xl border" />

            <img src={booking.image3} className="rounded-xl border" />
          </div>

          <div className="flex gap-5 mt-10">
            <button
              onClick={acceptWork}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl"
            >
              Accept Work
            </button>

            <button
              onClick={requestRevision}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl"
            >
              Request Revision
            </button>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
