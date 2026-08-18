import { getDoc, doc } from "firebase/firestore";
import { db } from "../firebase";

const HARDCODED_ADMINS = [
  "mcpetitapetit@gmail.com",
  "radoh410@gmail.com",
  "rradoharifetra@gmail.com",
  "entsdanny@gmail.com"
];

/**
 * Checks if a given Google account email or UID has administrator privileges.
 */
export async function checkUserIsAdmin(email: string | null | undefined, uid: string | undefined): Promise<boolean> {
  if (!uid) return false;
  
  const lowerEmail = email ? email.toLowerCase().trim() : "";
  
  // 1. Check hardcoded admins first for zero-latency success
  if (lowerEmail && HARDCODED_ADMINS.includes(lowerEmail)) {
    return true;
  }
  
  // 2. Fall back to checking the "users" collection in Firestore
  try {
    // A: Try checking with email key
    if (lowerEmail) {
      const emailDoc = await getDoc(doc(db, "users", lowerEmail));
      if (emailDoc.exists() && emailDoc.data()?.role === "admin") {
        return true;
      }
    }
    
    // B: Try checking with UID key
    const uidDoc = await getDoc(doc(db, "users", uid));
    if (uidDoc.exists() && uidDoc.data()?.role === "admin") {
      return true;
    }
  } catch (error) {
    console.warn("Could not fetch user admin status from collection (this is normal if permission is denied for non-admins):", error);
  }
  
  return false;
}
