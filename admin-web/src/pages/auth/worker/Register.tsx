import { Link } from "react-router-dom";
import { UserRound, ArrowRight } from "lucide-react";

export default function WorkerRegister() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-10">
        {/* Logo */}

        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center">
            <UserRound size={40} className="text-white" />
          </div>

          <h1 className="text-3xl font-bold mt-5">Worker Registration</h1>

          <p className="text-gray-500 mt-2 text-center">
            Register as a skilled worker and complete the registration process.
          </p>
        </div>

        {/* Information */}

        <div className="mt-10 rounded-xl bg-blue-50 p-6">
          <h2 className="font-semibold text-lg mb-3">Registration Process</h2>

          <ul className="space-y-2 text-gray-700">
            <li>✓ Personal Information</li>

            <li>✓ Educational Background</li>

            <li>✓ Work Experience</li>

            <li>✓ Skills & Certifications</li>

            <li>✓ Upload Documents</li>

            <li>✓ Confirmation</li>
          </ul>
        </div>

        {/* Button */}

        <Link
          to="/register"
          className="mt-8 w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 flex items-center justify-center gap-2 transition"
        >
          Start Registration
          <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
}
