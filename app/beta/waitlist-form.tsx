"use client";

import { useId, useState } from "react";
import { Check } from "lucide-react";
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
      <section role="status" aria-labelledby={`${id}-success-title`} className="border-l-4 border-(--lima) py-2 pl-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-500">
        <Check className="size-10 text-(--lima) motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-500 motion-safe:ease-[cubic-bezier(0.34,1.56,0.64,1)]" strokeWidth={3} aria-hidden="true" />
        <h3 id={`${id}-success-title`} className="mt-4 font-(family-name:--font-display) text-6xl font-black uppercase leading-[0.9]">
          Você está na lista!
        </h3>
        <p className="mt-4 max-w-md text-lg leading-relaxed text-(--giz-suave)">
          Quando novas vagas forem liberadas, vamos enviar seu convite para o grupo oficial de WhatsApp do beta.
        </p>
        <a
          href="#inicio"
          className="mt-5 inline-flex min-h-11 items-center font-semibold text-(--lima) underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-(--lima)"
        >
          Voltar ao início
        </a>
      </section>
    );
  }

  return (
    <form onSubmit={submit} noValidate aria-label="Entrar na lista de espera" className="grid gap-6">
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
        <label className="flex cursor-pointer items-start gap-3 text-base leading-snug text-(--giz-suave)">
          <input
            type="checkbox"
            checked={values.consent}
            onChange={(event) => update("consent", event.target.checked)}
            aria-invalid={Boolean(errors.consent)}
            aria-describedby={errors.consent ? `${id}-consent-error` : undefined}
            className="mt-0.5 size-6 shrink-0 cursor-pointer accent-[#c5f920] outline-none focus-visible:ring-2 focus-visible:ring-(--lima)"
          />
          <span>Aceito receber informações sobre o beta do Escalou por WhatsApp e e-mail.</span>
        </label>
        {errors.consent ? (
          <p id={`${id}-consent-error`} className="mt-2 text-sm font-semibold text-(--lima)">
            {errors.consent}
          </p>
        ) : null}
      </div>

      {submitError ? (
        <p role="alert" className="text-base font-semibold text-(--lima)">
          {submitError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "loading"}
        aria-busy={status === "loading" || undefined}
        className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#e4ff66] to-[#a6e40c] relative overflow-hidden px-6 text-lg font-bold text-primary-foreground shadow-[0_10px_34px_rgb(197_249_32/0.35)] outline-none transition before:absolute before:inset-y-0 before:-left-1/2 before:w-1/3 before:-skew-x-20 before:bg-white/60 before:blur-sm before:transition-transform before:duration-700 hover:-translate-y-0.5 hover:brightness-110 hover:before:translate-x-[480%] active:translate-y-0 motion-reduce:before:hidden focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-(--gramado) disabled:cursor-wait disabled:opacity-75"
      >
        <span>
          <LoadingContent loading={status === "loading"} loadingText="Entrando…">Entrar na lista de espera</LoadingContent>
        </span>
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
      <label htmlFor={id} className="text-sm font-semibold text-(--giz-suave)">
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
        className="mt-1 min-h-12 w-full rounded-none border-0 border-b-2 border-(--giz-linha) bg-transparent text-xl text-(--giz) outline-none transition-colors placeholder:text-(--giz-suave)/60 focus:border-(--lima) aria-invalid:border-(--lima)"
      />
      {error ? (
        <p id={`${id}-error`} className="mt-2 text-sm font-semibold text-(--lima)">
          {error}
        </p>
      ) : null}
    </div>
  );
}
