import { useEffect, useState } from "react";

import CustomerLayout from "../../../layouts/CustomerLayout";
import { supabase } from "../../../lib/supabase";

import {
  getProfile,
  updateProfile,
  uploadAvatar,
} from "../../../services/profileService";

export default function Profile() {
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const data = await getProfile(user.id);

    setProfile(data);
  }

  async function handleSave() {
    try {
      await updateProfile(profile.id, {
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone,
        address: profile.address,
      });

      alert("Profile updated successfully.");

      setEditing(false);

      loadProfile();
    } catch (error) {
      console.error(error);
      alert("Unable to update profile.");
    }
  }

  async function handleUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];

    if (!file) return;

    try {
      setUploading(true);

      const url = await uploadAvatar(profile.id, file);

      setProfile({
        ...profile,
        profile_image: url,
      });

      alert("Profile picture updated.");
    } catch (error) {
      console.error(error);
      alert("Unable to upload profile picture.");
    } finally {
      setUploading(false);
    }
  }

  if (!profile) {
    return (
      <CustomerLayout>
        <div className="p-10 text-center">
          Loading...
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-8">

        {/* PROFILE IMAGE */}

        <div className="flex flex-col items-center mb-8">

          <img
            src={
              profile.profile_image ||
              "https://placehold.co/150x150"
            }
            alt="Profile"
            className="w-32 h-32 rounded-full object-cover border-4 border-blue-600 shadow"
          />

          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            disabled={uploading}
            className="mt-4"
          />

          {uploading && (
            <p className="text-sm text-gray-500 mt-2">
              Uploading image...
            </p>
          )}

        </div>

        {/* HEADER */}

        <div className="flex items-center justify-between mb-8">

          <h1 className="text-3xl font-bold">
            My Profile
          </h1>

          <button
            onClick={() => setEditing(!editing)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg"
          >
            {editing ? "Cancel" : "Edit Profile"}
          </button>

        </div>

        {/* PROFILE FORM */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          <div>

            <label className="block mb-2 font-medium">
              First Name
            </label>

            <input
              disabled={!editing}
              value={profile.first_name || ""}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  first_name: e.target.value,
                })
              }
              className="border rounded-lg p-3 w-full disabled:bg-gray-100"
            />

          </div>

          <div>

            <label className="block mb-2 font-medium">
              Last Name
            </label>

            <input
              disabled={!editing}
              value={profile.last_name || ""}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  last_name: e.target.value,
                })
              }
              className="border rounded-lg p-3 w-full disabled:bg-gray-100"
            />

          </div>

          <div>

            <label className="block mb-2 font-medium">
              Email
            </label>

            <input
              value={profile.email || ""}
              disabled
              className="border rounded-lg p-3 w-full bg-gray-100"
            />

          </div>

          <div>

            <label className="block mb-2 font-medium">
              Phone Number
            </label>

            <input
              disabled={!editing}
              value={profile.phone || ""}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  phone: e.target.value,
                })
              }
              className="border rounded-lg p-3 w-full disabled:bg-gray-100"
            />

          </div>

        </div>

        <div className="mt-6">

          <label className="block mb-2 font-medium">
            Address
          </label>

          <textarea
            disabled={!editing}
            value={profile.address || ""}
            onChange={(e) =>
              setProfile({
                ...profile,
                address: e.target.value,
              })
            }
            rows={4}
            className="border rounded-lg p-3 w-full disabled:bg-gray-100"
          />

        </div>

        {editing && (

          <button
            onClick={handleSave}
            className="mt-8 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg"
          >
            Save Changes
          </button>

        )}

      </div>
    </CustomerLayout>
  );
}