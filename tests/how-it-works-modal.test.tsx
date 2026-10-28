import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { HowItWorksModal } from "@/components/ui/how-it-works-modal";
import { SCORING_NOTES, SCORING_TABLE } from "@/lib/scoring-table";

afterEach(cleanup);

describe("modal Como funciona", () => {
  it("lista todos os scouts com os pontos e as regras do cálculo", () => {
    render(<HowItWorksModal />);
    fireEvent.click(screen.getByRole("button", { name: "Como funciona" }));
    const dialog = screen.getByRole("dialog", { name: "Como funciona" });

    for (const { label } of SCORING_TABLE) expect(within(dialog).getByText(label)).toBeTruthy();
    expect(within(dialog).getByText("Pênalti sofrido").nextSibling?.textContent).toBe("+1,0");
    expect(within(dialog).getByText("Pênalti cometido").nextSibling?.textContent).toBe("−1,0");
    for (const note of SCORING_NOTES) expect(within(dialog).getByText(note)).toBeTruthy();
    expect(within(dialog).getByText(/fecha 1 hora antes do primeiro jogo/)).toBeTruthy();
  });
});
