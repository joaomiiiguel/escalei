import { describe, expect, it } from "vitest";
import { availablePassesByUser } from "@/lib/admin-participants";

describe("availablePassesByUser", () => {
  it("soma os restantes dos lotes válidos de cada usuário", () => {
    const totals = availablePassesByUser([
      { usuario_id: "ana", restantes: 2, valido_ate_temporada: 2026 },
      { usuario_id: "ana", restantes: 5, valido_ate_temporada: 2027 },
      { usuario_id: "bia", restantes: 1, valido_ate_temporada: 2026 },
    ], 2026);

    expect(totals.get("ana")).toBe(7);
    expect(totals.get("bia")).toBe(1);
  });

  it("ignora lotes de temporadas passadas e lotes esgotados, como fn_passes_disponiveis", () => {
    const totals = availablePassesByUser([
      { usuario_id: "ana", restantes: 3, valido_ate_temporada: 2025 },
      { usuario_id: "ana", restantes: 0, valido_ate_temporada: 2026 },
    ], 2026);

    expect(totals.has("ana")).toBe(false);
  });
});
