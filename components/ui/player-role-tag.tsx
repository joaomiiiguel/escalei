import { playerRoleLabel, type PlayerRole } from "@/lib/player-role";

const tones: Record<PlayerRole, string> = {
  TITULAR: "bg-primary/15 text-primary",
  RESERVA: "bg-muted text-foreground",
};

export function PlayerRoleTag({ role }: { role?: PlayerRole | null }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${role ? tones[role] : "border border-border text-muted-foreground"}`}>{playerRoleLabel(role)}</span>;
}
