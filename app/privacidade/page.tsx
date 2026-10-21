import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacidade | Escalou",
  description: "Política de privacidade do Escalou.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#050806] px-4 py-10 text-foreground sm:px-6">
      <article className="mx-auto max-w-3xl rounded-2xl border border-[#254232] bg-[#0b1410] p-6 sm:p-8">
        <Link className="text-sm font-extrabold text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring" href="/beta">
          Voltar para o beta
        </Link>
        <h1 className="mt-6 text-3xl font-black tracking-tight">Privacidade</h1>
        <div className="mt-6 grid gap-4 text-sm leading-6 text-[#a5bdae]">
          <p>Usamos os dados enviados na lista de espera para comunicar novidades do beta e possíveis convites de acesso.</p>
          <p>Os dados podem incluir nome ou apelido, WhatsApp e e-mail informados no formulário.</p>
          <p>Não vendemos dados pessoais e não usamos informações para ofertas relacionadas a apostas ou jogos de azar.</p>
          <p>Você pode solicitar remoção dos seus dados pelo canal oficial informado durante o beta.</p>
        </div>
      </article>
    </main>
  );
}
