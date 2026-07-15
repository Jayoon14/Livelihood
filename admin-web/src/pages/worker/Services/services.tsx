import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import WorkerLayout from "../../../layouts/WorkerLayout";

import {
  getMyServices,
  createService,
  updateService,
  deleteService,
} from "../../../services/serviceService";

export default function Services() {
  const [services, setServices] = useState<any[]>([]);

  const [editing, setEditing] = useState<any>(null);

  const [category, setCategory] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  useEffect(() => {
    loadServices();
  }, []);

  async function loadServices() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const data = await getMyServices(user.id);

    setServices(data);
  }

  function clearForm() {
    setEditing(null);
    setCategory("");
    setServiceName("");
    setDescription("");
    setPrice("");
  }

  async function saveService() {
    if (
      !category ||
      !serviceName ||
      !description ||
      !price
    ) {
      alert("Complete all fields.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    if (editing) {
      await updateService(editing.id, {
        category,
        service_name: serviceName,
        description,
        price: Number(price),
      });
    } else {
      await createService(user.id, {
        category,
        service_name: serviceName,
        description,
        price: Number(price),
      });
    }

    clearForm();
    loadServices();
  }

  function editService(service: any) {
    setEditing(service);

    setCategory(service.category);
    setServiceName(service.service_name);
    setDescription(service.description);
    setPrice(service.price);
  }

  async function removeService(id: number) {
    const ok = confirm(
      "Delete this service?"
    );

    if (!ok) return;

    await deleteService(id);

    loadServices();
  }

  return (
    <WorkerLayout>

      <div className="max-w-6xl mx-auto space-y-8">

        <h1 className="text-3xl font-bold">
          My Services
        </h1>
        <div className="bg-white rounded-2xl shadow p-6">

  <h2 className="text-2xl font-bold mb-6">
    {editing ? "Edit Service" : "Add New Service"}
  </h2>

  <div className="grid md:grid-cols-2 gap-5">

    <input
      placeholder="Category"
      value={category}
      onChange={(e) => setCategory(e.target.value)}
      className="border rounded-lg p-3"
    />

    <input
      placeholder="Service Name"
      value={serviceName}
      onChange={(e) => setServiceName(e.target.value)}
      className="border rounded-lg p-3"
    />

    <textarea
      placeholder="Description"
      value={description}
      onChange={(e) => setDescription(e.target.value)}
      className="border rounded-lg p-3 md:col-span-2"
      rows={4}
    />

    <input
      type="number"
      placeholder="Price"
      value={price}
      onChange={(e) => setPrice(e.target.value)}
      className="border rounded-lg p-3"
    />

  </div>

  <div className="flex gap-4 mt-6">

    <button
      onClick={saveService}
      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl"
    >
      {editing ? "Update Service" : "Add Service"}
    </button>

    {editing && (
      <button
        onClick={clearForm}
        className="bg-gray-300 px-6 py-3 rounded-xl"
      >
        Cancel
      </button>
    )}

  </div>

</div>


<div className="bg-white rounded-2xl shadow p-6">

  <h2 className="text-2xl font-bold mb-6">
    My Services
  </h2>

  <table className="w-full">

    <thead>

      <tr className="border-b">

        <th className="text-left py-3">Category</th>

        <th className="text-left">Service</th>

        <th className="text-left">Price</th>

        <th className="text-left">Status</th>

        <th className="text-center">Actions</th>

      </tr>

    </thead>

    <tbody>

      {services.map((service) => (

        <tr
          key={service.id}
          className="border-b"
        >

          <td className="py-4">
            {service.category}
          </td>

          <td>
            {service.service_name}
          </td>

          <td>
            ₱{service.price}
          </td>

          <td>

            <span
              className={`px-3 py-1 rounded-full text-white text-sm ${
                service.status === "Approved"
                  ? "bg-green-600"
                  : service.status === "Pending"
                  ? "bg-yellow-500"
                  : "bg-red-600"
              }`}
            >
              {service.status}
            </span>

          </td>

          <td className="text-center space-x-2">

            <button
              onClick={() => editService(service)}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg"
            >
              Edit
            </button>

            <button
              onClick={() => removeService(service.id)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
            >
              Delete
            </button>

          </td>

        </tr>

      ))}

    </tbody>

  </table>

</div>

</div>

</WorkerLayout>
);
}