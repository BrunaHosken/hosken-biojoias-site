import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import {
  connectStorageEmulator,
  getStorage,
} from "firebase/storage";
export const localMode = import.meta.env.VITE_USE_EMULATORS !== "false";
const projectId = localMode
  ? "demo-hosken"
  : import.meta.env.VITE_FIREBASE_PROJECT_ID;
const storageBucket = localMode
  ? `${projectId}.firebasestorage.app`
  : import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
if (
  !localMode &&
  (!projectId ||
    projectId.startsWith("demo-") ||
    !import.meta.env.VITE_FIREBASE_API_KEY ||
    !storageBucket)
)
  throw new Error(
    "Configure o projeto Firebase e o bucket do Storage antes de desativar os emuladores.",
  );
const app = initializeApp({
  projectId,
  storageBucket,
  apiKey: localMode ? "demo-key" : import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: localMode
    ? "demo-hosken.firebaseapp.com"
    : import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
});
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
if (localMode) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
}
