import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  notFound: vi.fn(),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

import React from "react";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: any) =>
    React.createElement("a", { href, ...rest }, children),
}));

// Mock lucide-react icons
const createIconMock = (name: string) => {
  return ({ ...props }: any) => null;
};

vi.mock("lucide-react", () => {
  const icons = [
    "ArrowLeft", "Users", "Clock3", "Check", "LockKeyhole", "Pencil", "Trophy",
    "CalendarDays", "ArrowDownUp", "Search", "TriangleAlert", "X",
    "Download", "Share", "SquarePlus", "CircleHelp", "ShieldCheck",
    "House", "Shirt", "UserRound"
  ];
  const mocked: Record<string, any> = {};
  for (const icon of icons) {
    mocked[icon] = createIconMock(icon);
  }
  return mocked;
});

// Mock Supabase clients
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "test-user-id" } }, error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      delete: vi.fn().mockResolvedValue({ data: null, error: null }),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      delete: vi.fn().mockResolvedValue({ data: null, error: null }),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
}));

vi.mock("@/lib/league-access", () => ({
  getLeagueMembershipStatus: vi.fn().mockResolvedValue("ATIVA"),
  hasActiveLeagueMembership: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/current-round", () => ({
  getCurrentRound: vi.fn().mockResolvedValue({ data: { id: 1, numero: 1, status: "ABERTA", trava_em: new Date(Date.now() + 86400000).toISOString(), fechada_em: null, simulada: false }, error: null }),
}));

vi.mock("@/lib/game-kickoff", () => ({
  displayedKickoff: vi.fn((game: any) => game.inicio_em),
}));

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";