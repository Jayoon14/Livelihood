import { useRegisterStore } from "../../../store/registerStore";

type UploadField =
  | "validId"
  | "resume"
  | "tesdaCertificate"
  | "barangayClearance"
  | "policeClearance"
  | "nbiClearance"
  | "juniorHighDiploma"
  | "seniorHighDiploma"
  | "collegeDiploma"
  | "mastersDiploma"
  | "doctorateDiploma";


export default function Documents() {

  const { data } = useRegisterStore();


  return (
    <div>

      <h2 className="text-2xl font-bold mb-3">
        Upload Documents
      </h2>

      <p className="text-gray-500 mb-5">
        Please upload the required documents below.
      </p>


      <div className="grid md:grid-cols-2 gap-5">

        <UploadCard
          title="Valid ID"
          field="validId"
        />

        <UploadCard
          title="Resume"
          field="resume"
        />

        <UploadCard
          title="TESDA Certificate"
          field="tesdaCertificate"
        />

        <UploadCard
          title="Barangay Clearance"
          field="barangayClearance"
        />

        <UploadCard
          title="Police Clearance"
          field="policeClearance"
        />

        <UploadCard
          title="NBI Clearance"
          field="nbiClearance"
        />

      </div>



      <div className="mt-6">

        <h2 className="text-2xl font-bold mb-2">
          Educational Documents
        </h2>


        <p className="text-gray-500 mb-5">
          Optional documents based on your educational attainment.
        </p>



        <div className="grid md:grid-cols-2 gap-5">


          {[
            "Junior High",
            "Senior High",
            "College",
            "Master",
            "Doctorate",
          ].includes(data.highestEducation) && (

            <UploadCard
              title="Junior High Diploma (Optional)"
              field="juniorHighDiploma"
            />

          )}



          {[
            "Senior High",
            "College",
            "Master",
            "Doctorate",
          ].includes(data.highestEducation) && (

            <UploadCard
              title="Senior High Diploma (Optional)"
              field="seniorHighDiploma"
            />

          )}



          {[
            "College",
            "Master",
            "Doctorate",
          ].includes(data.highestEducation) && (

            <UploadCard
              title="College Diploma (Optional)"
              field="collegeDiploma"
            />

          )}



          {data.highestEducation === "Master" && (

            <UploadCard
              title="Master's Diploma (Optional)"
              field="mastersDiploma"
            />

          )}



          {data.highestEducation === "Doctorate" && (

            <UploadCard
              title="Doctorate Diploma (Optional)"
              field="doctorateDiploma"
            />

          )}


        </div>

      </div>


    </div>
  );
}
type UploadCardProps = {
  title: string;
  field: UploadField;
};


function UploadCard({
  title,
  field,
}: UploadCardProps) {

  const {
    data,
    updateData,
    errors,
    clearError,
  } = useRegisterStore();


  const file = data[field];



  function handleChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {

    const selectedFile =
      e.target.files?.[0] ?? null;


    updateData({
      [field]: selectedFile,
    });


    clearError(field);

  }



  function removeFile() {

    updateData({
      [field]: null,
    });

  }



  return (

    <div className="
      border
      rounded-xl
      p-4
      bg-white
      shadow-sm
    ">


      <h3 className="
        font-semibold
        mb-2
      ">
        {title}
      </h3>



      <input
        type="file"
        accept="image/*,.pdf"
        onChange={handleChange}
        className={`
          w-full
          border
          rounded-lg
          p-2
          ${
            errors[field]
              ? "border-red-500"
              : "border-gray-300"
          }
        `}
      />



      {errors[field] && (

        <p className="
          text-red-500
          text-sm
          mt-1
        ">
          {errors[field]}
        </p>

      )}



      {file && (

        <div className="mt-3">


          {file.type.startsWith("image") && (

            <img
              src={URL.createObjectURL(file)}
              alt={title}
              className="
                rounded-lg
                h-32
                w-full
                object-cover
              "
            />

          )}



          {file.type === "application/pdf" && (

            <div className="
              bg-gray-100
              rounded-lg
              p-3
              text-sm
            ">
              📄 {file.name}
            </div>

          )}



          <button
            type="button"
            onClick={removeFile}
            className="
              text-red-600
              text-sm
              mt-2
              hover:underline
            "
          >
            Remove File
          </button>


        </div>

      )}


    </div>

  );

}