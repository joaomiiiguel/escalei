import { OnboardingEntry } from "./onboarding-entry";
import { requestPhoneOtp, verifyPhoneOtp } from "./actions";

export default async function SignIn({ searchParams }: { searchParams: Promise<{ verificar?: string; erro?: string; modo?: string }> }) {
    const params = await searchParams;
    return <OnboardingEntry verificar={Boolean(params.verificar)} erro={params.erro} mock={params.modo === "mock"} requestPhoneOtp={requestPhoneOtp} verifyPhoneOtp={verifyPhoneOtp} />;
}
