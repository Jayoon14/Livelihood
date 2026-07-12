import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { getCustomer } from "../../../services/customerService";


export default function CustomerDetails() {

  const { id } = useParams<{ id: string }>();

  const [customer, setCustomer] = useState<any>(null);


  useEffect(() => {

    loadCustomer();

  }, [id]);



  async function loadCustomer() {

    if (!id) return;

    const data = await getCustomer(id);

    setCustomer(data);

  }



  if (!customer) {

    return (

      <div className="p-8">

        Loading...

      </div>

    );

  }



  return (

    <div className="max-w-6xl mx-auto p-8">


      {/* HEADER */}

      <div className="flex items-center gap-6 mb-10">


        {customer.profile_picture ? (

          <img

            src={customer.profile_picture}

            alt="Profile"

            className="
              w-24
              h-24
              rounded-full
              object-cover
              border
            "

          />

        ) : (

          <div className="
            w-24
            h-24
            rounded-full
            bg-blue-100
            flex
            items-center
            justify-center
            text-blue-700
            text-4xl
            font-bold
          ">

            {customer.first_name
              ?.charAt(0)
              ?.toUpperCase()
            }

          </div>

        )}



        <div>


          <h1 className="text-4xl font-bold">

            {customer.first_name}{" "}
            {customer.middle_name}{" "}
            {customer.last_name}{" "}
            {customer.suffix}

          </h1>



          <p className="text-gray-500 mt-2">

            {customer.email}

          </p>



          <span className="
            inline-block
            mt-3
            px-4
            py-1
            rounded-full
            bg-green-100
            text-green-700
            font-semibold
          ">

            {customer.status || "Active"}

          </span>


        </div>


      </div>





      {/* PERSONAL INFORMATION */}


      <Section title="👤 Personal Information">


        <div className="grid grid-cols-2 gap-6">


          <Info
            title="Full Name"
            value={`
              ${customer.first_name || ""}
              ${customer.middle_name || ""}
              ${customer.last_name || ""}
              ${customer.suffix || ""}
            `}
          />


          <Info
            title="Email"
            value={customer.email}
          />


          <Info
            title="Phone"
            value={customer.phone}
          />


          <Info
            title="Gender"
            value={customer.gender}
          />


          <Info
            title="Birth Date"
            value={
              customer.birth_date
                ? new Date(
                    customer.birth_date
                  ).toLocaleDateString("en-GB")
                : "-"
            }
          />


          <Info
            title="Civil Status"
            value={customer.civil_status}
          />


          <Info
            title="Religion"
            value={customer.religion}
          />


          <Info
            title="House No."
            value={customer.house_no}
          />


          <Info
            title="Street"
            value={customer.street}
          />


          <Info
            title="Barangay"
            value={customer.barangay}
          />


          <Info
            title="Municipality"
            value={customer.municipality}
          />


          <Info
            title="Province"
            value={customer.province}
          />


        </div>


      </Section>





      {/* BOOKING HISTORY */}


      <Section title="📅 Booking History">


        <div className="
          border
          rounded-xl
          p-6
          bg-gray-50
          text-center
          text-gray-500
        ">

          No bookings found.

        </div>


      </Section>





      {/* RATINGS */}


      <Section title="⭐ Ratings Given">


        <div className="
          border
          rounded-xl
          p-6
          bg-gray-50
          text-center
          text-gray-500
        ">

          No ratings yet.

        </div>


      </Section>


    </div>

  );

}





function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {


  return (

    <div className="
      bg-white
      rounded-2xl
      shadow-lg
      border
      border-slate-200
      mb-8
      overflow-hidden
    ">


      <div className="
        bg-slate-50
        px-6
        py-4
        border-b
      ">


        <h2 className="text-xl font-bold">

          {title}

        </h2>


      </div>



      <div className="p-6">

        {children}

      </div>


    </div>

  );

}





function Info({
  title,
  value,
}: {
  title: string;
  value: any;
}) {


  return (

    <div>


      <p className="text-gray-500 text-sm">

        {title}

      </p>



      <p className="font-semibold mt-1 break-words">

        {value || "-"}

      </p>


    </div>

  );

}