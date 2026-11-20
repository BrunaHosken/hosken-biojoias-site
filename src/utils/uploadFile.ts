import {
  uploadBytesResumable,
  type StorageReference,
  type UploadMetadata,
} from "firebase/storage";

const UPLOAD_TIMEOUT_MS = 60_000;

export async function uploadFile(
  target: StorageReference,
  file: Blob,
  metadata: UploadMetadata,
) {
  const task = uploadBytesResumable(target, file, metadata);
  let timeoutId = 0;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      task.cancel();
      reject(new Error("file-upload-timeout"));
    }, UPLOAD_TIMEOUT_MS);
  });

  try {
    return await Promise.race([task, timeout]);
  } finally {
    window.clearTimeout(timeoutId);
  }
}
