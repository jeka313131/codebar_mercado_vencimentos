import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../utils/firebase/client.js";
import { ensureUserProfile, isOnboardingComplete } from "./profile.js";
import { getPath, navigate, renderRoute } from "../router.js";
import { closeSidebar } from "../components/sidebar.js";
import { stopScanner } from "../scanner.js";
import { stopPhotoCapture } from "../photoCapture.js";

const PUBLIC_ROUTES = new Set(["/login", "/verificar-telefone"]);

let authReady = false;
let currentUser = null;
let currentProfile = null;

export function getAuthUser() {
  return currentUser;
}

export function getAuthProfile() {
  return currentProfile;
}

async function refreshProfile() {
  if (!currentUser) {
    currentProfile = null;
    return;
  }
  currentProfile = await ensureUserProfile(currentUser);
}

async function routeByAuthState() {
  if (!authReady) return;

  const path = getPath();

  if (!currentUser) {
    if (path !== "/login") {
      navigate("/login");
      return;
    }
    await renderRoute();
    return;
  }

  if (!isOnboardingComplete(currentProfile)) {
    if (path !== "/verificar-telefone") {
      navigate("/verificar-telefone");
      return;
    }
    await renderRoute();
    return;
  }

  if (PUBLIC_ROUTES.has(path)) {
    navigate("/");
    return;
  }

  await renderRoute();
}

export function initAuthGuard() {
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    await refreshProfile();
    authReady = true;
    await routeByAuthState();
  });

  window.addEventListener("hashchange", () => {
    closeSidebar();
    stopScanner();
    stopPhotoCapture();
    routeByAuthState();
  });
}

export async function reloadAuthProfile() {
  await refreshProfile();
  await routeByAuthState();
}
