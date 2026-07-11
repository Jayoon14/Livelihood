import { useEffect, useState } from "react";
import AdminLayout from "../../../layouts/AdminLayout";
import { getCustomers } from "../../../services/customerService";

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    const data = await getCustomers();
    setCustomers(data);
  }

  return (
    <AdminLayout>
      <div className="p-8">

        <h1 className="text-3xl font-bold mb-8">
          Customers
        </h1>

        <div className="bg-white rounded-xl shadow overflow-hidden">

          <table className="w-full">

            <thead className="bg-gray-100">

              <tr>
                <th className="p-4 text-left">Name</th>
                <th className="p-4 text-left">Email</th>
                <th className="p-4 text-left">Status</th>
              </tr>

            </thead>

            <tbody>

              {customers.map((customer) => (

                <tr key={customer.id} className="border-b">

                  <td className="p-4">
                    {customer.first_name} {customer.last_name}
                  </td>

                  <td className="p-4">
                    {customer.email}
                  </td>

                  <td className="p-4">
                    {customer.status}
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