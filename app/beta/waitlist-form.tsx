"use client";

import { useId, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { LoadingContent } from "@/components/ui/loading-content";
import { joinWaitlist, type WaitlistResult } from "./actions";
import { validateWaitlist as validate, type WaitlistErrors as FormErrors } from "@/lib/waitlist";

export function WaitlistForm() {
  const id = useId();
  const [values, setValues] = useState({ name: "", whatsapp: "", email: "", consent: false });
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  function update(field: keyof typeof values, value: string | boolean) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    setSubmitError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setStatus("loading");
    const result: WaitlistResult = await joinWaitlist(values).catch((): WaitlistResult => ({ ok: false, message: "Não foi possível entrar na lista agora. Tente novamente em instantes." }));
    if (result.ok) {
      setStatus("success");
      return;
    }
    setErrors(result.errors ?? {});
    setSubmitError(result.message ?? null);
    setStatus("idle");
  }

  if (status === "success") {
    return (
      <section
        aria-labelledby={`${id}-success-title`}
        className="rounded-2xl border border-primary/35 bg-[#082717] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.3)] sm:p-6"
      >
        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <CheckCircle2 className="size-6" aria-hidden="true" />
        </div>
        <h2 id={`${id}-success-title`} className="text-2xl font-black tracking-tight text-foreground">
          Você está na lista!
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#b6d1bf]">
          Quando novas vagas forem liberadas, vamos enviar seu convite para o grupo oficial de WhatsApp do beta.
        </p>
        <a
          href="#inicio"
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl border border-primary/35 px-4 text-sm font-extrabold text-primary outline-none transition hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Voltar ao início
        </a>
      </section>
    );
  }

  return (
    <form
      id="lista-de-espera"
      onSubmit={submit}
      noValidate
      className="rounded-2xl border border-[#254232] bg-[#0b1410] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.3)] sm:p-6"
      aria-labelledby={`${id}-title`}
    >
      <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Lista de espera</p>
      <h2 id={`${id}-title`} className="mt-3 text-2xl font-black tracking-tight text-foreground">
        Entre para o beta
      </h2>
      <p className="mt-2 text-sm leading-6 text-[#a5bdae]">
        Deixe seus dados para receber novidades e o convite para o grupo de WhatsApp do Escalou.
      </p>

      <div className="mt-6 grid gap-4">
        <Field
          id={`${id}-name`}
          label="Nome ou apelido"
          value={values.name}
          placeholder="Como a turma te chama"
          error={errors.name}
          onChange={(value) => update("name", value)}
          autoComplete="name"
        />
        <Field
          id={`${id}-whatsapp`}
          label="WhatsApp com DDD"
          value={values.whatsapp}
          placeholder="(11) 99999-9999"
          error={errors.whatsapp}
          onChange={(value) => update("whatsapp", value)}
          inputMode="tel"
          autoComplete="tel"
        />
        <Field
          id={`${id}-email`}
          label="E-mail"
          value={values.email}
          placeholder="voce@email.com"
          error={errors.email}
          onChange={(value) => update("email", value)}
          inputMode="email"
          autoComplete="email"
        />

        <div>
          <label className="flex gap-3 rounded-xl border border-[#254232] bg-[#08100c] p-3 text-sm leading-5 text-[#b6d1bf]">
            <input
              type="checkbox"
              checked={values.consent}
              onChange={(event) => update("consent", event.target.checked)}
              aria-invalid={Boolean(errors.consent)}
              aria-describedby={errors.consent ? `${id}-consent-error` : undefined}
              className="mt-0.5 size-5 rounded border-[#345b43] bg-[#050806] text-primary accent-[#00e58a] focus-visible:ring-2 focus-visible:ring-ring"
            />
            <span>Aceito receber informações sobre o beta do Escalou por WhatsApp e e-mail.</span>
          </label>
          {errors.consent ? (
            <p id={`${id}-consent-error`} className="mt-2 text-xs font-bold text-[#ff8f8f]">
              {errors.consent}
            </p>
          ) : null}
        </div>
      </div>

      {submitError ? (
        <p role="alert" className="mt-4 text-sm font-bold text-[#ff8f8f]">
          {submitError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "loading"}
        aria-busy={status === "loading" || undefined}
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground outline-none transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-wait disabled:opacity-75"
      >
        <LoadingContent loading={status === "loading"} loadingText="Entrando…">Entrar na lista de espera</LoadingContent>
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  placeholder,
  error,
  onChange,
  inputMode,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  error?: string;
  onChange: (value: string) => void;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-extrabold text-[#cbe0d0]">
        {label}
      </label>
      <input
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        inputMode={inputMode}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="mt-2 min-h-12 w-full rounded-xl border border-[#254232] bg-[#08100c] px-4 text-base text-foreground outline-none transition placeholder:text-[#66786c] focus:border-primary focus:ring-2 focus:ring-ring/60 aria-invalid:border-[#f15b5b] aria-invalid:ring-[#f15b5b]/30"
      />
      {error ? (
        <p id={`${id}-error`} className="mt-2 text-xs font-bold text-[#ff8f8f]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
