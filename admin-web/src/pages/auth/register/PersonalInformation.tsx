export default function PersonalInformation() {
  return (
    <>
      <h2 className="text-2xl font-bold mb-6">
        Personal Information
      </h2>

      <div className="grid grid-cols-2 gap-5">

        <input
          placeholder="First Name"
          className="border rounded-lg p-3"
        />

        <input
          placeholder="Middle Name"
          className="border rounded-lg p-3"
        />

        <input
          placeholder="Last Name"
          className="border rounded-lg p-3"
        />

        <input
          placeholder="Suffix"
          className="border rounded-lg p-3"
        />

        <div>
          <label className="text-sm text-gray-500">
            Birth Date
          </label>

          <input
            type="date"
            className="border rounded-lg p-3 w-full"
          />
        </div>

        <div>
          <label className="text-sm text-gray-500">
            Gender
          </label>

          <select className="border rounded-lg p-3 w-full">
            <option value="">Select Gender</option>
            <option>Male</option>
            <option>Female</option>
          </select>
        </div>

        <select className="border rounded-lg p-3">
          <option value="">Civil Status</option>
          <option>Single</option>
          <option>Married</option>
          <option>Widowed</option>
          <option>Separated</option>
        </select>

        <input
          placeholder="Religion"
          className="border rounded-lg p-3"
        />

        <input
          placeholder="Phone Number"
          className="border rounded-lg p-3"
        />

        <input
          type="email"
          placeholder="Email Address"
          className="border rounded-lg p-3"
        />

        <input
          type="password"
          placeholder="Password"
          className="border rounded-lg p-3"
        />

        <input
          type="password"
          placeholder="Confirm Password"
          className="border rounded-lg p-3"
        />

        <input
          placeholder="House No."
          className="border rounded-lg p-3"
        />

        <input
          placeholder="Street"
          className="border rounded-lg p-3"
        />

        <input
          placeholder="Barangay"
          className="border rounded-lg p-3"
        />

        <input
          placeholder="Municipality"
          className="border rounded-lg p-3"
        />

        <div className="col-span-2">
          <input
            placeholder="Province"
            className="border rounded-lg p-3 w-full"
          />
        </div>

      </div>
    </>
  );
}