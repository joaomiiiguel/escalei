"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/shadcn/button";

export function InviteLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const path = `/convite/${token}`;

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return <div className="flex min-w-0 items-center gap-2 rounded-md border border-[#d8e2da] bg-white p-2">
    <code className="min-w-0 flex-1 truncate text-xs text-[#637469]">{path}</code>
    <Button type="button" variant="outline" onClick={copyLink} className="h-8 border-[#d8e2da] px-2 text-[#065f46]">{copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}<span>{copied ? "Copiado" : "Copiar"}</span></Button>
  </div>;
}
