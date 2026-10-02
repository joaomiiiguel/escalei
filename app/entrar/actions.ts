"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const phoneOtpCookie = "escalei_phone_otp";

function phoneOtpMode() {
  const mode = process.env.AUTH_PHONE_OTP_MODE ?? "supabase";
  return process.env.NODE_ENV === "development" && mode === "mock" ? "mock" : "supabase";
}

function mockOtpCode() {
  return process.env.AUTH_PHONE_OTP_MOCK_CODE ?? "000000";
}

function normalizeBrazilianMobile(value: FormDataEntryValue | null) {
  const digits = String(value ?? "").replace(/\D/g, "");
  const nationalNumber = digits.length === 13 && digits.startsWith("55") ? digits.slice(2) : digits;

  if (!/^[1-9]\d9\d{8}$/.test(nationalNumber)) return null;
  return `+55${nationalNumber}`;
}

export async function requestPhoneOtp(formData: FormData) {
  const phone = normalizeBrazilianMobile(formData.get("telefone"));
  if (!phone) redirect("/entrar?erro=telefone");

  const mode = phoneOtpMode();
  if (mode === "supabase") {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: { shouldCreateUser: true },
    });
    if (error) redirect("/entrar?erro=sms");
  }

  const cookieStore = await cookies();
  cookieStore.set(phoneOtpCookie, phone, {
    httpOnly: true,
    maxAge: 10 * 60,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  redirect(mode === "mock" ? "/entrar?verificar=1&modo=mock" : "/entrar?verificar=1");
}

export async function verifyPhoneOtp(formData: FormData) {
  const code = String(formData.get("codigo") ?? "").replace(/\D/g, "");
  const cookieStore = await cookies();
  const phone = cookieStore.get(phoneOtpCookie)?.value;

  if (!phone || !/^\d{6}$/.test(code)) redirect("/entrar?erro=codigo");

  if (phoneOtpMode() === "mock") {
    if (code !== mockOtpCode()) redirect("/entrar?verificar=1&modo=mock&erro=codigo");
    cookieStore.delete(phoneOtpCookie);
    redirect("/onboarding?mock=1");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ phone, token: code, type: "sms" });
  if (error) redirect("/entrar?verificar=1&erro=codigo");

  cookieStore.delete(phoneOtpCookie);
  redirect("/onboarding");
}
