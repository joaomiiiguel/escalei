import { readFileSync } from "node:fs";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LineupFormation, type LineupPlayer } from "@/components/ui/lineup-formation";
import { SavedLineup } from "@/components/ui/saved-lineup";
import { availabilityText, isUnavailable, parseAvailability } from "@/lib/player-availability";

const player = (id: number, position: LineupPlayer["position"], extra: Partial<LineupPlayer> = {}): LineupPlayer => ({
  id, name: `Jogador ${id}`, position, price: 5, club: "CLA", clubName: "Clube A", logoUrl: null, ...extra,
});

const team = (overrides: Record<number, Partial<LineupPlayer>> = {}) => [
  player(1, "GOL"), player(2, "DEF"), player(3, "DEF"), player(4, "DEF"), player(5, "DEF"),
  player(6, "MEI"), player(7, "MEI"), player(8, "MEI"), player(9, "ATA"), player(10, "ATA"), player(11, "ATA"),
].map((item) => ({ ...item, ...overrides[item.id] }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("status do jogador", () => {
  it("só lesionado e suspenso ficam indisponíveis", () => {
    expect(isUnavailable("LESIONADO")).toBe(true);
    expect(isUnavailable("SUSPENSO")).toBe(true);
    expect(isUnavailable("DUVIDA")).toBe(false);
    expect(isUnavailable("PROVAVEL")).toBe(false);
    expect(isUnavailable(undefined)).toBe(false);
  });

  it("valores desconhecidos viram Provável e o texto junta o motivo", () => {
    expect(parseAvailability("MACHUCADO")).toBe("PROVAVEL");
    expect(parseAvailability(null)).toBe("PROVAVEL");
    expect(availabilityText("SUSPENSO", "Expulso")).toBe("Suspenso · Expulso");
    expect(availabilityText("DUVIDA", null)).toBe("Dúvida");
    expect(availabilityText("PROVAVEL", "qualquer")).toBeNull();
  });
});

describe("mercado", () => {
  it("mostra o status e não deixa escalar lesionado ou suspenso", async () => {
    const players = [
      player(21, "ATA", { status: "LESIONADO", statusReason: "Lesão muscular" }),
      player(22, "ATA", { status: "SUSPENSO", statusReason: "Expulso" }),
      player(23, "ATA", { status: "DUVIDA", statusReason: "Inativo" }),
      player(24, "ATA", { status: "PROVAVEL" }),
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ players }) }));
    render(<LineupFormation formation="4-3-3" />);
    await act(async () => { fireEvent.click(screen.getAllByRole("button", { name: /ATA/ })[0]); });

    const dialog = await screen.findByRole("dialog", { name: "Mercado" });
    const row = (name: string) => within(dialog).getByText(name).closest("button")!;
    expect((row("Jogador 21") as HTMLButtonElement).disabled).toBe(true);
    expect(row("Jogador 21").textContent).toContain("Lesionado · Lesão muscular");
    expect((row("Jogador 22") as HTMLButtonElement).disabled).toBe(true);
    expect(row("Jogador 22").textContent).toContain("Suspenso · Expulso");
    expect((row("Jogador 23") as HTMLButtonElement).disabled).toBe(false);
    expect(row("Jogador 23").textContent).toContain("Dúvida · Inativo");
    expect((row("Jogador 24") as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("tag de titular ou reserva", () => {
  it("mostra o papel no último jogo, sem competir com lesionado ou suspenso", async () => {
    const players = [
      player(31, "ATA", { lastGameRole: "TITULAR" }),
      player(32, "ATA", { lastGameRole: "RESERVA", status: "DUVIDA", statusReason: "Inativo" }),
      player(33, "ATA", { lastGameRole: null }),
      player(34, "ATA"),
      player(35, "ATA", { lastGameRole: "TITULAR", status: "LESIONADO", statusReason: "Lesão muscular" }),
      player(36, "ATA", { lastGameRole: "RESERVA", status: "SUSPENSO", statusReason: "Expulso" }),
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ players }) }));
    render(<LineupFormation formation="4-3-3" />);
    await act(async () => { fireEvent.click(screen.getAllByRole("button", { name: /ATA/ })[0]); });

    const dialog = await screen.findByRole("dialog", { name: "Mercado" });
    const row = (name: string) => within(dialog).getByText(name).closest("button")!.textContent;
    expect(row("Jogador 31")).toContain("Titular no último jogo");
    expect(row("Jogador 32")).toContain("Reserva no último jogo");
    expect(row("Jogador 32")).toContain("Dúvida · Inativo");
    expect(row("Jogador 33")).toContain("Sem dados do último jogo");
    expect(row("Jogador 34")).toContain("Sem dados do último jogo");
    for (const name of ["Jogador 35", "Jogador 36"]) {
      expect(row(name)).toContain("Não pode ser escalado");
      expect(row(name)).not.toContain("último jogo");
    }
  });
});

describe("ordem do mercado", () => {
  it("lista titulares, reservas, sem dados e indisponíveis, com o preço dentro de cada grupo", async () => {
    const players = [
      player(41, "ATA", { lastGameRole: "TITULAR", status: "SUSPENSO", price: 1 }),
      player(42, "ATA", { lastGameRole: null, price: 2 }),
      player(43, "ATA", { lastGameRole: "RESERVA", price: 3 }),
      player(44, "ATA", { lastGameRole: "TITULAR", price: 9 }),
      player(45, "ATA", { lastGameRole: "RESERVA", status: "LESIONADO", price: 4 }),
      player(46, "ATA", { lastGameRole: "TITULAR", status: "DUVIDA", price: 5 }),
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ players }) }));
    render(<LineupFormation budget={60} formation="4-3-3" />);
    await act(async () => { fireEvent.click(screen.getAllByRole("button", { name: /ATA/ })[0]); });

    const dialog = await screen.findByRole("dialog", { name: "Mercado" });
    const order = () => within(dialog).getAllByText(/^Jogador \d+$/).map((item) => item.textContent);
    expect(order()).toEqual(["Jogador 46", "Jogador 44", "Jogador 43", "Jogador 42", "Jogador 41", "Jogador 45"]);

    fireEvent.click(within(dialog).getByRole("button", { name: "Ordenar preço decrescente" }));
    expect(order()).toEqual(["Jogador 44", "Jogador 46", "Jogador 43", "Jogador 42", "Jogador 45", "Jogador 41"]);
  });
});

describe("time salvo", () => {
  it("avisa para trocar o jogador que ficou indisponível", () => {
    render(<SavedLineup budget={60} formation="4-3-3" players={team({ 9: { status: "LESIONADO", statusReason: "Lesão no joelho" } })} travaEm="2026-11-02T22:00:00Z" />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Troque até a trava");
    expect(alert.textContent).toContain("Jogador 9 (Lesionado · Lesão no joelho) não pode ser escalado.");
    expect(screen.getByRole("button", { name: "Jogador 9, ATA, Lesionado · Lesão no joelho" })).toBeTruthy();
  });

  it("não mostra aviso quando todos estão disponíveis", () => {
    render(<SavedLineup budget={60} formation="4-3-3" players={team({ 9: { status: "DUVIDA" } })} travaEm="2026-11-02T22:00:00Z" />);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("button", { name: "Jogador 9, ATA, Dúvida" })).toBeTruthy();
  });

  it("depois da trava vale o andamento do jogo, não o status", () => {
    render(<LineupFormation formation="4-3-3" initialPlayers={team({ 9: { status: "LESIONADO", roundStatus: "A_JOGAR" } })} readOnly showRoundStatus />);
    expect(screen.getByRole("button", { name: "Jogador 9, ATA" })).toBeTruthy();
  });
});

describe("escalação automática e mercado na API", () => {
  it("leem o status do jogador e a automática ignora indisponíveis", () => {
    const market = readFileSync("app/api/jogadores/route.ts", "utf8");
    expect(market).toMatch(/status, status_motivo/);
    const auto = readFileSync("app/api/escalacao-automatica/route.ts", "utf8");
    expect(auto).toMatch(/filter\(\(player\) => !isUnavailable\(parseAvailability\(player\.status\)\)\)/);
  });
});
