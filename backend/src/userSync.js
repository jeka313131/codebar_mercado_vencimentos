import { getUserById, upsertUser } from "./userStore.js";

export async function syncUserFromFirebase(firebaseUser) {
  const existing = await getUserById(firebaseUser.uid);

  await upsertUser({
    id: firebaseUser.uid,
    email: firebaseUser.email ?? existing?.email ?? null,
    displayName: firebaseUser.name ?? existing?.displayName ?? null,
    phone: existing?.phone ?? null,
    phoneVerified: existing?.phoneVerified ?? false,
    onboardingComplete: existing?.onboardingComplete ?? false,
    whatsappGroupId: existing?.whatsappGroupId ?? null,
    alertStartHour: existing?.alertStartHour ?? 8,
  });
}

export async function syncUserPhoneVerified(uid, phone, firebaseUser) {
  const existing = await getUserById(uid);

  await upsertUser({
    id: uid,
    email: firebaseUser?.email ?? existing?.email ?? null,
    displayName: firebaseUser?.name ?? existing?.displayName ?? null,
    phone,
    phoneVerified: true,
    onboardingComplete: true,
    whatsappGroupId: existing?.whatsappGroupId ?? null,
    alertStartHour: existing?.alertStartHour ?? 8,
  });
}
