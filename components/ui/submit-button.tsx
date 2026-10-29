"use client";

import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/shadcn/button";
import { LoadingContent } from "./loading-content";

type SubmitButtonProps = Omit<ComponentProps<typeof Button>, "type"> & {
  loadingText?: ReactNode;
};

/** Botão de envio que mostra carregamento enquanto a Server Action do formulário roda. */
export function SubmitButton({ loading, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return <Button type="submit" loading={pending || Boolean(loading)} {...props} />;
}

type NativeSubmitButtonProps = Omit<ComponentProps<"button">, "type"> & {
  loadingText?: ReactNode;
  contentClassName?: string;
};

/** Mesmo comportamento do SubmitButton para botões nativos que já têm estilo próprio. */
export function NativeSubmitButton({ children, className, contentClassName, disabled, loadingText, ...props }: NativeSubmitButtonProps) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={disabled || pending} aria-busy={pending || undefined} className={className} {...props}>
    <LoadingContent className={contentClassName} loading={pending} loadingText={loadingText}>{children}</LoadingContent>
  </button>;
}
