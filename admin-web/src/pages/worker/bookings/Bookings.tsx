import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import WorkerLayout from "../../../layouts/WorkerLayout";
import { supabase } from "../../../lib/supabase";

import {
  getWorkerBookings,
  acceptBooking,
  rejectBooking,
  completeBooking,
} from "../../../services/workerBookingService";
import BookingTimeline from "../../../components/worker/Timeline/BookingTimeline";
import CustomerProfileCard from "../../../components/worker/Cards/CustomerProfileCard";
import BookingSummaryCard from "../../../components/worker/Cards/BookingSummaryCard";
import BookingActivity from "../../../components/worker/Timeline/BookingActivity";


export default function Bookings() {


  const [bookings, setBookings] =
    useState<any[]>([]);


  const [search, setSearch] =
    useState("");


  const [statusFilter, setStatusFilter] =
    useState("All");


  const [selectedBooking, setSelectedBooking] =
    useState<any>(null);



    useEffect(() => {
      loadBookings();

      const channel = supabase
        .channel("worker-bookings")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "bookings",
          },
          () => {
            loadBookings();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }, []);




  async function loadBookings() {

    try {

      const {
        data: { user },
      } = await supabase.auth.getUser();


      if (!user) return;



      const data =
        await getWorkerBookings(user.id);



      setBookings(data);


    } catch(error) {

      console.error(
        "Load bookings error:",
        error
      );

    }

  }





  async function handleApprove(
    id:number
  ) {

    try {

      await acceptBooking(id);


      alert(
        "Booking approved successfully."
      );


      loadBookings();


    } catch(error) {

      console.error(error);


      alert(
        "Unable to approve booking."
      );

    }

  }





  async function handleReject(
    id:number
  ) {

    try {

      await rejectBooking(id);


      alert(
        "Booking rejected."
      );


      loadBookings();


    } catch(error) {

      console.error(error);


      alert(
        "Unable to reject booking."
      );

    }

  }





  async function handleComplete(
    id:number
  ) {

    try {

      await completeBooking(id);


      alert(
        "Booking completed."
      );


      loadBookings();


    } catch(error) {

      console.error(error);


      alert(
        "Unable to complete booking."
      );

    }

  }





  const totalBookings =
    bookings.length;



  const pendingBookings =
    bookings.filter(
      (booking) =>
        booking.status === "Pending"
    ).length;



  const approvedBookings =
    bookings.filter(
      (booking) =>
        booking.status === "Approved"
    ).length;



  const completedBookings =
    bookings.filter(
      (booking) =>
        booking.status === "Completed"
    ).length;



  const cancelledBookings =
    bookings.filter(
      (booking) =>
        booking.status === "Cancelled"
    ).length;





  const filteredBookings =
    bookings.filter(
      (booking) => {


        const keyword =
          search.toLowerCase();



        const customerName =
          `${booking.customer?.first_name ?? ""} ${booking.customer?.last_name ?? ""}`
          .toLowerCase();



        const matchesSearch =
          customerName.includes(
            keyword
          );



        const matchesStatus =
          statusFilter === "All" ||
          booking.status === statusFilter;



        return (
          matchesSearch &&
          matchesStatus
        );

      }
    );





  const groupedBookings =
    filteredBookings.reduce(
      (
        groups:any,
        booking:any
      ) => {


        if(
          !groups[booking.status]
        ){

          groups[booking.status] = [];

        }


        groups[booking.status].push(
          booking
        );


        return groups;


      },
      {}
    );





  return (
        <WorkerLayout>


      <div className="p-8 space-y-6">


        {/* Header */}

        <div className="mb-6">

          <h1 className="text-4xl font-bold text-gray-800">
            My Bookings
          </h1>


          <p className="text-gray-500 mt-2">
            Manage all customer booking requests.
          </p>

        </div>




        {/* Search & Filter */}

        <div className="bg-white rounded-2xl shadow p-5 flex flex-col md:flex-row gap-4 justify-between">


          <input
            type="text"
            placeholder="Search customer..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="border rounded-xl px-4 py-3 w-full md:w-80"
          />



          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value)
            }
            className="border rounded-xl px-4 py-3 w-full md:w-56"
          >

            <option value="All">
              All Status
            </option>

            <option value="Pending">
              Pending
            </option>

            <option value="Approved">
              Approved
            </option>

            <option value="Completed">
              Completed
            </option>

            <option value="Cancelled">
              Cancelled
            </option>


          </select>


        </div>






        {/* Statistics */}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-5">


          <div className="bg-white rounded-2xl shadow p-5">

            <p className="text-gray-500">
              Total
            </p>

            <h2 className="text-3xl font-bold text-blue-600">
              {totalBookings}
            </h2>

          </div>




          <div className="bg-white rounded-2xl shadow p-5">

            <p className="text-gray-500">
              Pending
            </p>

            <h2 className="text-3xl font-bold text-yellow-500">
              {pendingBookings}
            </h2>

          </div>




          <div className="bg-white rounded-2xl shadow p-5">

            <p className="text-gray-500">
              Approved
            </p>

            <h2 className="text-3xl font-bold text-green-600">
              {approvedBookings}
            </h2>

          </div>




          <div className="bg-white rounded-2xl shadow p-5">

            <p className="text-gray-500">
              Completed
            </p>

            <h2 className="text-3xl font-bold text-blue-600">
              {completedBookings}
            </h2>

          </div>




          <div className="bg-white rounded-2xl shadow p-5">

            <p className="text-gray-500">
              Cancelled
            </p>

            <h2 className="text-3xl font-bold text-red-600">
              {cancelledBookings}
            </h2>

          </div>


        </div>







        {/* Booking Groups */}

        <div className="space-y-8">


          {
            Object.entries(groupedBookings).length === 0 ? (


              <div className="bg-white rounded-2xl shadow p-10 text-center">


                <div className="text-7xl">
                  📅
                </div>


                <h2 className="text-2xl font-bold mt-4">
                  No Bookings Found
                </h2>


                <p className="text-gray-500 mt-2">
                  Customer bookings will appear here.
                </p>


              </div>



            ) : (



              Object.entries(groupedBookings).map(
                (
                  [status, statusBookings]: any
                ) => (


                  <div
                    key={status}
                    className="space-y-5"
                  >


                    <h2 className="text-2xl font-bold text-gray-800 border-l-4 border-blue-600 pl-4">

                      {status}

                      <span className="ml-3 text-base text-gray-500">
                        ({statusBookings.length})
                      </span>

                    </h2>





                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">




                      {statusBookings.map(
                        (booking:any)=>(


                          <div
                            key={booking.id}
                            className="bg-white border rounded-2xl p-6 hover:shadow-lg transition"
                          >



                            <div className="flex justify-between gap-4">


                              <div>


                                <h3 className="text-xl font-bold">

                                  {booking.customer?.first_name}

                                  {" "}

                                  {booking.customer?.last_name}

                                </h3>



                                <p className="text-gray-500 mt-1">

                                  {booking.service?.service_name ??
                                  "Service"}

                                </p>


                              </div>



                              <span
                                className={`px-3 py-1 rounded-full text-sm font-semibold h-fit ${
                                  booking.status === "Pending"
                                  ? "bg-yellow-100 text-yellow-700"

                                  : booking.status === "Approved"
                                  ? "bg-green-100 text-green-700"

                                  : booking.status === "Completed"
                                  ? "bg-blue-100 text-blue-700"

                                  : "bg-red-100 text-red-700"
                                }`}
                              >

                                {booking.status}

                              </span>


                            </div>
                                                        {/* Booking Info */}

                            <div className="mt-6 space-y-3">


                              <div>

                                <p className="text-gray-400 text-sm">
                                  Booking Date
                                </p>

                                <p className="font-semibold">
                                  {booking.booking_date}
                                </p>

                              </div>




                              <div>

                                <p className="text-gray-400 text-sm">
                                  Time
                                </p>

                                <p className="font-semibold">
                                  {booking.booking_time}
                                </p>

                              </div>




                              <div>

                                <p className="text-gray-400 text-sm">
                                  Address
                                </p>

                                <p className="font-semibold">
                                  {booking.address}
                                </p>

                              </div>


                            </div>





                            {/* Card Actions */}

                            <div className="flex flex-wrap gap-3 mt-6">


                              <button
                                onClick={() =>
                                  setSelectedBooking(
                                    booking
                                  )
                                }
                                className="bg-gray-800 hover:bg-gray-900 text-white px-5 py-2 rounded-xl"
                              >

                                View Details

                              </button>





                              {booking.status === "Pending" && (

                                <>

                                  <button
                                    onClick={() =>
                                      handleApprove(
                                        booking.id
                                      )
                                    }
                                    className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl"
                                  >

                                    Accept

                                  </button>



                                  <button
                                    onClick={() =>
                                      handleReject(
                                        booking.id
                                      )
                                    }
                                    className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl"
                                  >

                                    Reject

                                  </button>


                                </>

                              )}






                              {booking.status === "Approved" && (

                                <>

                                  <button
                                    onClick={() =>
                                      handleComplete(
                                        booking.id
                                      )
                                    }
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl"
                                  >

                                    Complete

                                  </button>





                                  <Link
                                    to={`/chat/${booking.id}`}
                                    className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-xl"
                                  >

                                    Chat

                                  </Link>


                                </>

                              )}



                            </div>




                          </div>


                        )

                      )}


                    </div>


                  </div>


                )

              )


            )}


        </div>


      </div>







      {/* Booking Details Modal */}

      {selectedBooking && (


        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">


          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-8 max-h-[90vh] overflow-y-auto">





            {/* Modal Header */}

            <div className="flex justify-between items-center mb-6">


              <div>

              <h2 className="text-3xl font-bold">
              Booking # {selectedBooking.id}
              </h2>

              <p className="text-gray-500 mt-1">

              {selectedBooking.service?.service_name}

              </p>

              </div>

              <span
              className="px-4 py-2 rounded-full bg-green-100 text-green-700 font-semibold"
              >

              {selectedBooking.status}

              </span>



              <button
                onClick={() =>
                  setSelectedBooking(null)
                }
                className="text-gray-500 hover:text-black text-xl"
              >

                ✕

              </button>


            </div>

                  <CustomerProfileCard
                    customer={selectedBooking.customer}
                  />
                  <div className="mt-6">

                  <BookingSummaryCard
                      booking={selectedBooking}
                  />

              </div>
                        {/* Booking Details */}

            <div className="space-y-4">


              <h3 className="text-xl font-bold">
                Booking Information
              </h3>



              <div>

                <p className="text-gray-500 text-sm">
                  Service
                </p>

                <p className="font-semibold">
                  {selectedBooking.service?.service_name ?? "Service"}
                </p>

              </div>





              <div>

                <p className="text-gray-500 text-sm">
                  Booking Date
                </p>

                <p className="font-semibold">
                  {selectedBooking.booking_date}
                </p>

              </div>





              <div>

                <p className="text-gray-500 text-sm">
                  Time
                </p>

                <p className="font-semibold">
                  {selectedBooking.booking_time}
                </p>

              </div>





              <div>

                <p className="text-gray-500 text-sm">
                  Address
                </p>

                <p className="font-semibold">
                  {selectedBooking.address}
                </p>

              </div>





              {selectedBooking.notes && (

                <div>

                  <p className="text-gray-500 text-sm">
                    Notes
                  </p>


                  <p className="font-semibold">
                    {selectedBooking.notes}
                  </p>


                </div>

              )}


            </div>
              
              {/* Booking Progress */}

              <BookingTimeline
                status={selectedBooking.status}
              />
              <BookingActivity
                  booking={selectedBooking}
              />

            {/* Booking Action Bar */}

            <div className="mt-8 border-t pt-6 flex flex-wrap justify-end gap-3">


              {selectedBooking.status === "Pending" && (

                <>


                  <button
                    onClick={() => {

                      handleApprove(
                        selectedBooking.id
                      );

                      setSelectedBooking(null);

                    }}
                    className="px-6 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold"
                  >

                    ✓ Accept Booking

                  </button>





                  <button
                    onClick={() => {

                      handleReject(
                        selectedBooking.id
                      );

                      setSelectedBooking(null);

                    }}
                    className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold"
                  >

                    ✕ Reject Booking

                  </button>


                </>

              )}








              {selectedBooking.status === "Approved" && (

                <>


                  <Link
                    to={`/chat/${selectedBooking.id}`}
                    className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                  >

                    💬 Chat Customer

                  </Link>





                  <button
                    onClick={() => {

                      handleComplete(
                        selectedBooking.id
                      );

                      setSelectedBooking(null);

                    }}
                    className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  >

                    ✓ Mark as Completed

                  </button>


                </>

              )}







              {selectedBooking.status === "Completed" && (

                <div className="px-5 py-3 rounded-xl bg-green-100 text-green-700 font-semibold">

                  ✔ Job Completed

                </div>

              )}




              <button
                onClick={() =>
                  setSelectedBooking(null)
                }
                className="px-6 py-3 rounded-xl bg-gray-800 hover:bg-gray-900 text-white font-semibold"
              >

                Close

              </button>


            </div>





          </div>


        </div>


      )}



    </WorkerLayout>

  );


}