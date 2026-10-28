import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LegalDocumentPage, legalMetadata } from "@/components/ui/legal-document";
import { LEGAL_DOCUMENTS, PRIVACIDADE, REGULAMENTO, TERMOS, TERMOS_VERSAO } from "@/lib/legal";
import { FORMATIONS } from "@/lib/lineup-rules";

const allText = (document: (typeof LEGAL_DOCUMENTS)[number]) =>
  [document.resumo, ...document.secoes.flatMap((secao) => [secao.titulo, ...secao.paragrafos])].join(" ");

describe("documentos legais", () => {
  it("publica termos, privacidade e regulamento em rotas distintas", () => {
    expect(LEGAL_DOCUMENTS.map((document) => document.href)).toEqual(["/termos", "/privacidade", "/regulamento"]);
  });

  it("deixa claro que não há apostas nem prêmio em dinheiro", () => {
    expect(allText(TERMOS)).toMatch(/Não há apostas/);
    expect(allText(REGULAMENTO)).toMatch(/Não há prêmio em dinheiro/);
  });

  it("não promete gratuidade, que deixará de valer com os passes de rodada", () => {
    for (const document of LEGAL_DOCUMENTS) expect(allText(document)).not.toMatch(/gratuit/i);
  });

  it("regulamento usa as formações e o saldo inicial vigentes", () => {
    const text = allText(REGULAMENTO);
    for (const formation of Object.keys(FORMATIONS)) expect(text).toContain(formation);
    expect(text).toContain("C$ 60,00");
  });

  it("privacidade cita os direitos da LGPD e os operadores de dados", () => {
    const text = allText(PRIVACIDADE);
    expect(text).toMatch(/LGPD/);
    for (const operator of ["Supabase", "Google", "PostHog"]) expect(text).toContain(operator);
  });

  it("versão dos termos muda junto com o conteúdo", () => {
    expect(TERMOS_VERSAO).toBe("v2");
  });
});

describe("LegalDocumentPage", () => {
  it("renderiza título, seções e links para os outros documentos", () => {
    render(<LegalDocumentPage document={TERMOS} />);

    expect(screen.getByRole("heading", { level: 1, name: "Termos de uso" })).toBeTruthy();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(TERMOS.secoes.length);
    const nav = screen.getByRole("navigation", { name: "Outros documentos" });
    expect(nav.querySelector('a[href="/privacidade"]')).not.toBeNull();
    expect(nav.querySelector('a[href="/regulamento"]')).not.toBeNull();
    expect(nav.querySelector('a[href="/termos"]')).toBeNull();
  });

  it("gera metadados em português", () => {
    expect(legalMetadata(REGULAMENTO)).toEqual({ title: "Regulamento do teste | Escalou", description: REGULAMENTO.descricao });
  });
});
