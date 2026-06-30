import { useEffect, useState } from "react";
import CustomerLayout from "../../../layouts/CustomerLayout";
import { supabase } from "../../../lib/supabase";

export default function Profile() {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    setProfile(data);
  }

  async function saveProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone,
        address: profile.address,
      })
      .eq("id", user.id);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Profile updated successfully!");
  }

  if (!profile) {
    return (
      <CustomerLayout>
        <div>Loading...</div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>

      <div className="bg-white rounded-2xl shadow p-8 max-w-3xl">

        <h1 className="text-3xl font-bold mb-8">
          My Profile
        </h1>

        <div className="grid grid-cols-2 gap-5">

          <input
            value={profile.first_name || ""}
            onChange={(e) =>
              setProfile({
                ...profile,
                first_name: e.target.value,
              })
            }
            placeholder="First Name"
            className="border rounded-xl p-3"
          />

          <input
            value={profile.last_name || ""}
            onChange={(e) =>
              setProfile({
                ...profile,
                last_name: e.target.value,
              })
            }
            placeholder="Last Name"
            className="border rounded-xl p-3"
          />

          <input
            value={profile.email || ""}
            disabled
            className="border rounded-xl p-3 bg-gray-100"
          />

          <input
            value={profile.phone || ""}
            onChange={(e) =>
              setProfile({
                ...profile,
                phone: e.target.value,
              })
            }
            placeholder="Phone"
            className="border rounded-xl p-3"
          />

        </div>

        <textarea
          value={profile.address || ""}
          onChange={(e) =>
            setProfile({
              ...profile,
              address: e.target.value,
            })
          }
          placeholder="Address"
          className="border rounded-xl p-3 w-full mt-5"
          rows={4}
        />

        <button
          onClick={saveProfile}
          className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl"
        >
          Save Changes
        </button>

      </div>

    </CustomerLayout>
  );
}