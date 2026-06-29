import { Link } from "react-router-dom";
import { User, Briefcase } from "lucide-react";

export default function RegisterChoice() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">

      <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-3xl">

        {/* HEADER */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold">
            Create an Account
          </h1>

          <p className="text-gray-500 mt-2">
            Select the type of account you want to register.
          </p>
        </div>

        {/* CARDS */}
        <div className="grid grid-cols-2 gap-8">

          {/* CUSTOMER */}
          <Link
            to="/register/customer"
            className="border rounded-xl p-10 hover:border-blue-600 hover:shadow-xl transition cursor-pointer bg-white hover:bg-blue-50"
          >
            <div className="flex flex-col items-center">

              <User size={60} className="text-blue-600" />

              <h2 className="text-xl font-bold mt-6">
                Customer
              </h2>

              <p className="text-gray-500 text-center mt-3">
                Register to hire skilled workers.
              </p>

            </div>
          </Link>

          {/* WORKER */}
          <Link
            to="/register/worker"
            className="border rounded-xl p-10 hover:border-blue-600 hover:shadow-xl transition cursor-pointer bg-white hover:bg-green-50"
          >
            <div className="flex flex-col items-center">

              <Briefcase size={60} className="text-blue-600" />

              <h2 className="text-xl font-bold mt-6">
                Worker
              </h2>

              <p className="text-gray-500 text-center mt-3">
                Register to offer your services.
              </p>

            </div>
          </Link>

        </div>

        {/* BACK */}
        <div className="text-center mt-10">
          <Link to="/" className="text-blue-600 hover:underline">
            Back to Login
          </Link>
        </div>

      </div>
    </div>
  );
}