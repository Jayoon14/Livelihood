import { useEffect, useState } from "react";

import CustomerLayout from "../../../layouts/CustomerLayout";
import { updateProfile, uploadAvatar } from "../../../services/profileService";
import { useProfile } from "../../../context/ProfileContext";


export default function Profile() {

  return (
    <CustomerLayout>
      <ProfileContent />
    </CustomerLayout>
  );
}



function ProfileContent() {

  const {
    profile,
    setProfile,
    refreshProfile,
  } = useProfile();


  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);



  useEffect(() => {
    console.log(profile);
    if (!profile) {
      refreshProfile();
    }

  }, []);



  async function handleSave() {

    try {

      const updates = {
        first_name: profile.first_name,
        middle_name: profile.middle_name,
        last_name: profile.last_name,
        phone: profile.phone,
        address: profile.address,
      };


      await updateProfile(
        profile.id,
        updates
      );


      setProfile({
        ...profile,
        ...updates,
      });


      alert("Profile updated successfully.");

      setEditing(false);


    } catch(error) {

      console.error(error);

      alert("Unable to update profile.");

    }

  }




  async function handleUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {

    const file = e.target.files?.[0];

    if(!file) return;


    try {

      setUploading(true);


      const url = await uploadAvatar(
        profile.id,
        file
      );


      setProfile({
        ...profile,
        profile_picture:url,
      });


      alert("Profile picture updated.");


    } catch(error) {

      console.error(error);

      alert("Unable to upload profile picture.");


    } finally {

      setUploading(false);

    }

  }





  if(!profile){

    return (
      <div className="p-10 text-center">
        Loading...
      </div>
    );

  }





  return (

    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-8">


      <div className="flex flex-col items-center mb-8">

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
          className="mt-4"
        />

      </div>




      <div className="flex justify-between items-center mb-8">

        <h1 className="text-3xl font-bold">
          My Profile
        </h1>


        <button
          onClick={() => setEditing(!editing)}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg"
        >
          {editing ? "Cancel" : "Edit Profile"}
        </button>

      </div>





      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">


        <input
          disabled={!editing}
          value={profile.first_name || ""}
          onChange={(e)=>setProfile({
            ...profile,
            first_name:e.target.value
          })}
          placeholder="First Name"
          className="border rounded-lg p-3"
        />


        <input
          disabled={!editing}
          value={profile.middle_name || ""}
          onChange={(e)=>setProfile({
            ...profile,
            middle_name:e.target.value
          })}
          placeholder="Middle Name"
          className="border rounded-lg p-3"
        />


        <input
          disabled={!editing}
          value={profile.last_name || ""}
          onChange={(e)=>setProfile({
            ...profile,
            last_name:e.target.value
          })}
          placeholder="Last Name"
          className="border rounded-lg p-3"
        />


        <input
          value={profile.email || ""}
          disabled
          className="border rounded-lg p-3 bg-gray-100"
        />


        <input
          disabled={!editing}
          value={profile.phone || ""}
          onChange={(e)=>setProfile({
            ...profile,
            phone:e.target.value
          })}
          placeholder="Phone"
          className="border rounded-lg p-3"
        />


      </div>




      <textarea

        disabled={!editing}

        value={profile.address || ""}

        onChange={(e)=>setProfile({
          ...profile,
          address:e.target.value
        })}

        placeholder="Address"

        className="border rounded-lg p-3 w-full mt-5"

        rows={4}

      />





      {editing && (

        <button

          onClick={handleSave}

          className="mt-6 bg-green-600 text-white px-6 py-3 rounded-lg"

        >
          Save Changes
        </button>

      )}


    </div>

  );
}