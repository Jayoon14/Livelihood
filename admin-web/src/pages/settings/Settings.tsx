import { useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";

export default function Settings() {
  const [form, setForm] = useState({
    name: "Administrator",
    email: "admin@livelihoodgo.com",
    password: "",
    confirmPassword: "",
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  function handleSave() {
    alert("Settings saved successfully.");
  }

  function handlePassword() {
    if (form.password !== form.confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    alert("Password updated.");
  }

  return (
    <AdminLayout>
      <div className="p-8 space-y-8">

        <h1 className="text-3xl font-bold">
          Settings
        </h1>

        {/* PROFILE */}
        <div className="bg-white rounded-xl shadow p-8">

          <h2 className="text-xl font-bold mb-6">
            Admin Profile
          </h2>

          <div className="grid grid-cols-2 gap-6">

            <div>
              <label>Name</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                className="border rounded-lg p-3 w-full mt-2"
              />
            </div>

            <div>
              <label>Email</label>
              <input
                name="email"
                value={form.email}
                onChange={handleChange}
                className="border rounded-lg p-3 w-full mt-2"
              />
            </div>

          </div>

          <button
            onClick={handleSave}
            className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg"
          >
            Save Profile
          </button>
        </div>

        {/* PASSWORD */}
        <div className="bg-white rounded-xl shadow p-8">

          <h2 className="text-xl font-bold mb-6">
            Change Password
          </h2>

          <div className="grid grid-cols-2 gap-6">

            <input
              type="password"
              name="password"
              placeholder="New Password"
              value={form.password}
              onChange={handleChange}
              className="border rounded-lg p-3"
            />

            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={form.confirmPassword}
              onChange={handleChange}
              className="border rounded-lg p-3"
            />

          </div>

          <button
            onClick={handlePassword}
            className="mt-6 bg-green-600 text-white px-6 py-3 rounded-lg"
          >
            Update Password
          </button>
        </div>

        {/* SYSTEM */}
        <div className="bg-white rounded-xl shadow p-8">

          <h2 className="text-xl font-bold mb-6">
            System Information
          </h2>

          <div className="space-y-3">

            <p><strong>System:</strong> LivelihoodGo</p>
            <p><strong>Version:</strong> 1.0</p>
            <p><strong>Database:</strong> Supabase</p>
            <p><strong>Framework:</strong> React + TypeScript</p>
            <p><strong>CSS:</strong> Tailwind CSS</p>

          </div>

        </div>

      </div>
    </AdminLayout>
  );
}