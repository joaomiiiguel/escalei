import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { createGroup } from "../../actions";
import { requireAdmin } from "@/lib/admin-access";

export default async function NewAdminGroup({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  await requireAdmin();
  const { erro } = await searchParams;

  return <section className="w-full max-w-5xl">
    <Link href="/admin/grupos" className="inline-flex items-center gap-2 rounded text-sm font-bold text-muted-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><ArrowLeft className="size-4" />Voltar para grupos</Link>
    <form id="create-group" action={createGroup} className="contents">
      <header className="mt-5 flex flex-wrap items-start justify-between gap-4 border-b border-neutral-800 pb-5">
        <div><p className="text-sm font-bold tracking-wide text-muted-foreground">GRUPO</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight">Criar novo grupo</h1><p className="mt-1 text-sm text-muted-foreground">Defina o nome do grupo para criar o convite e adicionar participantes.</p></div>
        <SubmitButton loadingText="Salvando…" className="h-10">Salvar grupo</SubmitButton>
      </header>

      {erro === "grupo" && <p role="alert" className="mt-5 rounded-lg border border-destructive bg-destructive/20 p-3 text-sm font-semibold text-destructive-foreground">Não foi possível criar o grupo. Revise o nome e tente novamente.</p>}

      <section className="mt-6 max-w-xl rounded-lg border border-neutral-800 bg-neutral-900 p-5 shadow-sm">
        <h2 className="text-lg font-extrabold">Dados do grupo</h2>
        <div className="mt-4">
          <label className="grid gap-1.5 text-sm font-bold">Nome do grupo
            <Input name="nome" required minLength={3} maxLength={40} autoFocus placeholder="Ex.: Resenha da Firma" className="h-10 border-neutral-700 bg-neutral-950" />
          </label>
        </div>
      </section>
    </form>
  </section>;
}
