import {
  Mail,
  Phone,
} from "lucide-react";


interface Props {
  customer: any;
}


export default function CustomerProfileCard({
  customer,
}: Props) {


  const fullName =
    `${customer?.first_name ?? ""} ${customer?.last_name ?? ""}`;


  return (

    <div className="border rounded-2xl bg-gray-50 p-6">


      <div className="flex items-center gap-5">


        {customer?.profile_picture ? (


          <img
            src={customer.profile_picture}
            alt={fullName}
            className="w-20 h-20 rounded-full object-cover border"
          />


        ) : (


          <div className="w-20 h-20 rounded-full bg-blue-600 text-white flex items-center justify-center text-3xl font-bold">


            {customer?.first_name?.charAt(0)}


          </div>


        )}




        <div>


          <h2 className="text-2xl font-bold">

            {fullName}

          </h2>



          <p className="text-gray-500">

            Customer

          </p>


        </div>


      </div>





      <div className="grid md:grid-cols-2 gap-6 mt-8">



        {/* Email */}

        <div>


          <p className="flex items-center gap-2 text-gray-400 text-sm">

            <Mail size={16} />

            Email

          </p>



          <p className="font-medium">

            {customer?.email || "-"}

          </p>


        </div>





        {/* Phone */}

        <div>


          <p className="flex items-center gap-2 text-gray-400 text-sm">

            <Phone size={16} />

            Contact Number

          </p>



          <p className="font-medium">

            {customer?.phone || "-"}

          </p>


        </div>



      </div>


    </div>

  );

}