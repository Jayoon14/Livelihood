import CustomerLayout from "../../../layouts/CustomerLayout";
import {
  Search,
  Hammer,
  Wrench,
  Paintbrush,
  Zap,
  Droplets,
  Star,
} from "lucide-react";

export default function CustomerDashboard() {
  const categories = [
    {
      name: "Carpenter",
      icon: Hammer,
    },
    {
      name: "Electrician",
      icon: Zap,
    },
    {
      name: "Plumber",
      icon: Droplets,
    },
    {
      name: "Painter",
      icon: Paintbrush,
    },
    {
      name: "Mechanic",
      icon: Wrench,
    },
  ];

  return (
    <CustomerLayout>
      <div className="space-y-8">

        {/* HERO */}

        <div className="bg-gradient-to-r from-blue-700 to-blue-500 rounded-3xl p-10 text-white">

          <h1 className="text-4xl font-bold">
            Find Skilled Workers Near You
          </h1>

          <p className="mt-3 text-blue-100 max-w-2xl">
            Search trusted professionals for carpentry,
            electrical, plumbing, painting, welding and more.
          </p>

          <div className="relative mt-8">

            <Search
              className="absolute left-5 top-4 text-gray-400"
              size={22}
            />

            <input
              placeholder="Search workers or services..."
              className="w-full rounded-xl py-4 pl-14 pr-5 text-black outline-none"
            />

          </div>

        </div>

        {/* CATEGORIES */}

        <div>

          <h2 className="text-2xl font-bold mb-5">
            Popular Categories
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">

            {categories.map((category) => {

              const Icon = category.icon;

              return (

                <button
                  key={category.name}
                  className="bg-white rounded-2xl shadow hover:shadow-lg transition p-8 flex flex-col items-center"
                >

                  <div className="bg-blue-100 p-5 rounded-full">

                    <Icon
                      className="text-blue-700"
                      size={34}
                    />

                  </div>

                  <p className="mt-4 font-semibold">
                    {category.name}
                  </p>

                </button>

              );

            })}

          </div>

        </div>

        {/* FEATURED WORKERS */}

        <div>

          <div className="flex justify-between items-center mb-5">

            <h2 className="text-2xl font-bold">
              Featured Workers
            </h2>

            <button className="text-blue-600 font-semibold hover:underline">
              View All
            </button>

          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">

            {[1, 2, 3].map((worker) => (

              <div
                key={worker}
                className="bg-white rounded-2xl shadow hover:shadow-xl transition overflow-hidden"
              >

                <img
                  src={`https://i.pravatar.cc/400?img=${worker}`}
                  alt="Worker"
                  className="w-full h-52 object-cover"
                />

                <div className="p-6">

                  <h3 className="text-xl font-bold">
                    Juan Dela Cruz
                  </h3>

                  <p className="text-gray-500 mt-1">
                    Electrician
                  </p>

                  <div className="flex items-center gap-2 mt-3">

                    <Star
                      className="text-yellow-500 fill-yellow-500"
                      size={18}
                    />

                    <span className="font-semibold">
                      4.9
                    </span>

                  </div>

                  <button
                    className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl transition"
                  >
                    View Profile
                  </button>

                </div>

              </div>

            ))}

          </div>

        </div>

      </div>
    </CustomerLayout>
  );
}