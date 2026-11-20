import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import { connectStorageEmulator, getStorage } from "firebase/storage";
export const localMode = import.meta.env.VITE_USE_EMULATORS !== "false";
const projectId = localMode
  ? "demo-hosken"
  : import.meta.env.VITE_FIREBASE_PROJECT_ID;
const storageBucket = localMode
  ? `${projectId}.firebasestorage.app`
  : import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
const authDomain = localMode
  ? "demo-hosken.firebaseapp.com"
  : import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
const appId = localMode
  ? "1:000000000000:web:demo-hosken"
  : import.meta.env.VITE_FIREBASE_APP_ID;
if (
  !localMode &&
  (!projectId ||
    projectId.startsWith("demo-") ||
    !import.meta.env.VITE_FIREBASE_API_KEY ||
    !authDomain ||
    !storageBucket ||
    !appId)
)
  throw new Error(
    "Configure os dados do app Firebase antes de desativar os emuladores.",
  );
export const app = initializeApp({
  projectId,
  storageBucket,
  apiKey: localMode ? "demo-key" : import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain,
  appId,
});
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, "southamerica-east1");
if (localMode) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
}
