import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import CustomerLayout from "../../../layouts/CustomerLayout";
import { getWorkersByCategory } from "../../../services/workerService";


export default function WorkersByCategory() {

  const { category } = useParams();
  const navigate = useNavigate();

  const [workers, setWorkers] = useState<any[]>([]);


  useEffect(() => {
    loadWorkers();
  }, [category]);


  async function loadWorkers() {

    if (!category) return;

    try {

      const data =
        await getWorkersByCategory(category);

      setWorkers(data);

    } catch (error) {

      console.error(error);

    }

  }


  return (
    <CustomerLayout>

      <div className="space-y-6">

        <div>

          <h1 className="text-3xl font-bold">
            {category} Workers
          </h1>

          <p className="text-gray-500 mt-2">
            Available workers for {category}
          </p>

        </div>


        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

          {workers.length === 0 ? (

            <div className="text-gray-500">
              No workers found.
            </div>

          ) : (

            workers.map((worker) => (

              <div
                key={worker.id}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition overflow-hidden"
              >

                <div className="p-6">

                  <div className="flex items-center gap-4">

                    {worker.profile_picture ? (

                      <img
                        src={worker.profile_picture}
                        className="w-20 h-20 rounded-full object-cover border"
                      />

                    ) : (

                      <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-3xl">
                        👤
                      </div>

                    )}


                    <div>

                      <h2 className="text-xl font-bold">
                        {worker.first_name}{" "}
                        {worker.last_name}
                      </h2>

                      <p className="text-gray-500">
                        {worker.email}
                      </p>

                      <div className="flex items-center gap-2 mt-2">

                        <span>
                          ⭐ 5.0
                        </span>

                        <span className="text-gray-400 text-sm">
                          New Worker
                        </span>

                      </div>

                    </div>

                  </div>


                  <button
                    onClick={() =>
                      navigate(
                        `/customer/workers/${worker.id}`
                      )
                    }
                    className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl"
                  >
                    View Profile
                  </button>


                </div>

              </div>

            ))

          )}

        </div>

      </div>

    </CustomerLayout>
  );
}