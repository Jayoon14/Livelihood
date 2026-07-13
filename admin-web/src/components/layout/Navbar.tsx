import { Bell, UserCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Navbar() {
  const [name, setName] = useState("Customer");
  const [email, setEmail] = useState("");

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setEmail(user.email || "");

    const { data } = await supabase
      .from("profiles")
      .select("first_name,last_name")
      .eq("id", user.id)
      .single();

    if (data) {
      setName(`${data.first_name ?? ""} ${data.last_name ?? ""}`);
    }
  }

  return (
    <header className="bg-white shadow px-8 py-5 flex justify-between items-center">

      <div>
        <h1 className="text-2xl font-bold">
          Customer Dashboard
        </h1>

        <p className="text-gray-500">
          Welcome back, {name}
        </p>
      </div>

      <div className="flex items-center gap-6">

        <button className="relative">
          <Bell className="text-gray-600" size={24} />
        </button>

        <div className="flex items-center gap-3">

          <UserCircle
            className="text-blue-600"
            size={40}
          />

          <div>

            <p className="font-semibold">
              {name}
            </p>

            <p className="text-sm text-gray-500">
              {email}
            </p>

          </div>

        </div>

      </div>

    </header>
  );
}