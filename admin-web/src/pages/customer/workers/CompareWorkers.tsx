import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import CustomerLayout from "../../../layouts/CustomerLayout";

import {
  getFeaturedWorkers,
  getCompleteWorkerProfile,
} from "../../../services/workerService";

import {
  getWorkerAverageRating,
} from "../../../services/reviewService";


function winner(left: number, right: number) {
  if (left > right) return "left";
  if (right > left) return "right";
  return "tie";
}


export default function CompareWorkers() {

  const navigate = useNavigate();

  const [workers, setWorkers] = useState<any[]>([]);

  const [leftId, setLeftId] = useState("");
  const [rightId, setRightId] = useState("");

  const [leftWorker, setLeftWorker] = useState<any>(null);
  const [rightWorker, setRightWorker] = useState<any>(null);

  const [leftRating, setLeftRating] = useState(0);
  const [rightRating, setRightRating] = useState(0);


  const ratingWinner = winner(
    leftRating,
    rightRating
  );


  const experienceWinner = winner(
    leftWorker?.workExperience?.length ?? 0,
    rightWorker?.workExperience?.length ?? 0
  );


  const leftPrice =
    Number(leftWorker?.services?.[0]?.price ?? 999999);

  const rightPrice =
    Number(rightWorker?.services?.[0]?.price ?? 999999);


  let priceWinner = "tie";

  if (leftPrice < rightPrice) {
    priceWinner = "left";
  }

  if (rightPrice < leftPrice) {
    priceWinner = "right";
  }


  let leftScore = 0;
  let rightScore = 0;


  if (ratingWinner === "left") leftScore++;
  if (ratingWinner === "right") rightScore++;

  if (experienceWinner === "left") leftScore++;
  if (experienceWinner === "right") rightScore++;

  if (priceWinner === "left") leftScore++;
  if (priceWinner === "right") rightScore++;


  useEffect(() => {
    loadWorkers();
  }, []);


  async function loadWorkers() {
    try {

      const data = await getFeaturedWorkers(100);

      setWorkers(data);

    } catch (error) {

      console.error(error);

    }
  }


  useEffect(() => {

    async function loadComparison() {

      try {

        if (leftId) {

          const profile =
            await getCompleteWorkerProfile(leftId);

          setLeftWorker(profile);


          const rating =
            await getWorkerAverageRating(leftId);

          setLeftRating(rating);

        } else {

          setLeftWorker(null);
          setLeftRating(0);

        }


        if (rightId) {

          const profile =
            await getCompleteWorkerProfile(rightId);

          setRightWorker(profile);


          const rating =
            await getWorkerAverageRating(rightId);

          setRightRating(rating);

        } else {

          setRightWorker(null);
          setRightRating(0);

        }


      } catch (error) {

        console.error(error);

      }

    }


    loadComparison();

  }, [leftId, rightId]);
  return (
    <CustomerLayout>

      <div className="p-8 space-y-6">

        <h1 className="text-3xl font-bold">
          Compare Workers
        </h1>


        {leftScore > rightScore && leftWorker && (

          <div className="bg-green-100 text-green-700 rounded-xl p-4 text-center font-bold">
            🏆 Recommended Worker:{" "}
            {leftWorker.profile?.first_name}
          </div>

        )}


        {rightScore > leftScore && rightWorker && (

          <div className="bg-green-100 text-green-700 rounded-xl p-4 text-center font-bold">
            🏆 Recommended Worker:{" "}
            {rightWorker.profile?.first_name}
          </div>

        )}


        {leftScore === rightScore &&
          leftWorker &&
          rightWorker && (

          <div className="bg-blue-100 text-blue-700 rounded-xl p-4 text-center font-bold">
            Both workers are equally recommended.
          </div>

        )}



        <div className="grid grid-cols-2 gap-8">


          {/* WORKER A */}

          <div
            className={`bg-white rounded-xl shadow p-6 border-2
              ${
                ratingWinner === "left" ||
                experienceWinner === "left" ||
                priceWinner === "left"
                  ? "border-green-500"
                  : "border-transparent"
              }
            `}
          >

            <h2 className="text-xl font-semibold mb-4">
              Worker A
            </h2>


            <select
              value={leftId}
              onChange={(e) => setLeftId(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full mb-5"
            >

              <option value="">
                Select Worker
              </option>


              {workers.map((worker) => (

                <option
                  key={worker.id}
                  value={worker.id}
                >
                  {worker.first_name}{" "}
                  {worker.last_name}
                </option>

              ))}

            </select>


            {leftWorker && (

              <div className="space-y-3">


                <h3 className="text-xl font-bold">

                  {leftWorker.profile?.first_name}{" "}
                  {leftWorker.profile?.last_name}

                </h3>



                {ratingWinner === "left" && (

                  <div className="text-green-600 font-bold">
                    🏆 Highest Rated
                  </div>

                )}


                {experienceWinner === "left" && (

                  <div className="text-green-600 font-bold">
                    🏆 Most Experienced
                  </div>

                )}


                {priceWinner === "left" && (

                  <div className="text-green-600 font-bold">
                    🏆 Best Price
                  </div>

                )}



                <p>
                  <b>Category:</b>{" "}
                  {leftWorker.services?.[0]?.category ?? "-"}
                </p>


                <p>
                  <b>Experience:</b>{" "}
                  {leftWorker.workExperience?.length ?? 0} jobs
                </p>


                <p>
                  <b>Rating:</b>{" "}
                  ⭐ {leftRating}
                </p>


                <p>
                  <b>Price:</b>{" "}
                  ₱{leftWorker.services?.[0]?.price ?? "-"}
                </p>


                <div>

                  <b>Services:</b>

                  <ul className="list-disc ml-5 mt-2">

                    {leftWorker.services?.map(
                      (service: any) => (

                        <li key={service.id}>
                          {service.service_name}
                        </li>

                      )
                    )}

                  </ul>

                </div>
                <button
                  onClick={() =>
                    navigate(`/customer/book/${leftId}`)
                  }
                  className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg"
                >
                  Book This Worker
                </button>


              </div>

            )}

          </div>



          {/* WORKER B */}


          <div
            className={`bg-white rounded-xl shadow p-6 border-2
              ${
                ratingWinner === "right" ||
                experienceWinner === "right" ||
                priceWinner === "right"
                  ? "border-green-500"
                  : "border-transparent"
              }
            `}
          >

            <h2 className="text-xl font-semibold mb-4">
              Worker B
            </h2>


            <select
              value={rightId}
              onChange={(e) => setRightId(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full mb-5"
            >

              <option value="">
                Select Worker
              </option>


              {workers.map((worker) => (

                <option
                  key={worker.id}
                  value={worker.id}
                >
                  {worker.first_name}{" "}
                  {worker.last_name}
                </option>

              ))}

            </select>



            {rightWorker && (

              <div className="space-y-3">


                <h3 className="text-xl font-bold">

                  {rightWorker.profile?.first_name}{" "}
                  {rightWorker.profile?.last_name}

                </h3>



                {ratingWinner === "right" && (

                  <div className="text-green-600 font-bold">
                    🏆 Highest Rated
                  </div>

                )}


                {experienceWinner === "right" && (

                  <div className="text-green-600 font-bold">
                    🏆 Most Experienced
                  </div>

                )}


                {priceWinner === "right" && (

                  <div className="text-green-600 font-bold">
                    🏆 Best Price
                  </div>

                )}



                <p>
                  <b>Category:</b>{" "}
                  {rightWorker.services?.[0]?.category ?? "-"}
                </p>


                <p>
                  <b>Experience:</b>{" "}
                  {rightWorker.workExperience?.length ?? 0} jobs
                </p>


                <p>
                  <b>Rating:</b>{" "}
                  ⭐ {rightRating}
                </p>


                <p>
                  <b>Price:</b>{" "}
                  ₱{rightWorker.services?.[0]?.price ?? "-"}
                </p>



                <div>

                  <b>Services:</b>

                  <ul className="list-disc ml-5 mt-2">

                    {rightWorker.services?.map(
                      (service: any) => (

                        <li key={service.id}>
                          {service.service_name}
                        </li>

                      )
                    )}

                  </ul>

                </div>
                <button
                  onClick={() =>
                    navigate(`/customer/book/${rightId}`)
                  }
                  className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg"
                >
                  Book This Worker
                </button>


              </div>

            )}

          </div>


        </div>

      </div>

    </CustomerLayout>
  );
}
