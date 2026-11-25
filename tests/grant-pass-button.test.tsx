import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const grantPasses = vi.fn();

vi.mock("lucide-react", () => ({ Loader2: () => null, Plus: () => null }));

vi.mock("@/app/admin/actions", () => ({ grantPasses: (...args: unknown[]) => grantPasses(...args) }));

import { GrantPassButton } from "@/app/admin/participantes/grant-pass-button";

describe("botão de adicionar passe no painel", () => {
  afterEach(() => { cleanup(); grantPasses.mockReset(); });

  it("concede 1 passe e mostra o novo total", async () => {
    grantPasses.mockResolvedValue({ ok: true, available: 3 });
    render(<GrantPassButton userId="u1" nickname="Ana" initialAvailable={2} />);
    expect(screen.getByText("2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Adicionar 1 passe para Ana" }));
    await waitFor(() => expect(screen.getByText("3")).toBeInTheDocument());
    expect(grantPasses).toHaveBeenCalledWith("u1", 1);
  });

  it("mantém o total e avisa quando falha", async () => {
    grantPasses.mockResolvedValue({ ok: false, error: "Participante não encontrado." });
    render(<GrantPassButton userId="u1" nickname="Ana" initialAvailable={2} />);
    fireEvent.click(screen.getByRole("button", { name: "Adicionar 1 passe para Ana" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Participante não encontrado.");
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("mostra traço quando a contagem não pôde ser lida", () => {
    render(<GrantPassButton userId="u1" nickname="Ana" initialAvailable={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
