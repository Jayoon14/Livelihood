import { useRegisterStore } from "../../../store/registerStore";

export default function Confirmation() {
  const { data } = useRegisterStore();

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">
        Confirmation
      </h2>

      <p className="text-gray-500 mb-8">
        Please review your information before submitting your application.
      </p>

      <Card title="👤 Personal Information">
        <Info label="Name">
          {data.firstName} {data.middleName} {data.lastName}
        </Info>

        <Info label="Birthday">
          {data.birthDate}
        </Info>

        <Info label="Gender">
          {data.gender}
        </Info>

        <Info label="Civil Status">
          {data.civilStatus}
        </Info>

        <Info label="Religion">
          {data.religion}
        </Info>

        <Info label="Phone">
          {data.phone}
        </Info>

        <Info label="Email">
          {data.email}
        </Info>

        <Info label="Address">
          {data.houseNo} {data.street}, {data.barangay}, {data.municipality}, {data.province}
        </Info>
      </Card>


      <Card title="🎓 Educational Background">

        <Info label="Highest Attainment">
          {data.highestEducation}
        </Info>

        <Info label="Elementary">
          {data.elementary}
        </Info>

        <Info label="Secondary">
          {data.secondary}
        </Info>

        <Info label="Senior High">
          {data.seniorHigh}
        </Info>

        <Info label="College">
          {data.college}
        </Info>

        <Info label="Course">
          {data.course}
        </Info>

        <Info label="Year Graduated">
          {data.yearGraduated}
        </Info>

        <Info label="TESDA">
          {data.tesda}
        </Info>

        <Info label="PRC">
          {data.prc}
        </Info>

        <Info label="Trainings">
          {data.trainings}
        </Info>

      </Card>


      <Card title="💼 Work Experience">

        {data.noWorkExperience ? (

          <Info label="Status">
            No Work Experience
          </Info>

        ) : (

          <>
            <Info label="Company">
              {data.company}
            </Info>

            <Info label="Position">
              {data.position}
            </Info>

            <Info label="Employment">
              {data.employmentStatus}
            </Info>

            <Info label="Start Date">
              {data.startDate}
            </Info>

            <Info label="End Date">
              {data.endDate}
            </Info>

            <Info label="Description">
              {data.description}
            </Info>
          </>

        )}

      </Card>


      <Card title="🛠 Skills">

        {data.skills.length > 0 ? (

          <div className="flex flex-wrap gap-3">

            {data.skills.map((skill) => (

              <div
                key={skill}
                className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full"
              >
                {skill}
              </div>

            ))}

          </div>

        ) : (

          <p>
            No skills selected.
          </p>

        )}

      </Card>


      <Card title="📄 Documents">

        <div className="grid md:grid-cols-2 gap-6">

          <DocumentPreview
            title="Valid ID"
            file={data.validId}
          />

          <DocumentPreview
            title="Resume"
            file={data.resume}
          />

          <DocumentPreview
            title="TESDA Certificate"
            file={data.tesdaCertificate}
          />

          <DocumentPreview
            title="Barangay Clearance"
            file={data.barangayClearance}
          />

          <DocumentPreview
            title="Police Clearance"
            file={data.policeClearance}
          />

          <DocumentPreview
            title="NBI Clearance"
            file={data.nbiClearance}
          />

        </div>

      </Card>

    </div>
  );
}



function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow border mb-6">

      <div className="px-6 py-4 border-b">
        <h2 className="font-bold text-lg">
          {title}
        </h2>
      </div>

      <div className="p-6">
        {children}
      </div>

    </div>
  );
}



function Info({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-3 py-2">

      <div className="text-gray-500">
        {label}
      </div>

      <div className="col-span-2 font-medium">
        {children || "-"}
      </div>

    </div>
  );
}



function DocumentPreview({
  title,
  file,
}: {
  title: string;
  file?: File | null;
}) {

  if (!file) {
    return (
      <div className="border rounded-xl p-4 text-gray-400">
        {title}: Not Uploaded
      </div>
    );
  }


  const image =
    file.type.startsWith("image");


  return (
    <div>

      <h3 className="font-semibold mb-2">
        {title}
      </h3>


      {image ? (

        <img
          src={URL.createObjectURL(file)}
          alt={title}
          className="rounded-xl h-56 w-full border object-cover"
        />

      ) : (

        <div className="border rounded-xl p-6">
          📄 {file.name}
        </div>

      )}

    </div>
  );
}