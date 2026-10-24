import { describe, expect, it, vi } from "vitest";
import { getAdministratorIds, withoutAdministrators } from "@/lib/league-members";

describe("membros que disputam o grupo", () => {
  it("remove administradores da lista de membros", () => {
    const rows = [{ usuario_id: "admin" }, { usuario_id: "ana" }, { usuario_id: "bruno" }];
    expect(withoutAdministrators(rows, new Set(["admin"]))).toEqual([{ usuario_id: "ana" }, { usuario_id: "bruno" }]);
  });

  it("consulta administradores só entre os usuários informados", async () => {
    const inFilter = vi.fn().mockResolvedValue({ data: [{ usuario_id: "admin" }] });
    const select = vi.fn(() => ({ in: inFilter }));
    const admin = { from: vi.fn(() => ({ select })) } as never;
    await expect(getAdministratorIds(admin, ["admin", "ana"])).resolves.toEqual(new Set(["admin"]));
    expect(inFilter).toHaveBeenCalledWith("usuario_id", ["admin", "ana"]);
    await expect(getAdministratorIds(admin, [])).resolves.toEqual(new Set());
  });
});
