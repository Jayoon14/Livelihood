import { useEffect, useState } from "react";

import {
  Search,
  SquarePen,
  Trash2,
  Package,
  CircleCheck,
  Clock3,
  CircleX
} from "lucide-react";

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
 const [search, setSearch] =
  useState("");

  const [statusFilter, setStatusFilter] =
    useState("All");



  useEffect(() => {
    loadServices();
  }, []);


  async function loadServices() {

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;


    const data =
      await getMyServices(user.id);


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
    } =
      await supabase.auth.getUser();


    if (!user) return;


   





    if (editing) {

      await updateService(
        editing.id,
        {
          category,
          service_name: serviceName,
          description,
          price: Number(price),
        }
      );


    } else {


      await createService(
        user.id,
        {
          category,
          service_name: serviceName,
          description,
          price: Number(price),
        }
      );


    }


    clearForm();

    loadServices();

  }


  function editService(service:any) {

    setEditing(service);

    setCategory(
      service.category
    );

    setServiceName(
      service.service_name
    );

    setDescription(
      service.description
    );

    setPrice(
      service.price
    );

  }


  async function removeService(id:number) {

    const ok =
      confirm(
        "Delete this service?"
      );


    if (!ok) return;


    await deleteService(id);


    loadServices();

  }


      const filteredServices =
      services.filter((service)=>{

        const keyword =
          search.toLowerCase();


        const matchesSearch =
          service.category
            ?.toLowerCase()
            .includes(keyword)

          ||

          service.service_name
            ?.toLowerCase()
            .includes(keyword);



        const matchesStatus =
          statusFilter === "All"
          ||
          service.status === statusFilter;


        return matchesSearch && matchesStatus;

      });



    const groupedServices =
      filteredServices.reduce(
        (groups:any, service:any)=>{


          if(!groups[service.category]){

            groups[service.category] = [];

          }


          groups[service.category].push(service);


          return groups;


        },
        {}
      );

  return (

    <WorkerLayout>

      <div className="max-w-6xl mx-auto space-y-8">


      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

        <div>
          <h1 className="text-4xl font-bold text-gray-800">
            My Services
          </h1>

          <p className="text-gray-500 mt-1">
            Manage and update the services you offer to customers.
          </p>
        </div>



      </div>



        {/* STATISTICS */}

       <div className="grid grid-cols-1 md:grid-cols-4 gap-5">


        <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all p-5 border">

        <div className="flex justify-between items-center">

        <div>

        <p className="text-gray-500">
        Total Services
        </p>

        <h2 className="text-4xl font-bold text-blue-600">
        {services.length}
        </h2>

        </div>

        <Package size={45} className="text-blue-600"/>

        </div>

        </div>



        <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all p-5 border">

        <div className="flex justify-between items-center">

        <div>

        <p className="text-gray-500">
        Approved
        </p>

        <h2 className="text-4xl font-bold text-green-600">

        {
        services.filter(
        s=>s.status==="Approved"
        ).length
        }

        </h2>

        </div>


        <CircleCheck
        size={45}
        className="text-green-600"
        />


        </div>

        </div>




        <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all p-5 border">

        <div className="flex justify-between items-center">

        <div>

        <p className="text-gray-500">
        Pending
        </p>

        <h2 className="text-4xl font-bold text-yellow-500">

        {
        services.filter(
        s=>s.status==="Pending"
        ).length
        }

        </h2>

        </div>


        <Clock3
        size={45}
        className="text-yellow-500"
        />

        </div>

        </div>




        <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all p-5 border">

        <div className="flex justify-between items-center">

        <div>

        <p className="text-gray-500">
        Rejected
        </p>

        <h2 className="text-4xl font-bold text-red-600">

        {
        services.filter(
        s=>s.status==="Rejected"
        ).length
        }

        </h2>

        </div>


        <CircleX
        size={45}
        className="text-red-600"
        />


        </div>

        </div>


        </div>




        {/* ADD SERVICE FORM */}

        <div className="bg-white rounded-2xl shadow p-6">


          <h2 className="text-2xl font-bold mb-6">
            {editing
              ? "Edit Service"
              : "Add New Service"}
          </h2>


          <div className="grid md:grid-cols-2 gap-5">


            <input
              placeholder="Category"
              value={category}
              onChange={(e)=>
                setCategory(e.target.value)
              }
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"

            />


            <input
              placeholder="Service Name"
              value={serviceName}
              onChange={(e)=>
                setServiceName(e.target.value)
              }
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"

            />



            <textarea

              placeholder="Description"

              value={description}

              onChange={(e)=>
                setDescription(e.target.value)
              }

              className="border rounded-lg p-3 md:col-span-2"

              rows={4}

            />



            <input

              type="number"

              placeholder="Price"

              value={price}

              onChange={(e)=>
                setPrice(e.target.value)
              }

              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"


            />



            <div className="md:col-span-2">

            </div>


          </div>
          <div className="flex gap-4 mt-6">


            <button

              onClick={saveService}

              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl"

            >

              {editing
                ? "Update Service"
                : "Add Service"}

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
        {/* SERVICES LIST */}

       <div className="bg-white rounded-2xl shadow-lg border-l-4 border-blue-600 p-6">


  <div className="flex flex-col md:flex-row gap-4 justify-between mb-8">


    <div className="relative w-full md:w-96">

      <Search
        size={18}
        className="absolute left-4 top-4 text-gray-400"
      />


      <input
        type="text"
        placeholder="Search services..."
        value={search}
        onChange={(e)=>
          setSearch(e.target.value)
        }
        className="w-full border border-gray-300 rounded-xl pl-11 pr-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
      />

    </div>



    <select

      value={statusFilter}

      onChange={(e)=>
        setStatusFilter(e.target.value)
      }

      className="border rounded-xl px-4 py-3 w-full md:w-56"

    >

      <option value="All">
        All Status
      </option>

      <option value="Approved">
        Approved
      </option>

      <option value="Pending">
        Pending
      </option>

      <option value="Rejected">
        Rejected
      </option>

    </select>


  </div>



{Object.entries(groupedServices).map(([category, categoryServices]: any) => (

  <div key={category} className="mb-10">

    {/* CATEGORY TITLE */}
    <h2 className="text-2xl font-bold text-gray-800 mb-5">
      {category}
    </h2>

    {/* CARDS */}
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

      {categoryServices.map((service: any) => (

        <div
          key={service.id}
          className="bg-white rounded-2xl border shadow hover:shadow-xl transition"
        >

          <div className="p-6">

            <div className="flex justify-between items-start">

              <div>

                <h3 className="text-xl font-bold">
                  {service.service_name}
                </h3>

                <p className="text-gray-500 mt-1">
                  {service.description}
                </p>

              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  service.status === "Approved"
                    ? "bg-green-100 text-green-700"
                    : service.status === "Pending"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {service.status}
              </span>

            </div>

            <div className="mt-5">

              <p className="text-gray-400 text-sm">
                Starting Price
              </p>

              <h2 className="text-3xl font-bold text-blue-600">
                ₱{Number(service.price).toLocaleString()}
              </h2>

            </div>

            <div className="flex gap-3 mt-6">

              <button
                onClick={() => editService(service)}
                className="flex-1 flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-xl"
              >
                <SquarePen size={18} />
                Edit
              </button>

              <button
                onClick={() => removeService(service.id)}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl"
              >
                <Trash2 size={18} />
                Delete
              </button>

            </div>

          </div>

        </div>

      ))}

    </div>

  </div>

))}




  {filteredServices.length === 0 && (

    <div className="py-16 text-center">


      <div className="text-7xl">

        🛠️

      </div>


      <h2 className="text-2xl font-bold mt-4">

        No Services Yet

      </h2>


      <p className="text-gray-500 mt-2">

        Create your first service and start accepting bookings.

      </p>


    </div>

  )}


      </div> {/* Services List */}

    </div> {/* Container */}

    </WorkerLayout>
  );
}