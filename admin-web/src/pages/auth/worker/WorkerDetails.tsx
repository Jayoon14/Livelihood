import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getWorkerById } from "../../../services/workerService";

export default function WorkerDetails() {
  const { id } = useParams();

  const [worker, setWorker] = useState<any>(null);

  useEffect(() => {
    loadWorker();
  }, []);

  async function loadWorker() {
    if (!id) return;

    const data = await getWorkerById(id);

    setWorker(data);
  }

  if (!worker) {
    return (
      <div className="p-10">
        Loading...
      </div>
    );
  }

  return (
    <div className="p-10">

      <h1 className="text-3xl font-bold mb-8">
        Worker Details
      </h1>

      <div className="bg-white rounded-xl shadow p-8 space-y-4">

        <div>
          <strong>Full Name:</strong> {worker.full_name}
        </div>

        <div>
          <strong>Email:</strong> {worker.email}
        </div>

        <div>
          <strong>Role:</strong> {worker.role}
        </div>

        <div>
          <strong>Status:</strong> {worker.status}
        </div>

      </div>

    </div>
  );
}