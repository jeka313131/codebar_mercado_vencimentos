import { supabase } from "./supabase.js";

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    phone: row.phone,
    phoneVerified: row.phone_verified,
    onboardingComplete: row.onboarding_complete,
    whatsappGroupId: row.whatsapp_group_id,
    alertStartHour: row.alert_start_hour ?? 8,
    alertDaysBefore: row.alert_days_before ?? 7,
    alertMode: row.alert_mode ?? "period",
    alertMilestones: row.alert_milestones ?? [10, 7, 3, 0],
  };
}

export async function getUserById(uid) {
  const { data, error } = await supabase.from("users").select("*").eq("id", uid).maybeSingle();
  if (error) throw new Error(error.message);
  return mapUser(data);
}

export async function upsertUser(fields) {
  const row = {
    id: fields.id,
    email: fields.email ?? null,
    display_name: fields.displayName ?? null,
    phone: fields.phone ?? null,
    phone_verified: fields.phoneVerified ?? false,
    onboarding_complete: fields.onboardingComplete ?? false,
    whatsapp_group_id: fields.whatsappGroupId ?? null,
    alert_start_hour: fields.alertStartHour ?? 8,
    alert_days_before: fields.alertDaysBefore ?? 7,
    alert_mode: fields.alertMode ?? "period",
    alert_milestones: fields.alertMilestones ?? [10, 7, 3, 0],
  };

  const { error } = await supabase.from("users").upsert(row, { onConflict: "id" });
  if (error) throw new Error(error.message);
  return mapUser(row);
}

export async function updateUserPhone(uid, phone, firebaseUser) {
  const existing = await getUserById(uid);

  return upsertUser({
    id: uid,
    email: firebaseUser?.email ?? existing?.email ?? null,
    displayName: firebaseUser?.name ?? existing?.displayName ?? null,
    phone,
    phoneVerified: true,
    onboardingComplete: true,
    whatsappGroupId: existing?.whatsappGroupId ?? null,
    alertStartHour: existing?.alertStartHour ?? 8,
    alertDaysBefore: existing?.alertDaysBefore ?? 7,
    alertMode: existing?.alertMode ?? "period",
    alertMilestones: existing?.alertMilestones ?? [10, 7, 3, 0],
  });
}

export async function updateWhatsappSettings(
  uid,
  { groupId, alertStartHour, alertDaysBefore, alertMode, alertMilestones },
) {
  const payload = { whatsapp_group_id: groupId };
  if (alertStartHour !== undefined) {
    payload.alert_start_hour = alertStartHour;
  }
  if (alertDaysBefore !== undefined) {
    payload.alert_days_before = alertDaysBefore;
  }
  if (alertMode !== undefined) {
    payload.alert_mode = alertMode;
  }
  if (alertMilestones !== undefined) {
    payload.alert_milestones = alertMilestones;
  }

  const { error } = await supabase.from("users").update(payload).eq("id", uid);
  if (error) throw new Error(error.message);
}
