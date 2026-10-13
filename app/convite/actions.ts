"use server";

import { redirect } from "next/navigation";
import { getInviteTokenByCode } from "@/lib/invites";

export async function useInviteCode(formData: FormData) {
  const code = String(formData.get("codigo") ?? "").trim().toUpperCase();
  const token = await getInviteTokenByCode(code);
  redirect(token ? `/convite/${token}` : "/convite?erro=codigo");
}
