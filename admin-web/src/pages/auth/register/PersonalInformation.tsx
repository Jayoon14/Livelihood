import { useRegisterStore } from "../../../store/registerStore";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";


export default function PersonalInformation() {

  const {
    data,
    updateData,
  } = useRegisterStore();


  return (
    <>

      <h2 className="
        text-2xl
        font-bold
        mb-6
      ">
        Personal Information
      </h2>


      <div className="
        grid
        grid-cols-2
        gap-5
      ">


        {/* Profile Picture */}

        <div className="col-span-2">

          <label className="
            block
            text-sm
            font-medium
            mb-2
          ">
            Profile Picture (Optional)
          </label>


          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              updateData({
                profilePicture:
                  e.target.files?.[0] ?? null,
              })
            }
            className="
              border
              rounded-lg
              p-3
              w-full
            "
          />


          {data.profilePicture && (

            <img
              src={
                URL.createObjectURL(
                  data.profilePicture
                )
              }
              alt="Profile Preview"
              className="
                w-32
                h-32
                rounded-full
                object-cover
                mt-4
                border
              "
            />

          )}

        </div>



        {/* First Name */}

        <input
          value={data.firstName}
          onChange={(e) =>
            updateData({
              firstName:
                e.target.value,
            })
          }
          placeholder="First Name"
          className="
            border
            rounded-lg
            p-3
          "
        />


        {/* Middle Name */}

        <input
          value={data.middleName}
          onChange={(e) =>
            updateData({
              middleName:
                e.target.value,
            })
          }
          placeholder="Middle Name (Optional)"
          className="
            border
            rounded-lg
            p-3
          "
        />


        {/* Last Name */}

        <input
          value={data.lastName}
          onChange={(e) =>
            updateData({
              lastName:
                e.target.value,
            })
          }
          placeholder="Last Name"
          className="
            border
            rounded-lg
            p-3
          "
        />


        {/* Suffix */}

        <select
          value={data.suffix}
          onChange={(e) =>
            updateData({
              suffix:
                e.target.value,
            })
          }
          className="
            border
            rounded-lg
            p-3
          "
        >

          <option value="">
            Suffix (Optional)
          </option>

          <option value="Jr.">
            Jr.
          </option>

          <option value="Sr.">
            Sr.
          </option>

          <option value="II">
            II
          </option>

          <option value="III">
            III
          </option>

          <option value="IV">
            IV
          </option>

        </select>


        {/* Birth Date */}

        <div>

          <label className="
            block
            text-sm
            text-gray-600
            mb-2
          ">
            Birth Date
          </label>


          <DatePicker
            selected={
              data.birthDate
                ? new Date(data.birthDate)
                : null
            }
            onChange={(date: Date | null) =>
              updateData({
                birthDate: date
                  ? date.toISOString()
                      .split("T")[0]
                  : "",
              })
            }
            dateFormat="dd/MM/yyyy"
            showYearDropdown
            scrollableYearDropdown
            yearDropdownItemNumber={100}
            maxDate={new Date()}
            placeholderText="DD/MM/YYYY"
            className="
              border
              rounded-lg
              p-3
              w-full
            "
          />

        </div>
                {/* Gender */}

        <div>

          <label className="
            block
            text-sm
            text-gray-600
            mb-2
          ">
            Gender
          </label>


          <select
            value={data.gender}
            onChange={(e) =>
              updateData({
                gender:
                  e.target.value,
              })
            }
            className="
              border
              rounded-lg
              p-3
              w-full
            "
          >

            <option value="">
              Select Gender
            </option>

            <option value="Male">
              Male
            </option>

            <option value="Female">
              Female
            </option>

          </select>

        </div>



        {/* Civil Status */}

        <select
          value={data.civilStatus}
          onChange={(e) =>
            updateData({
              civilStatus:
                e.target.value,
            })
          }
          className="
            border
            rounded-lg
            p-3
          "
        >

          <option value="">
            Civil Status
          </option>

          <option value="Single">
            Single
          </option>

          <option value="Married">
            Married
          </option>

          <option value="Widowed">
            Widowed
          </option>

          <option value="Separated">
            Separated
          </option>

        </select>



        {/* Religion */}

        <select
          value={data.religion}
          onChange={(e) =>
            updateData({
              religion:
                e.target.value,
            })
          }
          className="
            border
            rounded-lg
            p-3
          "
        >

          <option value="">
            Select Religion
          </option>

          <option value="Roman Catholic">
            Roman Catholic
          </option>

          <option value="Christian">
            Christian
          </option>

          <option value="Born Again Christian">
            Born Again Christian
          </option>

          <option value="Iglesia ni Cristo">
            Iglesia ni Cristo
          </option>

          <option value="Islam">
            Islam
          </option>

          <option value="Seventh-day Adventist">
            Seventh-day Adventist
          </option>

          <option value="Jehovah's Witness">
            Jehovah's Witness
          </option>

          <option value="Buddhist">
            Buddhist
          </option>

          <option value="Others">
            Others
          </option>

        </select>



        {/* Phone */}

        <input
          value={data.phone}
          onChange={(e) =>
            updateData({
              phone:
                e.target.value,
            })
          }
          placeholder="Phone Number"
          className="
            border
            rounded-lg
            p-3
          "
        />



        {/* Email */}

        <input
          type="email"
          value={data.email}
          onChange={(e) =>
            updateData({
              email:
                e.target.value,
            })
          }
          placeholder="Email Address"
          className="
            border
            rounded-lg
            p-3
          "
        />



        {/* Password */}

        <div>

          <input
            type="password"
            value={data.password}
            onChange={(e) =>
              updateData({
                password:
                  e.target.value,
              })
            }
            placeholder="Enter Password"
            className="
              border
              rounded-lg
              p-3
              w-full
            "
          />


          <p className="
            text-xs
            text-gray-500
            mt-1
          ">
            Password must contain:
            <br />
            • At least 8 characters
            <br />
            • 1 uppercase letter (A-Z)
            <br />
            • 1 lowercase letter (a-z)
            <br />
            • 1 number (0-9)
            <br />
            • 1 special character (@, #, !, $, %, &, *)
          </p>

        </div>



        {/* Confirm Password */}

        <div>

          <input
            type="password"
            value={data.confirmPassword}
            onChange={(e) =>
              updateData({
                confirmPassword:
                  e.target.value,
              })
            }
            placeholder="Confirm Password"
            className="
              border
              rounded-lg
              p-3
              w-full
            "
          />


          <p className="
            text-xs
            text-gray-500
            mt-1
          ">
            Re-enter the same password.
          </p>

        </div>



        {/* Address */}

        <input
          value={data.houseNo}
          onChange={(e) =>
            updateData({
              houseNo:
                e.target.value,
            })
          }
          placeholder="House No."
          className="
            border
            rounded-lg
            p-3
          "
        />


        <input
          value={data.street}
          onChange={(e) =>
            updateData({
              street:
                e.target.value,
            })
          }
          placeholder="Street"
          className="
            border
            rounded-lg
            p-3
          "
        />


        <input
          value={data.barangay}
          onChange={(e) =>
            updateData({
              barangay:
                e.target.value,
            })
          }
          placeholder="Barangay"
          className="
            border
            rounded-lg
            p-3
          "
        />
                {/* Municipality */}

        <select
          value={data.municipality}
          onChange={(e) =>
            updateData({
              municipality:
                e.target.value,
            })
          }
          className="
            border
            rounded-lg
            p-3
          "
        >

          <option value="">
            Select Municipality / City
          </option>

          <option value="Alaminos">
            Alaminos
          </option>

          <option value="Bay">
            Bay
          </option>

          <option value="Biñan City">
            Biñan City
          </option>

          <option value="Cabuyao City">
            Cabuyao City
          </option>

          <option value="Calamba City">
            Calamba City
          </option>

          <option value="Calauan">
            Calauan
          </option>

          <option value="Los Baños">
            Los Baños
          </option>

          <option value="San Pablo City">
            San Pablo City
          </option>

          <option value="San Pedro City">
            San Pedro City
          </option>

          <option value="Santa Rosa City">
            Santa Rosa City
          </option>

          <option value="Santa Cruz">
            Santa Cruz
          </option>

          <option value="Victoria">
            Victoria
          </option>

        </select>




        {/* Province */}

        <div className="
          col-span-2
        ">

          <label className="
            block
            text-sm
            text-gray-600
            mb-2
          ">
            Province
          </label>


          <select
            value={data.province}
            onChange={(e) =>
              updateData({
                province:
                  e.target.value,
              })
            }
            className="
              border
              rounded-lg
              p-3
              w-full
            "
          >

            <option value="Laguna">
              Laguna
            </option>

            <option value="Batangas">
              Batangas
            </option>

            <option value="Cavite">
              Cavite
            </option>

            <option value="Rizal">
              Rizal
            </option>

          </select>

        </div>


      </div>

    </>

  );

}