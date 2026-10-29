import { redirect } from "next/navigation";
import { getInviteTokenByCode } from "@/lib/invites";
import { NativeSubmitButton } from "@/components/ui/submit-button";
import { useInviteCode } from "./actions";

export default async function InviteCodePage({ searchParams }: { searchParams: Promise<{ codigo?: string; erro?: string }> }) {
  const params = await searchParams;
  if (params.codigo) {
    const token = await getInviteTokenByCode(params.codigo.toUpperCase());
    if (token) redirect(`/convite/${token}`);
  }
  return <main className="mx-auto grid min-h-dvh max-w-[490px] content-center gap-6 bg-background px-5 text-center text-foreground"><div><p className="text-xs font-extrabold tracking-[1.2px] text-primary">CONVITE DE GRUPO</p><h1 className="mt-2 text-3xl font-extrabold">Use seu código</h1><p className="mt-2 text-sm text-muted-foreground">Digite o código de oito caracteres enviado pelo gestor.</p></div>{params.erro && <p role="alert" className="text-sm text-destructive-foreground">Código inválido ou convite indisponível.</p>}<form action={useInviteCode} className="grid gap-3"><input name="codigo" required minLength={8} maxLength={8} autoCapitalize="characters" className="h-14 rounded-xl border border-border bg-card px-4 text-center font-mono text-xl font-bold tracking-[0.2em] outline-none focus:ring-2 focus:ring-ring" placeholder="ABCD2345" /><NativeSubmitButton loadingText="Verificando…" className="h-12 rounded-xl bg-primary font-bold text-primary-foreground disabled:opacity-75">Continuar</NativeSubmitButton></form></main>;
}
