// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLeagueMembershipStatus } from "@/lib/league-access";

const getOpenLeague = vi.fn();
const joinOpenLeague = vi.fn();
const getActiveInvite = vi.fn();
const signOut = vi.fn();
let profile: { id: string } | null = null;

vi.mock("@/lib/open-league", () => ({ getOpenLeague: () => getOpenLeague(), joinOpenLeague: (id: string) => joinOpenLeague(id) }));
vi.mock("@/lib/invites", () => ({
  isInviteToken: () => true,
  getActiveInvite: (token: string) => getActiveInvite(token),
  canUserJoinInvite: async () => true,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: profile, error: null }), update: () => query };
    return {
      auth: { exchangeCodeForSession: async () => ({ error: null }), getUser: async () => ({ data: { user: { id: "jogador", email: "j@exemplo.com" } } }), signOut },
      from: () => query,
    };
  },
}));

import { GET } from "@/app/api/auth/callback/route";

const INVITE = "11111111-1111-4111-8111-111111111111";

async function callback(cookie?: string) {
  const response = await GET(new Request("https://escalou.test/api/auth/callback?code=abc", { headers: cookie ? { cookie } : {} }));
  return new URL(response.headers.get("location")!).pathname + new URL(response.headers.get("location")!).search;
}

beforeEach(() => {
  profile = null;
  vi.mocked(getLeagueMembershipStatus).mockResolvedValue("NENHUMA");
  getOpenLeague.mockReset().mockResolvedValue({ id: "geral", dono_id: "admin" });
  joinOpenLeague.mockReset().mockResolvedValue(true);
  getActiveInvite.mockReset().mockResolvedValue(false);
  signOut.mockReset();
});

describe("cadastro aberto no callback de login", () => {
  it("manda quem é novo e veio sem convite para o onboarding", async () => {
    await expect(callback()).resolves.toBe("/onboarding");
    expect(signOut).not.toHaveBeenCalled();
  });

  it("coloca no grupo geral quem já tem perfil e está sem grupo ativo", async () => {
    profile = { id: "jogador" };
    vi.mocked(getLeagueMembershipStatus).mockResolvedValue("INATIVA");

    await expect(callback()).resolves.toBe("/inicio");
    expect(joinOpenLeague).toHaveBeenCalledWith("jogador");
  });

  it("sem grupo geral, continua exigindo convite", async () => {
    getOpenLeague.mockResolvedValue(null);

    await expect(callback()).resolves.toBe("/entrar?erro=sem_liga");
    expect(signOut).toHaveBeenCalled();
  });

  it("com convite válido, segue o fluxo do convite em vez do grupo geral", async () => {
    getActiveInvite.mockResolvedValue({ id: "resenha" });

    await expect(callback(`escalou_invite=${INVITE}`)).resolves.toBe(`/onboarding?convite=${INVITE}`);
    expect(getOpenLeague).not.toHaveBeenCalled();
  });
});
