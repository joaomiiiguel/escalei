import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const setDemoMode = vi.fn();

vi.mock("lucide-react", () => ({ Presentation: () => null }));
vi.mock("@/app/admin/actions", () => ({ setDemoMode: (enabled: boolean) => setDemoMode(enabled) }));

import { DemoModeToggle } from "@/app/admin/demo-mode-toggle";

describe("opção de modo demonstração no admin", () => {
  afterEach(() => { cleanup(); setDemoMode.mockReset(); });

  it("mostra o estado salvo", () => {
    render(<DemoModeToggle initialEnabled={false} />);
    expect(screen.getByRole("switch", { name: "Modo demonstração" })).not.toBeChecked();
    expect(screen.getByText(/mostram a rodada real/)).toBeInTheDocument();
  });

  it("liga e salva a opção", async () => {
    setDemoMode.mockResolvedValue({ ok: true, enabled: true });
    render(<DemoModeToggle initialEnabled={false} />);
    fireEvent.click(screen.getByRole("switch", { name: "Modo demonstração" }));
    await waitFor(() => expect(setDemoMode).toHaveBeenCalledWith(true));
    expect(screen.getByRole("switch", { name: "Modo demonstração" })).toBeChecked();
  });

  it("volta ao estado anterior e avisa quando não salva", async () => {
    setDemoMode.mockResolvedValue({ ok: false, error: "Não foi possível salvar. Tente de novo." });
    render(<DemoModeToggle initialEnabled />);
    fireEvent.click(screen.getByRole("switch", { name: "Modo demonstração" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível salvar");
    expect(screen.getByRole("switch", { name: "Modo demonstração" })).toBeChecked();
  });
});
