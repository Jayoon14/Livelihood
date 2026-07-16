import CustomerLayout from "../../../layouts/CustomerLayout";
import { useNavigate } from "react-router-dom";

import {
  Trash2,
  LogOut,
} from "lucide-react";

import { logout } from "../../../services/authService";

import ChangePassword from "./ChangePassword";
import NotificationPreferences from "./NotificationPreferences";
import LanguageSettings from "./LanguageSettings";
import ThemeSettings from "./ThemeSettings";


export default function Settings() {

  const navigate = useNavigate();


  async function handleLogout() {

    await logout();

    navigate("/");

  }


  return (

    <CustomerLayout>

      <div className="max-w-4xl mx-auto space-y-6">


        <h1 className="text-3xl font-bold">
          Settings
        </h1>



        {/* Account */}

        <div className="bg-white rounded-2xl shadow p-6">

          <h2 className="text-xl font-semibold mb-5">
            Account
          </h2>

          <ChangePassword />

        </div>




        {/* Notifications */}

        <div className="bg-white rounded-2xl shadow p-6">

          <NotificationPreferences />

        </div>




        {/* Language */}

        <LanguageSettings />





        {/* Theme */}

        <ThemeSettings />





        {/* Danger Zone */}

        <div className="bg-white rounded-2xl shadow border border-red-200 p-6">

          <h2 className="text-xl font-semibold text-red-600 mb-5">
            Danger Zone
          </h2>


          <button
            className="flex items-center gap-3 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl"
          >

            <Trash2 size={20} />

            Delete Account

          </button>

        </div>





        {/* Logout */}

        <div className="bg-white rounded-2xl shadow p-6">

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 bg-gray-800 hover:bg-black text-white px-6 py-3 rounded-xl"
          >

            <LogOut size={20} />

            Logout

          </button>

        </div>


      </div>


    </CustomerLayout>

  );

}