import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth } from "./client.js";
import { ensureUserProfile } from "../../auth/profile.js";

const googleProvider = new GoogleAuthProvider();

export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  await ensureUserProfile(result.user);
  return result.user;
}

export async function loginWithEmail(email, password) {
  const result = await signInWithEmailAndPassword(auth, email.trim(), password);
  await ensureUserProfile(result.user);
  return result.user;
}

export async function registerWithEmail(email, password) {
  const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await ensureUserProfile(result.user);
  return result.user;
}

export async function logout() {
  await signOut(auth);
}

export async function getIdToken() {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}
