import { useRegisterStore } from "../../../store/registerStore";

export default function PersonalInformation() {
  const { data, updateData } = useRegisterStore();

  return (
    <>
      <h2 className="text-2xl font-bold mb-6">
        Personal Information
      </h2>

      <div className="grid grid-cols-2 gap-5">

        {/* First Name */}
        <input
          value={data.firstName}
          onChange={(e) => updateData({ firstName: e.target.value })}
          placeholder="First Name"
          className="border rounded-lg p-3"
        />

        {/* Middle Name */}
        <input
          value={data.middleName}
          onChange={(e) => updateData({ middleName: e.target.value })}
          placeholder="Middle Name"
          className="border rounded-lg p-3"
        />

        {/* Last Name */}
        <input
          value={data.lastName}
          onChange={(e) => updateData({ lastName: e.target.value })}
          placeholder="Last Name"
          className="border rounded-lg p-3"
        />

        {/* Suffix */}
        <select
          value={data.suffix}
          onChange={(e) => updateData({ suffix: e.target.value })}
          className="border rounded-lg p-3"
        >
          <option value="">Suffix (Optional)</option>
          <option value="Jr.">Jr.</option>
          <option value="Sr.">Sr.</option>
          <option value="II">II</option>
          <option value="III">III</option>
          <option value="IV">IV</option>
        </select>

        {/* Birth Date */}
        <div>
          <label className="text-sm text-gray-500">
            Birth Date
          </label>

          <input
            type="date"
            value={data.birthDate}
            onChange={(e) => updateData({ birthDate: e.target.value })}
            className="border rounded-lg p-3 w-full"
          />
        </div>

        {/* Gender */}
        <div>
          <label className="text-sm text-gray-500">
            Gender
          </label>

          <select
            value={data.gender}
            onChange={(e) => updateData({ gender: e.target.value })}
            className="border rounded-lg p-3 w-full"
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>

        {/* Civil Status */}
        <select
          value={data.civilStatus}
          onChange={(e) => updateData({ civilStatus: e.target.value })}
          className="border rounded-lg p-3"
        >
          <option value="">Civil Status</option>
          <option value="Single">Single</option>
          <option value="Married">Married</option>
          <option value="Widowed">Widowed</option>
          <option value="Separated">Separated</option>
        </select>

        {/* Religion */}
        <select
          value={data.religion}
          onChange={(e) => updateData({ religion: e.target.value })}
          className="border rounded-lg p-3"
        >
          <option value="">Select Religion</option>
          <option value="Roman Catholic">Roman Catholic</option>
          <option value="Christian">Christian</option>
          <option value="Born Again Christian">Born Again Christian</option>
          <option value="Iglesia ni Cristo">Iglesia ni Cristo</option>
          <option value="Islam">Islam</option>
          <option value="Seventh-day Adventist">Seventh-day Adventist</option>
          <option value="Jehovah's Witness">Jehovah's Witness</option>
          <option value="Buddhist">Buddhist</option>
          <option value="Others">Others</option>
        </select>

        {/* Phone */}
        <input
          value={data.phone}
          onChange={(e) => updateData({ phone: e.target.value })}
          placeholder="Phone Number"
          className="border rounded-lg p-3"
        />

        {/* Email */}
        <input
          type="email"
          value={data.email}
          onChange={(e) => updateData({ email: e.target.value })}
          placeholder="Email Address"
          className="border rounded-lg p-3"
        />

        {/* Password */}
        <input
          type="password"
          value={data.password}
          onChange={(e) => updateData({ password: e.target.value })}
          placeholder="Password"
          className="border rounded-lg p-3"
        />

        {/* Confirm Password */}
        <input
          type="password"
          value={data.confirmPassword}
          onChange={(e) =>
            updateData({ confirmPassword: e.target.value })
          }
          placeholder="Confirm Password"
          className="border rounded-lg p-3"
        />

        {/* House Number */}
        <input
          value={data.houseNo}
          onChange={(e) => updateData({ houseNo: e.target.value })}
          placeholder="House No."
          className="border rounded-lg p-3"
        />

        {/* Street */}
        <input
          value={data.street}
          onChange={(e) => updateData({ street: e.target.value })}
          placeholder="Street"
          className="border rounded-lg p-3"
        />

        {/* Barangay */}
        <input
          value={data.barangay}
          onChange={(e) => updateData({ barangay: e.target.value })}
          placeholder="Barangay"
          className="border rounded-lg p-3"
        />

        {/* Municipality */}
        <select
          value={data.municipality}
          onChange={(e) =>
            updateData({ municipality: e.target.value })
          }
          className="border rounded-lg p-3"
        >
          <option value="">Select Municipality</option>
          <option value="Alaminos">Alaminos</option>
          <option value="Bay">Bay</option>
          <option value="Biñan City">Biñan City</option>
          <option value="Cabuyao City">Cabuyao City</option>
          <option value="Calamba City">Calamba City</option>
          <option value="Calauan">Calauan</option>
          <option value="Cavinti">Cavinti</option>
          <option value="Famy">Famy</option>
          <option value="Kalayaan">Kalayaan</option>
          <option value="Liliw">Liliw</option>
          <option value="Los Baños">Los Baños</option>
          <option value="Luisiana">Luisiana</option>
          <option value="Lumban">Lumban</option>
          <option value="Mabitac">Mabitac</option>
          <option value="Magdalena">Magdalena</option>
          <option value="Majayjay">Majayjay</option>
          <option value="Nagcarlan">Nagcarlan</option>
          <option value="Paete">Paete</option>
          <option value="Pagsanjan">Pagsanjan</option>
          <option value="Pakil">Pakil</option>
          <option value="Pangil">Pangil</option>
          <option value="Pila">Pila</option>
          <option value="Rizal">Rizal</option>
          <option value="San Pablo City">San Pablo City</option>
          <option value="San Pedro City">San Pedro City</option>
          <option value="Santa Cruz">Santa Cruz</option>
          <option value="Santa Maria">Santa Maria</option>
          <option value="Santa Rosa City">Santa Rosa City</option>
          <option value="Siniloan">Siniloan</option>
          <option value="Victoria">Victoria</option>
        </select>

        {/* Province */}
        <div className="col-span-2">
          <input
            value="Laguna"
            readOnly
            className="border rounded-lg p-3 w-full bg-gray-100 cursor-not-allowed"
          />
        </div>

      </div>
    </>
  );
}