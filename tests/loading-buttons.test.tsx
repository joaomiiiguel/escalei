import "@testing-library/jest-dom/vitest";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Button } from "@/components/shadcn/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { GoogleSignIn } from "@/app/entrar/email-sign-in";
import { LineupBuilder } from "@/components/ui/lineup-builder";
import { LineupSummary } from "@/components/ui/lineup-summary";
import type { LineupPlayer } from "@/components/ui/lineup-formation";

vi.mock("lucide-react", () => {
  const icon = (props: React.SVGProps<SVGSVGElement>) => React.createElement("svg", props);
  return { Loader2: icon, WandSparkles: icon, ShieldX: icon };
});
vi.mock("@mui/icons-material/Google", () => ({ default: () => null }));
vi.mock("@/app/escalar/actions", () => ({ saveLineup: vi.fn() }));
vi.mock("@/components/ui/lineup-formation", () => ({ LineupFormation: () => null }));

import { saveLineup } from "@/app/escalar/actions";

/** Promessa controlada pelo teste para manter a ação "rodando". */
function deferred<T = void>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

const players: LineupPlayer[] = Array.from({ length: 11 }, (_, index) => ({ id: index + 1, price: 5 }) as LineupPlayer);

describe("Button com loading", () => {
  afterEach(cleanup);

  it("não altera o botão quando loading não é usado", () => {
    render(<Button>Salvar</Button>);
    const button = screen.getByRole("button", { name: "Salvar" });
    expect(button).not.toHaveAttribute("aria-busy");
    expect(button).not.toBeDisabled();
    expect(screen.queryByTestId("loading-spinner")).toBeNull();
  });

  it("desabilita, marca aria-busy e mostra o texto de carregamento", () => {
    render(<Button loading loadingText="Salvando…">Salvar</Button>);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveTextContent("Salvando…");
    expect(screen.getByTestId("loading-spinner")).toHaveClass("animate-spin");
  });

  it("mantém o conteúdo original invisível na mesma célula para a largura não mudar", () => {
    render(<Button loading loadingText="Salvando…">Salvar escalação</Button>);
    const original = screen.getByText("Salvar escalação");
    expect(original).toHaveClass("invisible", "col-start-1", "row-start-1");
    expect(screen.getByText("Salvando…").closest("span")).toHaveClass("col-start-1", "row-start-1");
  });
});

describe("SubmitButton", () => {
  afterEach(cleanup);

  it("fica em carregamento enquanto a Server Action do formulário roda", async () => {
    const pending = deferred();
    const action = vi.fn(() => pending.promise);
    render(<form action={action}><SubmitButton loadingText="Enviando…">Enviar</SubmitButton></form>);

    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    await waitFor(() => expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true"));
    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByRole("button")).toHaveTextContent("Enviando…");
    expect(action).toHaveBeenCalledTimes(1);

    await act(async () => pending.resolve());
    await waitFor(() => expect(screen.getByRole("button", { name: "Enviar" })).not.toBeDisabled());
    expect(screen.queryByTestId("loading-spinner")).toBeNull();
  });
});

describe("login com Google", () => {
  afterEach(cleanup);

  it("mostra \"Entrando…\" e bloqueia novo clique até o redirecionamento", async () => {
    const pending = deferred();
    const signIn = vi.fn(() => pending.promise);
    render(<GoogleSignIn inviteToken="" signInWithGoogle={signIn} />);

    fireEvent.click(screen.getByRole("button", { name: /Entrar com Google/ }));
    await waitFor(() => expect(screen.getByRole("button")).toHaveTextContent("Entrando…"));
    expect(screen.getByRole("button")).toBeDisabled();
    fireEvent.click(screen.getByRole("button"));
    expect(signIn).toHaveBeenCalledTimes(1);

    await act(async () => pending.resolve());
  });
});

describe("salvar escalação", () => {
  afterEach(cleanup);

  it("mostra \"Salvando…\" e desabilita os botões enquanto o time é salvo", async () => {
    const pending = deferred<{ error?: string }>();
    vi.mocked(saveLineup).mockReturnValue(pending.promise as ReturnType<typeof saveLineup>);
    render(<LineupBuilder budget={100} initialPlayers={players} roundId={1} />);

    fireEvent.click(screen.getByRole("button", { name: "Salvar time" }));
    const saveButton = await screen.findByRole("button", { name: /Salvando…/ });
    expect(saveButton).toBeDisabled();
    expect(saveButton).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: /Escalação automática/ })).toBeDisabled();
    expect(saveLineup).toHaveBeenCalledTimes(1);

    await act(async () => pending.resolve({ error: "Rodada travada." }));
    expect(await screen.findByRole("status")).toHaveTextContent("Rodada travada.");
    expect(screen.getByRole("button", { name: "Salvar time" })).not.toHaveAttribute("aria-busy");
  });

  it("mostra \"Montando…\" durante a escalação automática", () => {
    render(<LineupSummary budget={10} selectedPlayers={3} isAutoSelecting onAutoSelect={() => {}} />);
    const autoButton = screen.getByRole("button", { name: /Montando…/ });
    expect(autoButton).toBeDisabled();
    expect(autoButton).toHaveAttribute("aria-busy", "true");
  });
});
