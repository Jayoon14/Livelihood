import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import AdminLayout from "../../../layouts/AdminLayout";

import { getCustomers } from "../../../services/customerService";

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    const data = await getCustomers();

    setCustomers(data);
  }

  async function handleSearch(value: string) {
    setSearch(value);

    const data = await getCustomers(value);

    setCustomers(data);
  }

  function getFullName(customer: any) {
    return [customer.first_name, customer.middle_name, customer.last_name]
      .filter(Boolean)
      .join(" ");
  }

  return (
    <AdminLayout>
      <div className="p-8">
        {/* HEADER */}

        <div
          className="
          flex
          justify-between
          items-center
          mb-8
        "
        >
          <h1 className="text-3xl font-bold">Customers Management</h1>

          <input
            type="text"
            placeholder="Search customer..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="
              border
              rounded-lg
              px-4
              py-2
              w-80
            "
          />
        </div>

        {/* TABLE */}

        <div
          className="
          bg-white
          rounded-xl
          shadow
          overflow-hidden
        "
        >
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-4">Name</th>

                <th className="text-left p-4">Email</th>

                <th className="text-left p-4">Phone</th>

                <th className="text-left p-4">Status</th>

                <th className="text-left p-4">Action</th>
              </tr>
            </thead>

            <tbody>
              {customers.length > 0 ? (
                customers.map((customer) => (
                  <tr key={customer.id} className="border-t">
                    <td className="p-4">
                      <div
                        className="
                        flex
                        items-center
                        gap-3
                      "
                      >
                        {customer.profile_picture ? (
                          <img
                            src={customer.profile_picture}
                            alt="Profile"
                            className="
                              w-10
                              h-10
                              rounded-full
                              object-cover
                            "
                          />
                        ) : (
                          <div
                            className="
                            w-10
                            h-10
                            rounded-full
                            bg-blue-100
                            flex
                            items-center
                            justify-center
                            text-blue-700
                            font-bold
                          "
                          >
                            {customer.first_name?.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <span className="font-semibold">
                          {getFullName(customer)}
                        </span>
                      </div>
                    </td>

                    <td className="p-4">{customer.email}</td>

                    <td className="p-4">{customer.phone || "-"}</td>

                    <td className="p-4">
                      <span
                        className="
                        px-3
                        py-1
                        rounded-full
                        bg-green-100
                        text-green-700
                        font-semibold
                      "
                      >
                        {customer.status || "Active"}
                      </span>
                    </td>

                    <td className="p-4">
                      <Link
                        to={`/customers/${customer.id}`}
                        className="
                          bg-blue-600
                          hover:bg-blue-700
                          text-white
                          px-4
                          py-2
                          rounded-lg
                        "
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="
                      text-center
                      p-8
                      text-gray-500
                    "
                  >
                    No customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
