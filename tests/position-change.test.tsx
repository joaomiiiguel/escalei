import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PositionChangeIndicator } from "@/app/ligas/[id]/position-change";

vi.mock("lucide-react", () => ({ ChevronUp: () => null, ChevronDown: () => null, Minus: () => null }));

describe("PositionChangeIndicator", () => {
  afterEach(cleanup);

  it("descreve a subida para leitores de tela e mostra as posições", () => {
    const { container } = render(<PositionChangeIndicator change={{ direction: "up", places: 2 }} />);
    expect(screen.getByText("Subiu 2 posições em relação à rodada anterior").className).toContain("sr-only");
    expect(container.textContent).toContain("2");
    expect(container.firstElementChild?.className).toContain("text-success");
  });

  it("descreve a descida de uma posição no singular", () => {
    render(<PositionChangeIndicator change={{ direction: "down", places: 1 }} />);
    expect(screen.getByText("Desceu 1 posição em relação à rodada anterior")).toBeTruthy();
  });

  it("indica posição mantida e não mostra nada sem comparação", () => {
    render(<PositionChangeIndicator change={{ direction: "same", places: 0 }} />);
    expect(screen.getByText("Manteve a posição da rodada anterior")).toBeTruthy();
    cleanup();
    const { container } = render(<PositionChangeIndicator change={null} />);
    expect(container.textContent).toBe("");
  });
});
