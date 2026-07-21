import { useEffect, useState } from "react";
import WorkerLayout from "../../../layouts/WorkerLayout";

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

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file || !profile) return;

    try {
      setUploading(true);

      const url = await uploadAvatar(profile.id, file);

      setProfile({
        ...profile,
        profile_picture: url,
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
      <WorkerLayout>
        <div className="p-8 text-center">Loading...</div>
      </WorkerLayout>
    );
  }

  return (
    <WorkerLayout>
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow p-6">
        <div className="flex flex-col items-center mb-6">
          <img
            src={
              profile.profile_picture
                ? profile.profile_picture
                : "https://placehold.co/150x150?text=Avatar"
            }
            alt="Profile"
            className="w-32 h-32 rounded-full object-cover border-4 border-blue-600 shadow"
          />

          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            disabled={uploading}
            className="mt-3"
          />
        </div>

        <div className="flex justify-between items-center mb-5">
          <h1 className="text-2xl font-bold">My Profile</h1>

          <button
            onClick={() => setEditing(!editing)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            {editing ? "Cancel" : "Edit"}
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <input
            disabled={!editing}
            value={profile.first_name || ""}
            onChange={(e) =>
              setProfile({
                ...profile,
                first_name: e.target.value,
              })
            }
            className="border rounded-lg p-3"
            placeholder="First Name"
          />

          <input
            disabled={!editing}
            value={profile.last_name || ""}
            onChange={(e) =>
              setProfile({
                ...profile,
                last_name: e.target.value,
              })
            }
            className="border rounded-lg p-3"
            placeholder="Last Name"
          />

          <input
            disabled
            value={profile.email || ""}
            className="border rounded-lg p-3 bg-gray-100"
          />

          <input
            disabled={!editing}
            value={profile.phone || ""}
            onChange={(e) =>
              setProfile({
                ...profile,
                phone: e.target.value,
              })
            }
            className="border rounded-lg p-3"
            placeholder="Phone"
          />
        </div>

        <textarea
          disabled={!editing}
          value={profile.address || ""}
          onChange={(e) =>
            setProfile({
              ...profile,
              address: e.target.value,
            })
          }
          className="border rounded-lg p-3 w-full mt-4"
          rows={4}
          placeholder="Address"
        />

        {editing && (
          <button
            onClick={handleSave}
            className="mt-5 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg"
          >
            Save Changes
          </button>
        )}
      </div>
    </WorkerLayout>
  );
}
