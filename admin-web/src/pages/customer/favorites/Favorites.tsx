import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import CustomerLayout from "../../../layouts/CustomerLayout";
import { Star } from "lucide-react";
import { supabase } from "../../../lib/supabase";

import {
  getFavoriteWorkers,
  removeFavorite,
} from "../../../services/favoriteService";

import {
  getWorkerAverageRating,
} from "../../../services/reviewService";


export default function Favorites() {

  const navigate = useNavigate();

  const [workers, setWorkers] = useState<any[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});


  useEffect(() => {
    loadFavorites();
  }, []);


  async function loadFavorites() {

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const data = await getFavoriteWorkers(user.id);

    setWorkers(data);

    const temp: Record<string, number> = {};

    for (const worker of data) {
      temp[worker.id] =
        await getWorkerAverageRating(worker.id);
    }

    setRatings(temp);

  }


  async function handleRemoveFavorite(workerId: string) {

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await removeFavorite(
      user.id,
      workerId
    );

    loadFavorites();

  }


  return (

    <CustomerLayout>

      <div className="space-y-5">

        <h1 className="text-3xl font-bold">
          My Favorite Workers
        </h1>


        {workers.length === 0 && (

          <div className="bg-white rounded-xl p-8 text-center shadow">

            No favorite workers yet.

          </div>

        )}


        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">

          {workers.map((worker) => (

            <div
              key={worker.id}
              className="bg-white rounded-2xl shadow overflow-hidden"
            >

              <img
                src={
                  worker.profile_picture ??
                  "https://placehold.co/400x250"
                }
                className="w-full h-48 object-cover"
                alt="Worker"
              />


              <div className="p-5">

                <h2 className="text-xl font-bold">
                  {[
                    worker.first_name,
                    worker.middle_name,
                    worker.last_name,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                </h2>


                <p className="text-gray-500 mt-1">
                  {worker.email}
                </p>


                <div className="flex items-center gap-2 mt-3">

                  <Star
                    size={18}
                    className="fill-yellow-500 text-yellow-500"
                  />

                  <span>
                    {ratings[worker.id] ?? 0}
                  </span>

                </div>


                <div className="grid grid-cols-3 gap-2 mt-4">

                  <button
                    onClick={() =>
                      navigate(
                        `/customer/workers/${worker.id}`
                      )
                    }
                    className="bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm"
                  >
                    View
                  </button>


                  <button
                    onClick={() =>
                      navigate(
                        `/customer/workers/${worker.id}`
                      )
                    }
                    className="bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm"
                  >
                    Book
                  </button>


                  <button
                    onClick={() =>
                      handleRemoveFavorite(worker.id)
                    }
                    className="bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm"
                  >
                    Remove
                  </button>

                </div>


              </div>

            </div>

          ))}

        </div>

      </div>

    </CustomerLayout>

  );

}