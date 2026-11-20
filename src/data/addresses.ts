import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../firebase";
import type { AddressDetails, SavedAddress } from "./models";

function savedAddressesCollection(uid: string) {
  return collection(db, "users", uid, "savedAddresses");
}

export function watchSavedAddresses(
  uid: string,
  onChange: (addresses: SavedAddress[]) => void,
  onError: (error: Error) => void,
) {
  const addressesQuery = query(savedAddressesCollection(uid), orderBy("label"));
  return onSnapshot(
    addressesQuery,
    (snapshot) =>
      onChange(
        snapshot.docs.map(
          (savedAddress) =>
            ({ id: savedAddress.id, ...savedAddress.data() }) as SavedAddress,
        ),
      ),
    onError,
  );
}

export async function createSavedAddress(
  uid: string,
  label: string,
  address: AddressDetails,
) {
  const savedAddress = { label: label.trim(), ...address };
  const reference = await addDoc(savedAddressesCollection(uid), savedAddress);
  return { id: reference.id, ...savedAddress };
}

export function deleteSavedAddress(uid: string, addressId: string) {
  return deleteDoc(doc(db, "users", uid, "savedAddresses", addressId));
}
