"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/shadcn/button";

export function InviteLink({ token, code, iconOnly = false }: { token: string; code?: string; iconOnly?: boolean }) {
  const [copied, setCopied] = useState(false);
  const path = code ? `/convite?codigo=${code}` : `/convite/${token}`;

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  const label = copied ? "Link copiado" : "Copiar link de convite";

  return <div className={iconOnly ? "flex" : "flex min-w-0 items-center gap-2 rounded-md p-2"}>
    <Button type="button" variant="outline" onClick={copyLink} aria-label={label} title={label} className={iconOnly ? "size-8 p-0" : "h-8 px-2"}>{copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}{iconOnly ? <span className="sr-only">{label}</span> : <span>{copied ? "Copiado" : "Copiar link"}</span>}</Button>
  </div>;
}
