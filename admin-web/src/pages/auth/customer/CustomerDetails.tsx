import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getCustomer } from "../../../services/customerService";

export default function CustomerDetails() {
  const { id } = useParams();

  const [customer, setCustomer] = useState<any>(null);

  useEffect(() => {
    if (id) {
      loadCustomer();
    }
  }, [id]);

  async function loadCustomer() {
    const data = await getCustomer(id!);
    setCustomer(data);
  }

  if (!customer) {
    return (
      <div className="p-10 text-xl">
        Loading...
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">

      <h1 className="text-3xl font-bold">
        Customer Details
      </h1>

      {/* PERSONAL INFORMATION */}

      <div className="bg-white rounded-xl shadow p-8">

        <h2 className="text-xl font-bold mb-6">
          Personal Information
        </h2>

        <div className="grid grid-cols-2 gap-6">

          <div>
            <strong>Full Name</strong>
            <p>{customer.full_name}</p>
          </div>

          <div>
            <strong>Email</strong>
            <p>{customer.email}</p>
          </div>

          <div>
            <strong>Phone</strong>
            <p>{customer.phone}</p>
          </div>

          <div>
            <strong>Gender</strong>
            <p>{customer.gender}</p>
          </div>

          <div>
            <strong>Birth Date</strong>
            <p>{customer.birth_date}</p>
          </div>

          <div>
            <strong>Status</strong>

            <span
              className={`px-3 py-1 rounded-full text-white ${
                customer.status === "Active"
                  ? "bg-green-600"
                  : "bg-yellow-500"
              }`}
            >
              {customer.status}
            </span>

          </div>

          <div className="col-span-2">
            <strong>Address</strong>
            <p>{customer.address}</p>
          </div>

        </div>

      </div>

      {/* BOOKING HISTORY */}

      <div className="bg-white rounded-xl shadow p-8">

        <h2 className="text-xl font-bold mb-6">
          Booking History
        </h2>

        <p className="text-gray-500">
          Booking history will appear here.
        </p>

      </div>

      {/* RATINGS */}

      <div className="bg-white rounded-xl shadow p-8">

        <h2 className="text-xl font-bold mb-6">
          Ratings Given
        </h2>

        <p className="text-gray-500">
          Ratings will appear here.
        </p>

      </div>

    </div>
  );
}