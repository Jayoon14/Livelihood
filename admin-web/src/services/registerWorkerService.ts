import { supabase } from "../lib/supabase";
import type { RegisterData } from "../store/registerStore";

function wrapError(error: unknown, fallback: string): Error {
  if (error instanceof Error) {
    return error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error
  ) {
    return new Error(
      String((error as { message: unknown }).message),
    );
  }

  return new Error(fallback);
}

function requireText(value: string, field: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`${field} is required.`);
  }

  return normalizedValue;
}

function optionalText(
  value: string | null | undefined,
): string | null {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : null;
}

export async function submitWorkerRegistration(
  data: RegisterData,
  captchaToken: string,
): Promise<{
  userId: string;
  message: string;
}> {
  const email = requireText(
    data.email,
    "Email",
  ).toLowerCase();

  const password = requireText(
    data.password,
    "Password",
  );

  const firstName = requireText(
    data.firstName,
    "First name",
  );

  const lastName = requireText(
    data.lastName,
    "Last name",
  );

  const verifiedCaptchaToken = requireText(
    captchaToken,
    "Security verification",
  );

  /*
   * Confirm Email is enabled.
   *
   * Supabase normally returns session=null after sign-up until
   * the worker verifies the email address. Because of that, this
   * service must not upload files or insert protected rows from
   * the browser after signUp().
   *
   * The non-file registration information is placed in
   * user_metadata. A database trigger will save it to the public
   * worker tables using SECURITY DEFINER privileges.
   */
  const {
    data: auth,
    error: authError,
  } = await supabase.auth.signUp({
    email,
    password,
    options: {
      captchaToken: verifiedCaptchaToken,
      emailRedirectTo: window.location.origin,
      data: {
        role: "worker",
        status: "Pending",

        first_name: firstName,
        middle_name: optionalText(data.middleName),
        last_name: lastName,
        suffix: optionalText(data.suffix),

        birth_date: optionalText(data.birthDate),
        gender: optionalText(data.gender),
        civil_status: optionalText(data.civilStatus),
        religion: optionalText(data.religion),
        phone: optionalText(data.phone),

        house_no: optionalText(data.houseNo),
        street: optionalText(data.street),
        address: `${data.houseNo ?? ""} ${data.street ?? ""}`
          .replace(/\s+/g, " ")
          .trim(),
        barangay: optionalText(data.barangay),
        municipality: optionalText(data.municipality),
        province: optionalText(data.province),

        highest_attainment: optionalText(
          data.highestEducation,
        ),
        elementary: optionalText(data.elementary),
        secondary: optionalText(data.secondary),
        senior_high: optionalText(data.seniorHigh),
        college: optionalText(data.college),
        course: optionalText(data.course),
        year_graduated: optionalText(
          data.yearGraduated,
        ),
        tesda: optionalText(data.tesda),
        prc: optionalText(data.prc),
        trainings: optionalText(data.trainings),

        no_work_experience:
          Boolean(data.noWorkExperience),
        company: optionalText(data.company),
        position: optionalText(data.position),
        employment_status: optionalText(
          data.employmentStatus,
        ),
        start_date: optionalText(data.startDate),
        end_date: optionalText(data.endDate),
        work_description: optionalText(
          data.description,
        ),

        skills: (data.skills ?? [])
          .map((skill) => skill.trim())
          .filter(Boolean),

        /*
         * Files cannot be safely uploaded before email verification
         * because the new account does not yet have a session.
         */
        documents_pending: true,
      },
    },
  });

  if (authError) {
    throw wrapError(
      authError,
      "Unable to create the worker account.",
    );
  }

  if (!auth.user) {
    throw new Error(
      "Unable to create the worker account.",
    );
  }

  return {
    userId: auth.user.id,
    message:
      "Account created. Verify your email, then sign in to upload your documents and complete the worker application.",
  };
}