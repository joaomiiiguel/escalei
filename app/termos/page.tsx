import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termos | Escalei",
  description: "Termos de uso do Escalei.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#050806] px-4 py-10 text-foreground sm:px-6">
      <article className="mx-auto max-w-3xl rounded-2xl border border-[#254232] bg-[#0b1410] p-6 sm:p-8">
        <Link className="text-sm font-extrabold text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring" href="/beta">
          Voltar para o beta
        </Link>
        <h1 className="mt-6 text-3xl font-black tracking-tight">Termos de uso</h1>
        <div className="mt-6 grid gap-4 text-sm leading-6 text-[#a5bdae]">
          <p>O Escalei é um fantasy de futebol gratuito para disputar com amigos em ligas privadas.</p>
          <p>O beta fechado pode liberar convites aos poucos. O cadastro na lista de espera não garante acesso imediato.</p>
          <p>O produto não possui apostas, depósitos, odds, saques ou premiação em dinheiro.</p>
          <p>Ao usar o Escalei, você concorda em respeitar as regras da rodada, os demais participantes e as orientações do beta.</p>
        </div>
      </article>
    </main>
  );
}
