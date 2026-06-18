import { getAuth, onAuthStateChanged } from "firebase/auth";
import { syncUserToSupabase, fetchProfile } from "../api/authApi.js";
import { firebaseApp } from "../utils/firebase/client.js";

const auth = getAuth(firebaseApp);

export function isOnboardingComplete(profile) {
  return Boolean(profile?.phoneVerified);
}

export async function ensureUserProfile(user) {
  try {
    await syncUserToSupabase();
  } catch (error) {
    console.warn("[sync] Supabase:", error.message);
  }
  return fetchProfile();
}

export async function loadUserProfile() {
  const user = auth.currentUser;
  if (!user) return null;
  return fetchProfile();
}

export function waitForAuthUser() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user);
    });
  });
}
