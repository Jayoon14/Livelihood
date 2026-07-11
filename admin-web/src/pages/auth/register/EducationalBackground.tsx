import { useRegisterStore } from "../../../store/registerStore";


export default function EducationalBackground() {

  const {
    data,
    updateData,
    errors,
    clearError,
  } = useRegisterStore();



  return (

    <div>


      <h2 className="
        text-2xl
        font-bold
        mb-8
      ">
        Educational Background
      </h2>



      <div className="
        grid
        grid-cols-1
        md:grid-cols-2
        gap-6
      ">



        {/* Highest Educational Attainment */}

        <div>

          <label className="
            block
            mb-2
            font-medium
          ">
            Highest Educational Attainment
          </label>


          <select
            value={data.highestEducation}

            onChange={(e)=>{

              updateData({
                highestEducation:
                  e.target.value,
              });

              clearError(
                "highestEducation"
              );

            }}

            className={`
              w-full
              border
              rounded-xl
              p-3
              outline-none
              focus:ring-2
              focus:ring-blue-600

              ${
                errors.highestEducation
                ? "border-red-500"
                : "border-gray-300"
              }
            `}
          >

            <option value="">
              Select Highest Attainment
            </option>

            <option value="Elementary">
              Elementary
            </option>

            <option value="Junior High School">
              Junior High School
            </option>

            <option value="Senior High School">
              Senior High School
            </option>

            <option value="Vocational">
              Vocational
            </option>

            <option value="College">
              College
            </option>

            <option value="Master's Degree">
              Master's Degree
            </option>

            <option value="Doctorate Degree">
              Doctorate Degree
            </option>


          </select>


          {errors.highestEducation && (

            <p className="
              text-red-500
              text-sm
              mt-1
            ">
              {errors.highestEducation}
            </p>

          )}


        </div>





        <Input
          label="Elementary School"
          value={data.elementary}
          onChange={(value)=>
            updateData({
              elementary:value
            })
          }
        />





        <Input
          label="Secondary School"
          value={data.secondary}

          error={errors.secondary}

          onChange={(value)=>{

            updateData({
              secondary:value
            });

            clearError(
              "secondary"
            );

          }}
        />





        <Input
          label="Senior High School"
          value={data.seniorHigh}

          error={errors.seniorHigh}

          onChange={(value)=>{

            updateData({
              seniorHigh:value
            });

            clearError(
              "seniorHigh"
            );

          }}
        />






        <Input
          label="College / University"
          value={data.college}

          error={errors.college}

          onChange={(value)=>{

            updateData({
              college:value
            });

            clearError(
              "college"
            );

          }}
        />







        <Input
          label="Course"
          value={data.course}

          error={errors.course}

          onChange={(value)=>{

            updateData({
              course:value
            });

            clearError(
              "course"
            );

          }}
        />








        <Input
          label="Year Graduated"
          type="number"
          value={data.yearGraduated}

          error={errors.yearGraduated}

          onChange={(value)=>{

            updateData({
              yearGraduated:value
            });

            clearError(
              "yearGraduated"
            );

          }}
        />







        <Input
          label="TESDA Certificate (Optional)"
          value={data.tesda}

          onChange={(value)=>
            updateData({
              tesda:value
            })
          }
        />






        <Input
          label="PRC License No. (Optional)"
          value={data.prc}

          onChange={(value)=>
            updateData({
              prc:value
            })
          }
        />








        <div className="
          col-span-1
          md:col-span-2
        ">

          <label className="
            block
            mb-2
            font-medium
          ">
            Trainings / Seminars
          </label>



          <textarea

            rows={5}

            value={data.trainings}

            onChange={(e)=>{

              updateData({
                trainings:
                  e.target.value,
              });

            }}

            className="
              w-full
              border
              border-gray-300
              rounded-xl
              p-3
              outline-none
              focus:ring-2
              focus:ring-blue-600
              resize-none
            "

          />


        </div>



      </div>


    </div>

  );

}





type InputProps = {

  label:string;

  value:string;

  onChange:(value:string)=>void;

  type?:string;

  error?:string;

};





function Input({

  label,

  value,

  onChange,

  type="text",

  error,

}:InputProps){


  return (

    <div>


      <label className="
        block
        mb-2
        font-medium
      ">
        {label}
      </label>



      <input

        type={type}

        value={value}

        onChange={(e)=>
          onChange(
            e.target.value
          )
        }


        className={`
          w-full
          border
          rounded-xl
          p-3
          outline-none
          focus:ring-2
          focus:ring-blue-600

          ${
            error
            ? "border-red-500"
            : "border-gray-300"
          }
        `}

      />



      {error && (

        <p className="
          text-red-500
          text-sm
          mt-1
        ">
          {error}
        </p>

      )}


    </div>

  );

}