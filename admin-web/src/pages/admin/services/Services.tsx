import { useEffect, useState } from "react";

import AdminLayout from "../../../layouts/AdminLayout";

import {
  getPendingServices,
  approveService,
  rejectService,
} from "../../../services/serviceService";

export default function Services() {
  const [services, setServices] = useState<any[]>([]);

  useEffect(() => {
    loadServices();
  }, []);

  async function loadServices() {
    const data = await getPendingServices();
    setServices(data);
  }

  async function handleApprove(id: number) {
    await approveService(id);
    loadServices();
  }

  async function handleReject(id: number) {
    await rejectService(id);
    loadServices();
  }

  return (
    <AdminLayout>

      <div className="space-y-6">

        <h1 className="text-3xl font-bold">
          Pending Services
        </h1>
        <div className="bg-white rounded-2xl shadow overflow-hidden">

<table className="w-full">

<thead>

<tr className="border-b">

<th className="text-left p-4">
Worker
</th>

<th>Category</th>

<th>Service</th>

<th>Price</th>

<th>Status</th>

<th>Action</th>

</tr>

</thead>

<tbody>

{services.map((service)=>(

<tr
key={service.id}
className="border-b"
>

<td className="p-4">
{service.worker.first_name}{" "}
{service.worker.last_name}
</td>

<td>
{service.category}
</td>

<td>
{service.service_name}
</td>

<td>
₱{service.price}
</td>

<td>

<span className="bg-yellow-500 text-white px-3 py-1 rounded-full">

{service.status}

</span>

</td>

<td className="space-x-2">

<button
onClick={()=>handleApprove(service.id)}
className="bg-green-600 text-white px-4 py-2 rounded"
>

Approve

</button>

<button
onClick={()=>handleReject(service.id)}
className="bg-red-600 text-white px-4 py-2 rounded"
>

Reject

</button>

</td>

</tr>

))}

</tbody>

</table>

</div>

</div>

</AdminLayout>

);

}