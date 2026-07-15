import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import CustomerLayout from "../../../layouts/CustomerLayout";

import { Star } from "lucide-react";

import { supabase } from "../../../lib/supabase";

import {
  getFavoriteWorkers,
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
      data:{user},
    } = await supabase.auth.getUser();

    if(!user) return;

    const data = await getFavoriteWorkers(user.id);

    setWorkers(data);

    const temp:Record<string,number>={};

    for(const worker of data){

      temp[worker.id]=await getWorkerAverageRating(worker.id);

    }

    setRatings(temp);

  }

  return (

    <CustomerLayout>

      <div>

        <h1 className="text-3xl font-bold mb-8">
          My Favorite Workers
        </h1>

        {workers.length===0 && (

          <div className="bg-white rounded-xl p-12 text-center shadow">

            No favorite workers yet.

          </div>

        )}

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">

          {workers.map(worker=>(

            <div
              key={worker.id}
              className="bg-white rounded-2xl shadow overflow-hidden"
            >

              <img
                src={
                  worker.profile_image ??
                  "https://placehold.co/400x250"
                }
                className="w-full h-52 object-cover"
              />

              <div className="p-6">

                <h2 className="text-xl font-bold">

                  {[
                    worker.first_name,
                    worker.middle_name,
                    worker.last_name,
                  ]
                  .filter(Boolean)
                  .join(" ")}

                </h2>

                <p className="text-gray-500 mt-2">
                  {worker.email}
                </p>

                <div className="flex items-center gap-2 mt-4">

                  <Star
                    className="fill-yellow-500 text-yellow-500"
                    size={18}
                  />

                  {ratings[worker.id] ?? 0}

                </div>

                <button

                  onClick={()=>navigate(`/customer/workers/${worker.id}`)}

                  className="mt-5 w-full bg-blue-600 text-white py-3 rounded-xl"

                >
                  View Profile
                </button>

              </div>

            </div>

          ))}

        </div>

      </div>

    </CustomerLayout>

  );

}