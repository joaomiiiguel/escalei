import "@testing-library/jest-dom/vitest";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const push = vi.fn<(href: string) => Promise<void>>();
vi.mock("lucide-react", () => ({ Loader2: (props: React.SVGProps<SVGSVGElement>) => React.createElement("svg", props) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { RankingViewTabs } from "@/app/ligas/[id]/ranking-view-tabs";

afterEach(() => {
  cleanup();
  push.mockReset();
});

describe("abas de ranking", () => {
  it("marca a aba atual sem carregamento", () => {
    render(<RankingViewTabs leagueId="liga" active="rodada" />);
    expect(screen.getByRole("link", { name: "Rodada" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Campeonato" })).not.toHaveAttribute("aria-busy");
    expect(screen.queryByTestId("ranking-view-loading")).toBeNull();
  });

  it("mostra o carregamento na aba escolhida enquanto a nova tabela chega", async () => {
    push.mockReturnValue(new Promise(() => {}));
    render(<RankingViewTabs leagueId="liga" active="rodada" />);
    fireEvent.click(screen.getByRole("link", { name: "Campeonato" }));
    expect(push).toHaveBeenCalledWith("/ligas/liga?visao=campeonato");
    // `aria-busy` tira o link da árvore de acessibilidade consultada pelo Testing Library.
    const tab = (await screen.findByTestId("ranking-view-loading")).closest("a");
    expect(tab).toHaveAttribute("href", "/ligas/liga?visao=campeonato");
    expect(tab).toHaveTextContent("Campeonato, carregando");
    expect(tab).toHaveAttribute("aria-busy", "true");
    expect(tab).toHaveClass("bg-primary");
  });

  it("não navega ao tocar na aba já aberta", () => {
    render(<RankingViewTabs leagueId="liga" active="campeonato" />);
    fireEvent.click(screen.getByRole("link", { name: "Campeonato" }));
    expect(push).not.toHaveBeenCalled();
  });
});
