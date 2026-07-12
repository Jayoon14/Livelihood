import { supabase } from "../lib/supabase";
import type { RegisterData } from "../store/registerStore";


// =========================
// UPLOAD DOCUMENT
// =========================

async function uploadDocument(
  file: File | null | undefined,
  folder: string,
  userId: string
) {

  if (!file) return null;


  const extension =
    file.name.split(".").pop()?.toLowerCase();


  if (!extension) {
    throw new Error(
      "Invalid file format."
    );
  }


  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "application/pdf",
  ];


  if (!allowedTypes.includes(file.type)) {

    throw new Error(
      "Only JPG, PNG, and PDF files are allowed."
    );

  }



  const fileName =
    `${userId}/${folder}-${Date.now()}.${extension}`;





  const {
    error
  } =
  await supabase.storage
    .from("worker-documents")
    .upload(
      fileName,
      file,
      {
        cacheControl: "3600",
        upsert:false,
        contentType:file.type,
      }
    );



  if(error){

    throw error;

  }




  const {
    data
  } =
  supabase.storage
    .from("worker-documents")
    .getPublicUrl(
      fileName
    );



  return data.publicUrl;

}





export async function submitWorkerRegistration(
  data:RegisterData
){




// =========================
// 1. CREATE AUTH USER
// =========================


const {
 data:authData,
 error:authError
}
=
await supabase.auth.signUp({

 email:data.email,

 password:data.password,

});



if(authError){

 throw authError;

}



if(!authData.user){

 throw new Error(
  "Unable to create account."
 );

}



const userId =
authData.user.id;

// =========================
// UPLOAD PROFILE PICTURE
// =========================

const profilePicture = await uploadDocument(
  data.profilePicture,
  "profile-picture",
  userId
);



// =========================
// 2. SAVE PROFILE
// =========================


const {
 error:profileError
}
=
await supabase
  .from("profiles")
  .insert({
    id: userId,

    role: "worker",

    email: data.email,

    first_name: data.firstName,
    middle_name: data.middleName,
    last_name: data.lastName,
    suffix: data.suffix,

    birth_date: data.birthDate,

    gender: data.gender,
    civil_status: data.civilStatus,
    religion: data.religion,

    phone: data.phone,

    address: `${data.houseNo} ${data.street}`,

    barangay: data.barangay,
    municipality: data.municipality,
    province: data.province,

    status: "Pending",

    profile_picture: profilePicture, 
  });


if(profileError){

 throw profileError;

}





// =========================
// 3. SAVE EDUCATION
// =========================


const {
 error:educationError
}
=
await supabase
.from("education")
.insert({

 profile_id:userId,


 highest_attainment:
 data.highestEducation,


 elementary:
 data.elementary,


 secondary:
 data.secondary,


 senior_high:
 data.seniorHigh,


 college:
 data.college,


 course:
 data.course,


 year_graduated:
 data.yearGraduated,


 tesda:
 data.tesda,


 prc:
 data.prc,


 trainings:
 data.trainings,

});



if(educationError){

 throw educationError;

}
// =========================
// 4. SAVE WORK EXPERIENCE
// =========================

if (!data.noWorkExperience) {

  const { error: workError } =
    await supabase
      .from("work_experience")
      .insert({

        profile_id: userId,

        company: data.company,

        position: data.position,

        employment_status: data.employmentStatus,

        start_date: data.startDate,

        end_date: data.endDate,

        description: data.description,

      });

  if (workError) {
    throw workError;
  }

}




// =========================
// 5. SAVE SKILLS
// =========================


if(
 data.skills &&
 data.skills.length > 0
){

 const skills =
 data.skills.map((skill)=>({

   profile_id:userId,

   skill_name:skill,

 }));


 const {
  error:skillError
 }
 =
 await supabase
 .from("worker_skills")
 .insert(skills);



 if(skillError){

  throw skillError;

 }

}







// =========================
// 6. UPLOAD DOCUMENTS
// =========================


const validId =
await uploadDocument(
 data.validId,
 "valid-id",
 userId
);



const resume =
await uploadDocument(
 data.resume,
 "resume",
 userId
);



const tesda =
await uploadDocument(
 data.tesdaCertificate,
 "tesda-certificate",
 userId
);



const barangay =
await uploadDocument(
 data.barangayClearance,
 "barangay-clearance",
 userId
);



const police =
await uploadDocument(
 data.policeClearance,
 "police-clearance",
 userId
);



const nbi =
await uploadDocument(
 data.nbiClearance,
 "nbi-clearance",
 userId
);








// =========================
// 7. SAVE DOCUMENT URLS
// =========================


const {
 error:documentError
}
=
await supabase
.from("documents")
.insert({

 profile_id:userId,


 valid_id:
 validId,


 resume:
 resume,


 tesda_certificate:
 tesda,


 barangay_clearance:
 barangay,


 police_clearance:
 police,


 nbi_clearance:
 nbi,

});



if(documentError){

 throw documentError;

}







// =========================
// 8. RETURN RESULT
// =========================


return {

 userId,

 message:
 "Registration successful.",

};


}