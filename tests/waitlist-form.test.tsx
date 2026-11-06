import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WaitlistForm } from "@/app/_landing/waitlist-form";

const joinWaitlist = vi.fn();
vi.mock("@/app/actions", () => ({ joinWaitlist: (...args: unknown[]) => joinWaitlist(...args) }));
vi.mock("lucide-react", () => {
  const icons = ["ArrowRight", "Check", "Info", "Loader2", "Lock", "MessageCircle", "Plus", "Whistle"];
  return Object.fromEntries(icons.map((icon) => [icon, () => null]));
});

describe("formulário da lista de espera", () => {
  beforeEach(() => joinWaitlist.mockReset());

  function fill() {
    fireEvent.change(screen.getByLabelText("Nome ou apelido"), { target: { value: "Ana Souza" } });
    fireEvent.change(screen.getByLabelText("WhatsApp com DDD"), { target: { value: "(11) 98765-4321" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "ana@exemplo.com" } });
    fireEvent.click(screen.getByRole("checkbox"));
  }

  it("liga cada erro ao seu campo e não envia dados inválidos", () => {
    render(<WaitlistForm />);

    fireEvent.click(screen.getByRole("button", { name: "Entrar na lista de espera" }));

    const name = screen.getByLabelText("Nome ou apelido");
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(document.getElementById(name.getAttribute("aria-describedby") ?? "")).toHaveTextContent("Informe seu nome ou apelido.");
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-invalid", "true");
    expect(joinWaitlist).not.toHaveBeenCalled();
  });

  it("mostra a confirmação depois de entrar na lista", async () => {
    joinWaitlist.mockResolvedValue({ ok: true });
    render(<WaitlistForm />);

    fill();
    fireEvent.click(screen.getByRole("button", { name: "Entrar na lista de espera" }));

    expect(await screen.findByRole("heading", { name: "Você está na lista!" })).toBeInTheDocument();
  });

  it("envia o utm_source do link junto com o cadastro", async () => {
    joinWaitlist.mockResolvedValue({ ok: true });
    window.history.pushState({}, "", "/?utm_source=instagram&utm_medium=bio#lista-de-espera");
    render(<WaitlistForm />);

    fill();
    fireEvent.click(screen.getByRole("button", { name: "Entrar na lista de espera" }));

    await screen.findByRole("heading", { name: "Você está na lista!" });
    expect(joinWaitlist).toHaveBeenCalledWith(expect.objectContaining({ email: "ana@exemplo.com", source: "instagram" }));
    window.history.pushState({}, "", "/");
  });

  it("explica a falha do servidor e mantém o formulário", async () => {
    joinWaitlist.mockResolvedValue({ ok: false, message: "Não foi possível entrar na lista agora." });
    render(<WaitlistForm />);

    fill();
    fireEvent.click(screen.getByRole("button", { name: "Entrar na lista de espera" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível entrar na lista agora."));
    expect(screen.getByLabelText("Nome ou apelido")).toHaveValue("Ana Souza");
  });
});
