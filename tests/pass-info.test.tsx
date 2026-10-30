import "@testing-library/jest-dom/vitest";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { LineupSummary } from "@/components/ui/lineup-summary";
import { LineupTitle } from "@/app/escalar/lineup-title";
import { PassCount } from "@/components/ui/pass-count";
import { PassInfo } from "@/components/ui/pass-info";
import { PASS_REQUIRED_MESSAGE, passNotice, toPassStatus } from "@/lib/round-pass";

vi.mock("lucide-react", () => {
  const icon = (props: React.SVGProps<SVGSVGElement>) => React.createElement("svg", props);
  return { Check: icon, Loader2: icon, Ticket: icon, WandSparkles: icon, X: icon };
});

describe("toPassStatus", () => {
  it("monta a situação quando as duas RPCs responderam", () => {
    expect(toPassStatus(0, false)).toEqual({ available: 0, required: false });
    expect(toPassStatus(2, true)).toEqual({ available: 2, required: true });
  });

  it("não afirma nada se uma das RPCs falhou", () => {
    expect(toPassStatus(null, true)).toBeNull();
    expect(toPassStatus(2, null)).toBeNull();
    expect(toPassStatus(undefined, undefined)).toBeNull();
  });
});

describe("passNotice", () => {
  it("não fala em gastar passe quando a rodada não exige", () => {
    const notice = passNotice({ available: 2, required: false }, false);
    expect(notice).toEqual({ tone: "info", text: "Esta rodada não usa passe." });
  });

  it("explica que o passe só é usado na trava", () => {
    const notice = passNotice({ available: 2, required: true }, false);
    expect(notice.tone).toBe("info");
    expect(notice.text).toContain("usado só na trava");
  });

  it("indica rodada coberta para quem já salvou", () => {
    expect(passNotice({ available: 1, required: true }, true).text).toContain("Rodada coberta");
  });

  it("avisa quem está sem passe, mesmo com time salvo, porque salvar será recusado", () => {
    const warning = { tone: "warning", text: PASS_REQUIRED_MESSAGE };
    expect(passNotice({ available: 0, required: true }, false)).toEqual(warning);
    expect(passNotice({ available: 0, required: true }, true)).toEqual(warning);
  });
});

describe("PassCount", () => {
  afterEach(cleanup);

  it("mostra a quantidade, inclusive zero", () => {
    const { rerender } = render(<PassCount available={2} />);
    expect(screen.getByText("Passes: 2")).toBeInTheDocument();
    rerender(<PassCount available={0} />);
    expect(screen.getByText("Passes: 0")).toBeInTheDocument();
  });

  it("abre o modal ao clicar, com a explicação e a compra desabilitada", () => {
    render(<PassCount available={1} />);
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Passes: 1" }));

    const dialog = within(screen.getByRole("dialog", { name: "Passe de rodada" }));
    expect(dialog.getByText("1")).toBeInTheDocument();
    expect(dialog.getByText("passe disponível")).toBeInTheDocument();
    expect(dialog.getByText(/Só é usado na trava/)).toBeInTheDocument();
    expect(dialog.getByText("4,99", { exact: false })).toBeInTheDocument();
    expect(dialog.getByText("19,99", { exact: false })).toBeInTheDocument();
    expect(dialog.getByRole("button", { name: /Comprar passes/ })).toBeDisabled();
  });

  it("usa o plural quando o saldo é zero ou maior que um", () => {
    render(<PassCount available={0} />);
    fireEvent.click(screen.getByRole("button", { name: "Passes: 0" }));
    expect(screen.getByText("passes disponíveis")).toBeInTheDocument();
  });

  it("só diz que a rodada não usa passe quando ela está isenta", () => {
    const { rerender } = render(<PassCount available={2} />);
    fireEvent.click(screen.getByRole("button", { name: "Passes: 2" }));
    expect(screen.queryByText("Nesta rodada, escalar não usa passe.")).toBeNull();

    rerender(<PassCount available={2} exempt />);
    expect(screen.getByText("Nesta rodada, escalar não usa passe.")).toBeInTheDocument();
  });

  it("fecha pelo botão e pelo Esc, devolvendo o foco ao indicador", () => {
    render(<PassCount available={2} />);
    const trigger = screen.getByRole("button", { name: "Passes: 2" });

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveFocus();
  });
});

describe("LineupTitle", () => {
  afterEach(cleanup);

  it("mostra os passes ao lado do título, inclusive zero", () => {
    render(<LineupTitle passes={0} title="Meu time" />);
    expect(screen.getByRole("heading", { name: "Meu time" })).toBeInTheDocument();
    expect(screen.getByText("Passes: 0")).toBeInTheDocument();
  });

  it("mostra só o título se a consulta de passes falhar", () => {
    render(<LineupTitle passes={null} title="Meu time" />);
    expect(screen.getByRole("heading", { name: "Meu time" })).toBeInTheDocument();
    expect(screen.queryByText(/Passes:/)).toBeNull();
  });
});

describe("PassInfo", () => {
  afterEach(cleanup);

  it("mostra o aviso", () => {
    render(<PassInfo hasSavedTeam={false} status={{ available: 2, required: true }} />);
    expect(screen.getByText(/usado só na trava/)).toBeInTheDocument();
  });
});

describe("LineupSummary", () => {
  afterEach(cleanup);

  it("mostra a informação do passe junto ao botão de salvar", () => {
    render(<LineupSummary passStatus={{ available: 2, required: true }} selectedPlayers={11} />);
    expect(screen.getByText(/usado só na trava/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar time" })).toBeEnabled();
  });

  it("omite a informação quando a situação do passe é desconhecida", () => {
    render(<LineupSummary passStatus={null} selectedPlayers={11} />);
    expect(screen.queryByText(/passe/i)).toBeNull();
  });
});
