import { supabase } from "../lib/supabase";

const DB_NAME = "livelihoodgo-registration";
const STORE_NAME = "pending-profile-pictures";
const DB_VERSION = 2;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

interface PendingProfilePicture {
  email: string;
  file: File;
  savedAt: number;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, {
          keyPath: "email",
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        request.error ??
          new Error("Unable to open local registration storage."),
      );
  });
}

function validateFile(file: File): void {
  const allowedTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);

  if (!allowedTypes.has(file.type)) {
    throw new Error(
      "Profile picture must be a JPG, PNG, or WEBP image.",
    );
  }

  if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
    throw new Error(
      "Profile picture must be 5 MB or smaller.",
    );
  }
}

function getExtension(file: File): string {
  const extension = file.name
    .split(".")
    .pop()
    ?.trim()
    .toLowerCase();

  if (extension === "jpeg") {
    return "jpg";
  }

  if (
    extension === "jpg" ||
    extension === "png" ||
    extension === "webp"
  ) {
    return extension;
  }

  throw new Error("Invalid profile picture format.");
}

export async function savePendingProfilePicture(
  email: string,
  file: File | null,
): Promise<void> {
  if (!file) {
    return;
  }

  validateFile(file);

  const database = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(
      STORE_NAME,
      "readwrite",
    );

    transaction.objectStore(STORE_NAME).put({
      email: normalizeEmail(email),
      file,
      savedAt: Date.now(),
    } satisfies PendingProfilePicture);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(
        transaction.error ??
          new Error("Unable to save the pending profile picture."),
      );
  });

  database.close();
}

async function getPendingProfilePicture(
  email: string,
): Promise<PendingProfilePicture | null> {
  const database = await openDatabase();

  const result = await new Promise<
    PendingProfilePicture | undefined
  >((resolve, reject) => {
    const transaction = database.transaction(
      STORE_NAME,
      "readonly",
    );

    const request = transaction
      .objectStore(STORE_NAME)
      .get(normalizeEmail(email));

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        request.error ??
          new Error("Unable to read the pending profile picture."),
      );
  });

  database.close();
  return result ?? null;
}

async function deletePendingProfilePicture(
  email: string,
): Promise<void> {
  const database = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(
      STORE_NAME,
      "readwrite",
    );

    transaction
      .objectStore(STORE_NAME)
      .delete(normalizeEmail(email));

    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(
        transaction.error ??
          new Error("Unable to clear the pending profile picture."),
      );
  });

  database.close();
}

export async function uploadPendingProfilePicture(
  userId: string,
  email: string,
): Promise<string | null> {
  const pending = await getPendingProfilePicture(email);

  if (!pending) {
    return null;
  }

  validateFile(pending.file);

  const extension = getExtension(pending.file);
  const filePath = `${userId}/profile-${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("profile-picture")
    .upload(filePath, pending.file, {
      cacheControl: "3600",
      contentType: pending.file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(
      `Unable to upload profile picture: ${uploadError.message}`,
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage
    .from("profile-picture")
    .getPublicUrl(filePath);

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      profile_picture: publicUrl,
    })
    .eq("id", userId);

  if (profileError) {
    await supabase.storage
      .from("profile-picture")
      .remove([filePath]);

    throw new Error(
      `Unable to save profile picture: ${profileError.message}`,
    );
  }

  await deletePendingProfilePicture(email);

  return publicUrl;
}