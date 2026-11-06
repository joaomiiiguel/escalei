"use client";

import { useId, useState } from "react";
import { Check } from "lucide-react";
import { LoadingContent } from "@/components/ui/loading-content";
import { joinWaitlist, type WaitlistResult } from "@/app/actions";
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
    const source = new URLSearchParams(window.location.search).get("utm_source") ?? undefined;
    const result: WaitlistResult = await joinWaitlist({ ...values, source }).catch((): WaitlistResult => ({ ok: false, message: "Não foi possível entrar na lista agora. Tente novamente em instantes." }));
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
      <section role="status" aria-labelledby={`${id}-success-title`} className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-500">
        <Check className="size-10 text-primary motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-500 motion-safe:ease-[cubic-bezier(0.34,1.56,0.64,1)]" strokeWidth={3} aria-hidden="true" />
        <h3 id={`${id}-success-title`} className="mt-4 font-(family-name:--font-display) text-5xl font-black uppercase leading-[0.9] md:text-6xl">
          Você está na lista!
        </h3>
        <p className="mt-4 max-w-md text-lg leading-relaxed text-muted-foreground">
          Quando abrir vaga, a gente manda seu convite pro grupo oficial do Escalou no WhatsApp.
        </p>
        <a
          href="#como-funciona"
          className="mt-5 inline-flex min-h-11 items-center font-bold text-primary underline underline-offset-4 outline-none focus-visible:ring-[3px] focus-visible:ring-(--giz)"
        >
          Ver como funciona
        </a>
      </section>
    );
  }

  return (
    <form onSubmit={submit} noValidate aria-label="Entrar na lista de espera" className="grid gap-5">
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
        <label className="flex cursor-pointer items-start gap-3 text-[15px] leading-snug text-muted-foreground md:text-base">
          <input
            type="checkbox"
            checked={values.consent}
            onChange={(event) => update("consent", event.target.checked)}
            aria-invalid={Boolean(errors.consent)}
            aria-describedby={errors.consent ? `${id}-consent-error` : undefined}
            className="mt-0.5 size-6 shrink-0 cursor-pointer accent-[#c5f920] outline-none focus-visible:ring-[3px] focus-visible:ring-(--giz)"
          />
          <span>Aceito receber novidades do Escalou por WhatsApp e e-mail.</span>
        </label>
        {errors.consent ? (
          <p id={`${id}-consent-error`} className="mt-2 text-sm font-bold text-primary">
            {errors.consent}
          </p>
        ) : null}
      </div>

      {submitError ? (
        <p role="alert" className="text-base font-bold text-primary">
          {submitError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "loading"}
        aria-busy={status === "loading" || undefined}
        className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-[14px] bg-primary px-6 text-lg font-extrabold text-primary-foreground outline-none transition hover:bg-[#d6ff4d] hover:shadow-[0_0_0_4px_rgb(197_249_32/0.18),0_10px_30px_rgb(197_249_32/0.28)] focus-visible:ring-[3px] focus-visible:ring-(--giz) focus-visible:ring-offset-[3px] focus-visible:ring-offset-card disabled:cursor-wait disabled:opacity-75"
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
      <label htmlFor={id} className="text-sm font-bold text-(--giz)">
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
        className="mt-1.5 min-h-12 w-full rounded-xl border border-border bg-background px-3.5 text-[17px] text-(--giz) outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/30 aria-invalid:border-primary"
      />
      {error ? (
        <p id={`${id}-error`} className="mt-2 text-sm font-bold text-primary">
          {error}
        </p>
      ) : null}
    </div>
  );
}
