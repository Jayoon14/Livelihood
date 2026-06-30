import { Search } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-slate-100">

      {/* Navbar */}
      <div className="bg-white shadow px-8 py-4 flex justify-between items-center">

        <h1 className="text-2xl font-bold text-blue-600">
          Customer Dashboard
        </h1>

        <div className="font-medium">
          Welcome 👋
        </div>

      </div>

      <div className="p-8">

        {/* Search */}

        <div className="bg-white rounded-xl shadow p-4 flex items-center gap-3">

          <Search className="text-gray-400"/>

          <input
            type="text"
            placeholder="Search worker..."
            className="w-full outline-none"
          />

        </div>

        {/* Categories */}

        <h2 className="text-2xl font-bold mt-10 mb-5">
          Categories
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">

          {[
            "Carpenter",
            "Electrician",
            "Plumber",
            "Painter",
            "Cleaner",
            "Aircon"
          ].map((category) => (

            <div
              key={category}
              className="bg-white rounded-xl shadow hover:shadow-lg transition p-6 text-center cursor-pointer"
            >

              <div className="text-lg font-semibold">
                {category}
              </div>

            </div>

          ))}

        </div>

        {/* Featured Workers */}

        <h2 className="text-2xl font-bold mt-12 mb-5">
          Featured Workers
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

          {[1,2,3].map((worker)=>(
            <div
              key={worker}
              className="bg-white rounded-xl shadow p-6"
            >

              <div className="w-20 h-20 rounded-full bg-blue-100 mx-auto"></div>

              <h3 className="text-xl font-bold text-center mt-4">
                Worker Name
              </h3>

              <p className="text-gray-500 text-center">
                Carpenter
              </p>

              <button
                className="w-full mt-5 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg"
              >
                View Profile
              </button>

            </div>
          ))}

        </div>

      </div>

    </div>
  );
}