import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_ATUALIZADO_EM, LEGAL_DOCUMENTS, type LegalDocument } from "@/lib/legal";

export function legalMetadata(document: LegalDocument): Metadata {
  return { title: `${document.titulo} | Escalou`, description: document.descricao };
}

/** Página de texto legal: termos, privacidade e regulamento compartilham o mesmo layout. */
export function LegalDocumentPage({ document }: { document: LegalDocument }) {
  const others = LEGAL_DOCUMENTS.filter((item) => item.href !== document.href);

  return (
    <main className="min-h-screen bg-[#050806] px-4 py-10 text-foreground sm:px-6">
      <article className="mx-auto max-w-3xl rounded-2xl border border-[#254232] bg-[#0b1410] p-6 sm:p-8">
        <Link className="text-sm font-extrabold text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring" href="/">
          Voltar ao Escalou
        </Link>
        <h1 className="mt-6 text-3xl font-black tracking-tight">{document.titulo}</h1>
        <p className="mt-2 text-xs font-semibold text-[#6d7d76]">Atualizado em {LEGAL_ATUALIZADO_EM}</p>
        <p className="mt-5 text-base font-semibold leading-7 text-foreground">{document.resumo}</p>

        <div className="mt-8 grid gap-7">
          {document.secoes.map((secao) => (
            <section key={secao.titulo} className="grid gap-2">
              <h2 className="text-lg font-extrabold tracking-tight">{secao.titulo}</h2>
              {secao.paragrafos.map((paragrafo) => (
                <p key={paragrafo} className="text-sm leading-6 text-[#a5bdae]">{paragrafo}</p>
              ))}
            </section>
          ))}
        </div>

        <nav aria-label="Outros documentos" className="mt-10 flex flex-wrap gap-4 border-t border-[#254232] pt-6 text-sm font-extrabold text-primary">
          {others.map((item) => (
            <Link key={item.href} href={item.href} className="outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {item.titulo}
            </Link>
          ))}
        </nav>
      </article>
    </main>
  );
}
