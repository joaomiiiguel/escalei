"use client";

import { useState } from "react";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { REGEXP_ONLY_DIGITS } from "input-otp";

type SignInAction = (formData: FormData) => void | Promise<void>;
type Step = "invite" | "phone" | "verify";

const primaryButton = "flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[14px] !border-0 bg-[#2fe06b] px-5 py-3 text-base font-bold text-[#06200f] transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2fe06b] disabled:opacity-50 disabled:pointer-events-none";
const brand = <span className="inline-flex items-center gap-2 text-[29px] font-black tracking-[-0.8px] text-[#f3f5f4]"><i aria-hidden="true" className="grid size-[42px] place-items-center rounded-full border-[3px] border-current text-lg not-italic">◉</i>escalei</span>;
const statusBar = <div aria-hidden="true" className="flex h-[54px] items-center justify-between px-7 pl-[34px] text-base font-bold text-[#f3f5f4]"><span>9:41</span><span>⌁ ◔ ▰</span></div>;

export function OnboardingEntry({ verificar, erro, mock, requestPhoneOtp, verifyPhoneOtp }: { verificar: boolean; erro?: string; mock: boolean; requestPhoneOtp: SignInAction; verifyPhoneOtp: SignInAction }) {
  const [step, setStep] = useState<Step>(verificar ? "verify" : erro ? "phone" : "invite");
  const [telefone, setTelefone] = useState("");
  const [codigo, setCodigo] = useState("");

  if (step === "invite") {
    return (
      <main className="mx-auto grid h-dvh min-h-dvh w-full !max-w-[390px] grid-rows-[54px_56px_auto_auto_auto_auto_1fr] gap-4 overflow-y-auto bg-[#0f1710] !px-5 !pt-0 !pb-4 text-center">
        <div aria-hidden="true" className="flex items-center justify-between px-2 pl-[14px] text-base font-bold text-[#f3f5f4]"><span>9:41</span><span>⌁ ◔ ▰</span></div>
        <a href="/" aria-label="Ir para a página inicial do Escalei" className="inline-flex h-[42px] w-[145px] items-center gap-2 self-center text-[29px] font-black tracking-[-1.5px] text-[#f3f5f4] no-underline"><span aria-hidden="true" className="grid size-[42px] place-items-center rounded-full border-[3px] border-current text-lg">◉</span>escalei</a>
        <div aria-hidden="true" className="relative mx-auto grid size-[108px] place-items-center rounded-full bg-[#ffc9331f] before:absolute before:size-[76px] before:rounded-full before:bg-[#1e2622]"><span className="relative text-[38px]">🍺</span></div>
        <span className="mx-auto inline-flex min-h-7 items-center rounded-full bg-[#ffc9331f] px-3 text-[11px] font-extrabold tracking-[1px] text-[#ffc933]">VOCÊ FOI CONVIDADO</span>
        <div className="grid gap-3"><h1 className="m-0 text-[28px] font-extrabold leading-tight tracking-[-0.9px] text-[#f3f5f4]">Resenha do Trabalho</h1><p className="mx-auto my-0 max-w-[342px] text-[14.5px] leading-[22px] text-[#a0a8af]">Marcos te convidou para a liga Resenha do Trabalho. São 12 pessoas disputando a Rodada 29 do Brasileirão.</p></div>
        <div aria-label="Participantes da liga" className="flex min-h-[42px] items-center justify-center pt-1"><b className="grid size-[38px] place-items-center rounded-full border-2 border-[#0f1710] bg-[#39dc69] text-xs text-[#092305]">MV</b><b className="-ml-[5px] grid size-[38px] place-items-center rounded-full border-2 border-[#0f1710] bg-[#374540] text-xs text-[#d8f5d2]">JP</b><b className="-ml-[5px] grid size-[38px] place-items-center rounded-full border-2 border-[#0f1710] bg-[#4f5648] text-xs text-[#d8f5d2]">CS</b><b className="-ml-[5px] grid size-[38px] place-items-center rounded-full border-2 border-[#0f1710] bg-[#1b2a22] text-xs text-[#d8f5d2]">TZ</b><b className="-ml-[5px] grid size-[38px] place-items-center rounded-full border-2 border-[#0f1710] bg-[#263229] text-xs text-[#d8e7d8]">+8</b></div>
        <div className="grid self-end gap-3"><ul className="m-0 grid list-none gap-2.5 p-0 text-left text-[13px] text-[#f3f5f4]"><li className="flex min-h-[42px] items-center gap-2 rounded-xl bg-[#171a1d] px-3 py-2.5"><span className="font-black text-[#91eb80]">✓</span> Grátis, sem cartão e sem aposta</li><li className="flex min-h-[42px] items-center gap-2 rounded-xl bg-[#171a1d] px-3 py-2.5"><span className="font-black text-[#91eb80]">◷</span> Dá para escalar até sáb 16:00</li><li className="flex min-h-[42px] items-center gap-2 rounded-xl bg-[#171a1d] px-3 py-2.5"><span className="font-black text-[#91eb80]">♕</span> Disputa direto no ranking da liga</li></ul><Button type="button" size="lg" onClick={() => setStep("phone")} className={`${primaryButton} min-h-16`}>Aceitar convite e criar conta <span aria-hidden="true">→</span></Button><Button type="button" variant="ghost" onClick={() => setStep("phone")} className="text-[13px] font-semibold text-[#a0a8af]">Ver como funciona antes</Button></div>
      </main>
    );
  }

  const isVerification = step === "verify";
  const title = isVerification ? "Confirme o código" : "Criar sua conta";
  const description = isVerification ? (mock ? "Modo de desenvolvimento: use o código configurado localmente." : "Enviamos um código de seis dígitos por SMS para validar seu acesso.") : "Leva 20 segundos. A gente só precisa de um jeito de te reconhecer na próxima rodada.";

  return (
    <main className="mx-auto grid h-dvh min-h-dvh w-full !max-w-[390px] grid-rows-[54px_minmax(0,1fr)] overflow-hidden bg-[#0f1710] !p-0">
      {statusBar}
      <section aria-labelledby="phone-title" className="grid min-h-0 grid-rows-[44px_minmax(0,1fr)_auto] gap-3 overflow-y-auto px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-1">
        <Button type="button" variant="secondary" size="icon-lg" onClick={() => setStep(isVerification ? "phone" : "invite")} aria-label={isVerification ? "Voltar para informar o telefone" : "Voltar para o convite"} className="size-11 rounded-full !border-0 bg-[#29332c] !p-0 text-[22px] text-[#f3f5f4]">←</Button>
        <div className="grid min-h-0 content-center justify-items-center gap-6 pt-5">
          <>{brand}</>
          <h1 id="phone-title" className="m-0 text-center text-[clamp(26px,7.7vw,30px)] font-extrabold leading-[1.1] tracking-[-1px] text-[#f3f5f4]">{title}</h1>
          <p className="m-0 w-full text-sm leading-[21px] text-[#a0a8af]">{description}</p>
        </div>
        {isVerification ?
          <form action={verifyPhoneOtp} className="grid self-end gap-1.5 !m-0">
            {erro === "codigo" && <p role="alert" className="m-0 text-sm text-[#ffc3c3]">O código é inválido ou expirou. Tente novamente.</p>}
            <div className="grid gap-1.5 text-[13px] font-bold text-[#a0a8af]"><span>Código recebido</span>
              <InputOTP name="codigo" maxLength={6} required autoFocus pattern={REGEXP_ONLY_DIGITS} inputMode="numeric" value={codigo} onChange={setCodigo}>
                <InputOTPGroup className="w-full h-[54px] *:flex-1 *:h-full">
                  <InputOTPSlot index={0} className="border-[#2fe06b]/50 bg-[#29332c] text-[20px] font-semibold text-[#f3f5f4]" />
                  <InputOTPSlot index={1} className="border-[#2fe06b]/50 bg-[#29332c] text-[20px] font-semibold text-[#f3f5f4]" />
                  <InputOTPSlot index={2} className="border-[#2fe06b]/50 bg-[#29332c] text-[20px] font-semibold text-[#f3f5f4]" />
                  <InputOTPSlot index={3} className="border-[#2fe06b]/50 bg-[#29332c] text-[20px] font-semibold text-[#f3f5f4]" />
                  <InputOTPSlot index={4} className="border-[#2fe06b]/50 bg-[#29332c] text-[20px] font-semibold text-[#f3f5f4]" />
                  <InputOTPSlot index={5} className="border-[#2fe06b]/50 bg-[#29332c] text-[20px] font-semibold text-[#f3f5f4]" />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button type="submit" size="lg" className={primaryButton} disabled={codigo.length < 6}>Verificar código <span aria-hidden="true">→</span></Button>
            <a href="/entrar" className="mt-2 text-center text-[13px] text-[#a0a8af]">Usar outro número</a></form> :
          <form action={requestPhoneOtp} className="grid self-end gap-1.5 !m-0">
            {erro && <p role="alert" className="m-0 text-sm text-[#ffc3c3]">{erro === "telefone" ? "Informe um celular brasileiro válido." : "Não foi possível enviar o SMS. Tente novamente."}</p>}
            <label className="grid gap-1.5 text-[13px] font-bold text-[#a0a8af]"><span>Seu telefone</span><span className="flex min-h-[54px] items-center gap-2.5 rounded-[14px] bg-[#29332c] px-3.5 outline outline-[1.5px] outline-offset-[-0.75px] outline-[#2fe06b]"><i aria-hidden="true" className="text-lg not-italic text-[#6d7d76]">☎</i><Input name="telefone" type="tel" inputMode="tel" placeholder="(11) 99999-1234" autoComplete="tel-national" required autoFocus className="min-h-[52px] min-w-0 flex-1 !border-0 bg-transparent !p-0 text-[15px] font-semibold text-[#f3f5f4] outline-0 placeholder:text-[#a0a8af]" value={telefone} onChange={(e) => setTelefone(e.target.value)} /></span></label>
            <small className="mb-[clamp(18px,7vh,48px)] text-xs text-[#6d7d76]">Verificamos se este telefone está registrado para o convite.</small><Button type="submit" size="lg" className={primaryButton} disabled={telefone.replace(/\D/g, "").length < 10}><span aria-hidden="true">◈</span> Validar telefone</Button><p className="m-0 mt-2.5 text-center text-[11.5px] leading-[17px] text-[#6d7d76]">Ao continuar você concorda com os Termos de uso e a Política de privacidade. Não enviamos spam.</p>
          </form>}
      </section>
    </main>
  );
}
