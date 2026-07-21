import { useState } from "react";

import { User, GraduationCap, Briefcase, Wrench, FileText } from "lucide-react";

import { useRegisterStore } from "../../../store/registerStore";

import DocumentModal from "../../../components/DocumentModal";

export default function Confirmation() {
  const { data, goToStep, setEditingFromReview } = useRegisterStore();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [selectedTitle, setSelectedTitle] = useState("");

  return (
    <div>
      {/* Header */}

      <div
        className="
          bg-gradient-to-r
          from-blue-600
          to-blue-700
          rounded-2xl
          p-8
          text-white
          mb-8
        "
      >
        <h1 className="text-4xl font-bold">Worker Application Preview</h1>

        <p className="mt-2 text-blue-100">
          Please review your application before submitting.
        </p>

        <div className="mt-6">
          <div className="flex justify-between mb-2">
            <span>Profile Completion</span>

            <span>100%</span>
          </div>

          <div
            className="
              w-full
              h-3
              bg-blue-300
              rounded-full
              overflow-hidden
            "
          >
            <div
              className="
                bg-green-400
                h-full
                w-full
              "
            />
          </div>
        </div>
      </div>

      {/* Profile Picture */}

      <div className="flex justify-center mb-8">
        {data.profilePicture ? (
          <img
            src={URL.createObjectURL(data.profilePicture)}
            className="
              w-36
              h-36
              rounded-full
              object-cover
              border-4
              border-blue-500
            "
            alt="Profile"
          />
        ) : (
          <div
            className="
              w-36
              h-36
              rounded-full
              bg-gray-200
              flex
              items-center
              justify-center
              text-5xl
              font-bold
            "
          >
            {data.firstName?.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Personal Information */}

      <Card
        title={
          <div className="flex items-center gap-3">
            <User size={22} />

            <span>Personal Information</span>
          </div>
        }
        onEdit={() => {
          setEditingFromReview(true);

          goToStep(1);
        }}
      >
        <Info label="Name">
          {data.firstName} {data.middleName} {data.lastName}
        </Info>

        <Info label="Birthday">{data.birthDate}</Info>

        <Info label="Gender">{data.gender}</Info>

        <Info label="Civil Status">{data.civilStatus}</Info>

        <Info label="Religion">{data.religion}</Info>

        <Info label="Phone">{data.phone}</Info>

        <Info label="Email">{data.email}</Info>

        <Info label="Address">
          {data.houseNo} {data.street}, {data.barangay}, {data.municipality},{" "}
          {data.province}
        </Info>
      </Card>
      {/* Educational Background */}

      <Card
        title={
          <div className="flex items-center gap-3">
            <GraduationCap size={22} />

            <span>Educational Background</span>
          </div>
        }
        onEdit={() => {
          setEditingFromReview(true);

          goToStep(2);
        }}
      >
        <Info label="Highest Attainment">{data.highestEducation}</Info>

        {data.otherEducation && (
          <Info label="Other Education">{data.otherEducation}</Info>
        )}

        <Info label="Elementary">{data.elementary}</Info>

        <Info label="Junior High">{data.secondary}</Info>

        <Info label="Senior High">{data.seniorHigh}</Info>

        <Info label="College / University">{data.college}</Info>

        <Info label="Course">{data.course}</Info>

        <Info label="Year Graduated">{data.yearGraduated}</Info>

        <Info label="TESDA">{data.tesda}</Info>

        <Info label="PRC License">{data.prc}</Info>

        <Info label="Trainings">{data.trainings}</Info>
      </Card>

      {/* Work Experience */}

      <Card
        title={
          <div className="flex items-center gap-3">
            <Briefcase size={22} />

            <span>Work Experience</span>
          </div>
        }
        onEdit={() => {
          setEditingFromReview(true);

          goToStep(3);
        }}
      >
        {data.noWorkExperience ? (
          <Info label="Status">No Work Experience</Info>
        ) : (
          <>
            <Info label="Company">{data.company}</Info>

            <Info label="Position">{data.position}</Info>

            <Info label="Employment Status">{data.employmentStatus}</Info>

            <Info label="Start Date">{data.startDate}</Info>

            <Info label="End Date">{data.endDate}</Info>

            <Info label="Description">{data.description}</Info>
          </>
        )}
      </Card>
      {/* Skills */}

      <Card
        title={
          <div className="flex items-center gap-3">
            <Wrench size={22} />

            <span>Skills</span>
          </div>
        }
        onEdit={() => {
          setEditingFromReview(true);

          goToStep(4);
        }}
      >
        {data.skills.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {data.skills.map((skill) => (
              <div
                key={skill}
                className="
                  bg-green-100
                  text-green-700
                  px-5
                  py-2
                  rounded-full
                  font-medium
                "
              >
                ✔ {skill}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No skills selected.</p>
        )}
      </Card>

      {/* Documents */}

      <Card
        title={
          <div className="flex items-center gap-3">
            <FileText size={22} />

            <span>Documents</span>
          </div>
        }
        onEdit={() => {
          setEditingFromReview(true);

          goToStep(5);
        }}
      >
        <div className="grid md:grid-cols-2 gap-6">
          <DocumentPreview
            title="Valid ID"
            file={data.validId}
            onView={(file) => {
              setSelectedFile(file);

              setSelectedTitle("Valid ID");
            }}
          />

          <DocumentPreview
            title="Resume"
            file={data.resume}
            onView={(file) => {
              setSelectedFile(file);

              setSelectedTitle("Resume");
            }}
          />

          <DocumentPreview
            title="TESDA Certificate"
            file={data.tesdaCertificate}
            onView={(file) => {
              setSelectedFile(file);

              setSelectedTitle("TESDA Certificate");
            }}
          />

          <DocumentPreview
            title="Barangay Clearance"
            file={data.barangayClearance}
            onView={(file) => {
              setSelectedFile(file);

              setSelectedTitle("Barangay Clearance");
            }}
          />

          <DocumentPreview
            title="Police Clearance"
            file={data.policeClearance}
            onView={(file) => {
              setSelectedFile(file);

              setSelectedTitle("Police Clearance");
            }}
          />

          <DocumentPreview
            title="NBI Clearance"
            file={data.nbiClearance}
            onView={(file) => {
              setSelectedFile(file);

              setSelectedTitle("NBI Clearance");
            }}
          />

          {data.juniorHighDiploma && (
            <DocumentPreview
              title="Junior High Diploma"
              file={data.juniorHighDiploma}
              onView={(file) => {
                setSelectedFile(file);

                setSelectedTitle("Junior High Diploma");
              }}
            />
          )}

          {data.seniorHighDiploma && (
            <DocumentPreview
              title="Senior High Diploma"
              file={data.seniorHighDiploma}
              onView={(file) => {
                setSelectedFile(file);

                setSelectedTitle("Senior High Diploma");
              }}
            />
          )}

          {data.collegeDiploma && (
            <DocumentPreview
              title="College Diploma"
              file={data.collegeDiploma}
              onView={(file) => {
                setSelectedFile(file);

                setSelectedTitle("College Diploma");
              }}
            />
          )}

          {data.mastersDiploma && (
            <DocumentPreview
              title="Master's Diploma"
              file={data.mastersDiploma}
              onView={(file) => {
                setSelectedFile(file);

                setSelectedTitle("Master's Diploma");
              }}
            />
          )}

          {data.doctorateDiploma && (
            <DocumentPreview
              title="Doctorate Diploma"
              file={data.doctorateDiploma}
              onView={(file) => {
                setSelectedFile(file);

                setSelectedTitle("Doctorate Diploma");
              }}
            />
          )}
        </div>
      </Card>

      <DocumentModal
        open={selectedFile !== null}
        title={selectedTitle}
        file={selectedFile}
        onClose={() => {
          setSelectedFile(null);

          setSelectedTitle("");
        }}
      />
    </div>
  );
}
type CardProps = {
  title: React.ReactNode;
  children: React.ReactNode;
  onEdit?: () => void;
};

function Card({ title, children, onEdit }: CardProps) {
  return (
    <div
      className="
        bg-white
        rounded-3xl
        shadow
        border
        mb-8
        overflow-hidden
      "
    >
      <div
        className="
          bg-gray-50
          px-8
          py-5
          border-b
          flex
          items-center
          justify-between
        "
      >
        <h2
          className="
            text-xl
            font-bold
          "
        >
          {title}
        </h2>

        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="
              text-blue-600
              hover:text-blue-800
              font-semibold
              text-sm
            "
          >
            Edit
          </button>
        )}
      </div>

      <div className="p-8">{children}</div>
    </div>
  );
}

type InfoProps = {
  label: string;

  children: React.ReactNode;
};

function Info({
  label,

  children,
}: InfoProps) {
  return (
    <div
      className="
        grid
        grid-cols-3
        py-4
        border-b
        last:border-none
      "
    >
      <div
        className="
          text-gray-500
          font-medium
        "
      >
        {label}
      </div>

      <div
        className="
          col-span-2
          font-semibold
          text-gray-800
          break-words
        "
      >
        {children || "-"}
      </div>
    </div>
  );
}
type DocumentPreviewProps = {
  title: string;

  file?: File | null;

  onView: (file: File) => void;
};

function DocumentPreview({
  title,

  file,

  onView,
}: DocumentPreviewProps) {
  if (!file) {
    return (
      <div
        className="
          border
          rounded-2xl
          p-5
        "
      >
        <h3
          className="
            font-semibold
          "
        >
          {title}
        </h3>

        <p
          className="
            mt-2
            text-red-500
          "
        >
          Not Uploaded
        </p>
      </div>
    );
  }

  return (
    <div
      className="
        border
        rounded-2xl
        p-5
      "
    >
      <div
        className="
          flex
          items-center
          justify-between
        "
      >
        <div>
          <h3
            className="
              font-bold
            "
          >
            {title}
          </h3>

          <p
            className="
              text-green-600
            "
          >
            Uploaded
          </p>
        </div>

        <button
          type="button"
          onClick={() => onView(file)}
          className="
            bg-blue-600
            hover:bg-blue-700
            text-white
            px-5
            py-2
            rounded-xl
            transition
          "
        >
          View
        </button>
      </div>
    </div>
  );
}
