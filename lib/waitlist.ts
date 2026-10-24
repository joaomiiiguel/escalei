export type WaitlistValues = { name: string; whatsapp: string; email: string; consent: boolean };
export type WaitlistErrors = Partial<Record<keyof WaitlistValues, string>>;
export type WaitlistEntry = { nome: string; whatsapp: string; email: string };

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

/** Validação compartilhada entre o formulário e a Server Action da lista de espera. */
export function validateWaitlist(values: WaitlistValues): WaitlistErrors {
  const errors: WaitlistErrors = {};
  const digits = onlyDigits(values.whatsapp);
  const name = values.name.trim();

  if (name.length < 2 || name.length > 60) errors.name = "Informe seu nome ou apelido.";
  if (digits.length < 10 || digits.length > 11) errors.whatsapp = "Informe um WhatsApp com DDD.";
  if (values.email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = "Informe um e-mail válido.";
  if (!values.consent) errors.consent = "Você precisa aceitar o contato sobre o beta.";

  return errors;
}

/** Normaliza os valores já validados para gravação. */
export function toWaitlistEntry(values: WaitlistValues): WaitlistEntry {
  return {
    nome: values.name.trim().replace(/\s+/g, " "),
    whatsapp: onlyDigits(values.whatsapp),
    email: values.email.trim().toLowerCase(),
  };
}
