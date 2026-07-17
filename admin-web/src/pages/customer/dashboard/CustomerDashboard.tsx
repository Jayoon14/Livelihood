import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import CustomerLayout from "../../../layouts/CustomerLayout";
import { getUpcomingBooking } from "../../../services/reminderService";

import {
  Star,
  Heart,
} from "lucide-react";

import {
  getFeaturedWorkers,
  getCategories,
  searchDashboard,
  getRecommendedWorkers,
  isWorkerAvailable,
} from "../../../services/workerService";

import {
  getWorkerAverageRating,
} from "../../../services/reviewService";

import {
  addFavorite,
  removeFavorite,
  isFavorite,
} from "../../../services/favoriteService";

import {
  getCustomerAnalytics,
} from "../../../services/customerAnalyticsService";

import {
  getRecentlyViewed,
} from "../../../services/recentlyViewedService";

import { supabase } from "../../../lib/supabase";


export default function CustomerDashboard() {

  const navigate = useNavigate();

  const [workers, setWorkers] = useState<any[]>([]);
  const [recommendedWorkers, setRecommendedWorkers] = useState<any[]>([]);
  const [, setCategories] = useState<string[]>([]);
  const [search] = useState("");
  

  const [recentWorkers, setRecentWorkers] = useState<any[]>([]);

  const [ratings, setRatings] =
    useState<Record<string, number>>({});

    const [favorites, setFavorites] =
      useState<Record<string, boolean>>({});



  const [availability, setAvailability] =
    useState<Record<string, boolean>>({});
    const [upcomingBooking, setUpcomingBooking] =
  useState<any>(null);

  const [analytics, setAnalytics] = useState({
    totalBookings: 0,
    completedBookings: 0,
    pendingBookings: 0,
    cancelledBookings: 0,
    favoriteWorkers: 0,
    totalPayments: 0,
  });
  
  


  useEffect(() => {
    loadDashboard();
    loadRecentWorkers();
  }, []);


  useEffect(() => {
    searchWorkers();
  }, [search]);



  async function loadDashboard() {

    try {

      const workerData =
        await getFeaturedWorkers(6);

      const categoryData =
        await getCategories();


      setWorkers(workerData);
      setCategories(categoryData);


        const temp: Record<string, number> = {};
        const available: Record<string, boolean> = {};

        for (const worker of workerData) {

          temp[worker.id] =
            await getWorkerAverageRating(worker.id);

          available[worker.id] = Boolean(
            await isWorkerAvailable(worker.id)
          );

        }

        setRatings(temp);
        setAvailability(available);


      const {
        data: { user },
      } = await supabase.auth.getUser();



      if (user) {

        const favs: Record<string, boolean> = {};


          for (const worker of workerData) {

            const favoriteStatus =
              await isFavorite(
                user.id,
                worker.id
              );

            favs[String(worker.id)] = favoriteStatus === true;

          }




        setFavorites(favs);


        const analyticsData =
          await getCustomerAnalytics(user.id);

        setAnalytics(analyticsData);
        const booking =
          await getUpcomingBooking();

        setUpcomingBooking(booking);


        const recommended =
          await getRecommendedWorkers(user.id);

        setRecommendedWorkers(recommended);

      }


    } catch (error) {

      console.error(error);

    }

  }



  async function loadRecentWorkers() {

    try {

      const data =
        await getRecentlyViewed(5);

      setRecentWorkers(data);

    } catch (error) {

      console.error(error);

    }

  }



  async function searchWorkers() {

    if (!search.trim()) {

      loadDashboard();

      return;

    }


    const result =
      await searchDashboard(search);


    setWorkers(result);


    const temp: Record<string, number> = {};


    for (const worker of result) {

      temp[worker.id] =
        await getWorkerAverageRating(worker.id);

    }


    setRatings(temp);

  }



  async function toggleFavorite(workerId: string) {

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  if (favorites[workerId]) {

    await removeFavorite(
      user.id,
      workerId
    );

    setFavorites({
      ...favorites,
      [workerId]: false,
    });

  } else {

    await addFavorite(
      user.id,
      workerId
    );

    setFavorites({
      ...favorites,
      [workerId]: true,
    });

  }

}

function getReminderLabel(date: string, time: string) {
  const booking = new Date(`${date}T${time}`);
  const now = new Date();

  const diff = booking.getTime() - now.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes <= 30 && minutes >= 0) {
    return {
      text: "🚨 Starts in less than 30 minutes",
      color: "bg-red-100 text-red-700",
    };
  }

  if (hours < 3 && hours >= 0) {
    return {
      text: `⏰ Starts in ${hours} hour(s)`,
      color: "bg-orange-100 text-orange-700",
    };
  }

  if (days === 0) {
    return {
      text: "📅 Today",
      color: "bg-green-100 text-green-700",
    };
  }

  if (days === 1) {
    return {
      text: "📆 Tomorrow",
      color: "bg-blue-100 text-blue-700",
    };
  }

  return {
    text: `📅 In ${days} day(s)`,
    color: "bg-gray-100 text-gray-700",
  };
}

return (
  <CustomerLayout>

      <div className="space-y-6">


        {/* ANALYTICS */}

        <div className="grid md:grid-cols-3 xl:grid-cols-6 gap-5">

          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-gray-500 text-sm">
              Total Bookings
            </p>
            <h2 className="text-3xl font-bold text-blue-600">
              {analytics.totalBookings}
            </h2>
          </div>


          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-gray-500 text-sm">
              Completed
            </p>
            <h2 className="text-3xl font-bold text-green-600">
              {analytics.completedBookings}
            </h2>
          </div>


          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-gray-500 text-sm">
              Pending
            </p>
            <h2 className="text-3xl font-bold text-yellow-500">
              {analytics.pendingBookings}
            </h2>
          </div>


          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-gray-500 text-sm">
              Cancelled
            </p>
            <h2 className="text-3xl font-bold text-red-600">
              {analytics.cancelledBookings}
            </h2>
          </div>


          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-gray-500 text-sm">
              Favorite Workers
            </p>
            <h2 className="text-3xl font-bold text-pink-600">
              {analytics.favoriteWorkers}
            </h2>
          </div>


          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-gray-500 text-sm">
              Total Payments
            </p>
            <h2 className="text-3xl font-bold text-purple-600">
              ₱{analytics.totalPayments.toLocaleString()}
            </h2>
          </div>

        </div>



        {/* UPCOMING BOOKING */}

        {upcomingBooking && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-2">
              🔔 Upcoming Booking
            </h2>

            <p className="text-gray-700">
              <strong>
                {upcomingBooking.worker?.first_name}{" "}
                {upcomingBooking.worker?.last_name}
              </strong>
            </p>

            <p className="text-gray-600">
              {upcomingBooking.service?.service_name}
            </p>

            <p className="text-gray-600">
              {upcomingBooking.booking_date}
            </p>

            <p className="text-gray-600">
              {upcomingBooking.booking_time}
            </p>
            {(() => {
              const reminder = getReminderLabel(
                upcomingBooking.booking_date,
                upcomingBooking.booking_time
              );

              return (
                <div
                  className={`mt-4 inline-block px-4 py-2 rounded-full text-sm font-semibold ${reminder.color}`}
                >
                  {reminder.text}
                </div>
              );
            })()}

        <button
          onClick={() =>
            navigate(`/customer/bookings/${upcomingBooking.id}`)
          }
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl"
        >
          View Booking
        </button>
          </div>
        )}




        {/* RECOMMENDED WORKERS */}

        {recommendedWorkers.length > 0 && (

          <div className="bg-white rounded-2xl shadow p-6">

            <div className="flex justify-between items-center mb-5">

              <h2 className="text-2xl font-bold">
                ⭐ Recommended For You
              </h2>

            </div>


            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">

              {recommendedWorkers.map((worker) => (

                <div
                  key={worker.id}
                  className="border rounded-2xl overflow-hidden hover:shadow-lg transition"
                >

                  <img
                    src={
                      worker.profile?.profile_picture ||
                      worker.profile_picture ||
                      "https://placehold.co/300"
                    }
                    alt="Worker"
                    className="w-full h-48 object-cover"
                  />


                  <div className="p-5">

                    <h3 className="text-xl font-bold">
                      {worker.first_name}{" "}
                      {worker.last_name}
                    </h3>


                <div className="mt-3">

                  {availability[worker.id] ? (

                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                      🟢 Available Today
                    </span>

                  ) : (

                    <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
                      🔴 Unavailable
                    </span>

                  )}

                </div>


                    <button
                      onClick={() =>
                        navigate(
                          `/customer/workers/${worker.id}`
                        )
                      }
                      className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2"
                    >
                      View Profile
                    </button>


                  </div>

                </div>

              ))}

            </div>

          </div>

        )}

        {/* FEATURED WORKERS */}

        <div className="bg-white rounded-2xl shadow p-6">

          <div className="flex justify-between items-center mb-5">

            <h2 className="text-2xl font-bold">
              Featured Workers
            </h2>


            <button
              onClick={() =>
                navigate("/customer/workers")
              }
              className="text-blue-600 font-semibold hover:underline"
            >
              View All
            </button>

          </div>


          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">


            {workers.map((worker) => (

              <div
                key={worker.id}
                className="border rounded-2xl overflow-hidden hover:shadow-lg transition"
              >


                <div className="relative">

                  <img
                    src={
                      worker.profile?.profile_picture ||
                      worker.profile_picture ||
                      "https://placehold.co/400x250"
                    }
                    alt="Worker"
                    className="w-full h-52 object-cover"
                  />


                  <button
                    onClick={() =>
                      toggleFavorite(worker.id)
                    }
                    className="absolute top-4 right-4 bg-white rounded-full p-2 shadow"
                  >

                    <Heart
                      size={22}
                      className={
                        favorites[worker.id]
                          ? "fill-red-500 text-red-500"
                          : "text-gray-400"
                      }
                    />

                  </button>

                </div>



                <div className="p-5">


                  <h3 className="text-xl font-bold">

                    {[
                      worker.first_name,
                      worker.middle_name,
                      worker.last_name,
                    ]
                      .filter(Boolean)
                      .join(" ")}

                  </h3>



                  <p className="text-gray-500 mt-1">

                    {worker.services?.[0]?.category ??
                      "No Category"}

                  </p>
                  <div className="flex items-center gap-2 mt-3">

                    <Star
                      size={18}
                      className="text-yellow-500 fill-yellow-500"
                    />

                    <span className="font-semibold">
                      {ratings[worker.id] ?? 0}
                    </span>

                  </div>




              <div className="mt-3">

                {availability[worker.id] ? (

                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                    🟢 Available Today
                  </span>

                ) : (

                  <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
                    🔴 Unavailable
                  </span>

                )}

              </div>




                  <div className="flex gap-2 mt-4">


                    <button
                      onClick={() =>
                        navigate(
                          `/customer/workers/${worker.id}`
                        )
                      }
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2"
                    >
                      View Profile
                    </button>



                    <button
                      onClick={() =>
                        navigate(
                          `/customer/compare?worker=${worker.id}`
                        )
                      }
                      className="bg-gray-700 hover:bg-gray-800 text-white px-4 rounded-lg"
                    >
                      Compare
                    </button>


                  </div>


                </div>


              </div>

            ))}


          </div>


        </div>





        {/* RECENTLY VIEWED WORKERS */}

        <div className="bg-white rounded-2xl shadow p-6">


          <h2 className="text-2xl font-bold mb-5">
            Recently Viewed Workers
          </h2>



          {recentWorkers.length === 0 ? (

            <p className="text-gray-500">
              No recently viewed workers.
            </p>


          ) : (

            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-5">


              {recentWorkers.map((item: any) => {


                const worker = item.worker;


                if (!worker) return null;



                return (

                  <div
                    key={worker.id}
                    className="border rounded-xl p-4 hover:shadow-lg transition"
                  >


                    <img
                      src={
                        worker.profile_picture ||
                        "https://placehold.co/200x200"
                      }
                      alt="Worker"
                      className="w-24 h-24 rounded-full object-cover mx-auto"
                    />


                    <div className="text-center mt-2">

                      {availability[worker.id] ? (

                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">
                          🟢 Available
                        </span>

                      ) : (

                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs">
                          🔴 Busy
                        </span>

                      )}

                    </div>


                    <div className="mt-5 flex gap-2">


                      <button
                        onClick={() =>
                          navigate(
                            `/customer/workers/${worker.id}`
                          )
                        }
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl"
                      >
                        View Profile
                      </button>


                      <button
                        onClick={() =>
                          navigate(
                            `/customer/compare?worker=${worker.id}`
                          )
                        }
                        className="px-5 bg-gray-700 hover:bg-gray-800 text-white rounded-xl"
                      >
                        Compare
                      </button>


                    </div>


                  </div>

                );


              })}


            </div>

          )}


        </div>


      </div>

    </CustomerLayout>
  );
}
