"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import { Checkbox } from "@/components/shadcn/checkbox";
import { Input } from "@/components/ui/input";
import { TeamLogo } from "./team-logo";

type Club = { id: number; nome: string; sigla: string; logo_url?: string | null };
type FinishAction = (formData: FormData) => void | Promise<void>;

export function OnboardingForm({ clubs, erro, inviteToken, finishOnboarding }: { clubs: Club[]; erro?: string; inviteToken?: string; finishOnboarding: FinishAction }) {
  const [clubId, setClubId] = useState("");
  const [apelido, setApelido] = useState("");
  const [termos, setTermos] = useState(false);

  return (
    <main className="mx-auto grid h-dvh min-h-dvh w-full !max-w-[490px]  overflow-hidden bg-[#0f1710] !p-0 text-[#f3f5f4]">
      <div className="flex items-center px-5">
        <a href="/entrar" aria-label="Voltar para entrar" className="grid size-11 place-items-center rounded-full bg-[#29332c] text-[22px] text-[#f3f5f4] no-underline">←</a>
      </div>
      <form id="onboarding-profile-form" action={finishOnboarding} className="grid min-h-0 content-start gap-5 overflow-y-auto px-5 pb-6 pt-1 !m-0">
        {inviteToken && <input type="hidden" name="convite" value={inviteToken} />}

        <header className="grid gap-2">
          <h1 className="m-0 text-[28px] font-extrabold leading-tight tracking-[-0.9px]">Como vamos te chamar?</h1>
          <p className="m-0 text-sm leading-[21px] text-[#a0a8af]">Seu apelido aparece no ranking geral e nas ligas.</p>
        </header>

        {erro && <p role="alert" className="m-0 text-sm text-[#ffc3c3]">{erro === "apelido_indisponivel" ? "Esse apelido já está em uso." : erro === "registro" ? "Não foi possível criar seu acesso agora. Tente novamente." : "Revise os dados e tente novamente."}</p>}

        <label className="grid gap-1.5 text-[13px] font-semibold text-[#a0a8af]">
          <span>Apelido</span>
          <Input name="apelido" placeholder="ex.: rafa10" minLength={3} maxLength={20} autoComplete="nickname" required autoFocus className="h-[52px] rounded-xl !border-0 bg-[#29332c] px-3.5 text-[15px] font-semibold text-[#f3f5f4] outline outline-[1.5px] outline-offset-[-0.75px] outline-[#2fe06b] placeholder:text-[#a0a8af] focus-visible:ring-0" value={apelido} onChange={(e) => setApelido(e.target.value)} />
          <small className="text-xs font-normal text-[#37d67a]">3 a 20 caracteres</small>
        </label>

        <section className="grid gap-2.5" aria-labelledby="club-title">
          <div className="grid gap-1">
            <h2 id="club-title" className="m-0 text-[13px] font-semibold text-[#a0a8af]">Time do coração <span className="font-normal">opcional</span></h2>
            <p className="m-0 text-xs leading-4 text-[#6d7d76]">Serve para o ranking por clube. Não muda a sua escalação.</p>
          </div>
          <input type="hidden" name="clube_coracao_id" value={clubId} />

          <div className="grid grid-cols-5 gap-2">
            {clubs.map((club) => {
              const selected = clubId === String(club.id);

              return <Button key={club.id} type="button" variant="ghost" onClick={() => setClubId(selected ? "" : String(club.id))} aria-pressed={selected} aria-label={`Selecionar ${club.nome}`} className={`relative flex h-[58px] flex-col gap-1 rounded-xl !border-0 !p-2 ${selected ? "bg-[#2fe06b1f] text-[#2fe06b] outline outline-[1.5px] outline-offset-[-0.75px] outline-[#2fe06b]" : "bg-[#171a1d] text-[#a0a8af]"}`}>
                <TeamLogo logoUrl={club.logo_url} nome={club.nome} sigla={club.sigla} />
                <span className="text-[10.5px] font-extrabold">{club.sigla}</span>
                {selected && <Check aria-hidden="true" className="absolute right-1 top-1 size-3" />}
              </Button>;
            })}</div>

        </section>

        <label className="flex items-start gap-2 pt-1 text-xs leading-4 text-[#a0a8af]">
          <Checkbox name="aceite_termos" value="on" required className="mt-0.5 border-[#6d7d76] data-checked:border-[#2fe06b] data-checked:bg-[#2fe06b] data-checked:text-[#06200f]" checked={termos} onCheckedChange={(c) => setTermos(c === true)} />
          <span>Li e aceito os Termos de uso e a Política de privacidade.</span>
        </label>
      </form>

      <div className="border-t border-[#1e2921] bg-[#0f1710] px-5 py-5">
        <Button type="submit" form="onboarding-profile-form" disabled={apelido.length < 3 || !termos} className="flex items-center justify-center gap-2 h-[52px] w-full rounded-[14px] !border-0 bg-[#2fe06b] text-base font-bold text-[#06200f] hover:bg-[#49ef7c] transition disabled:opacity-50 disabled:pointer-events-none">
          <ArrowRight aria-hidden="true" />Continuar</Button></div>
    </main>
  );
}
