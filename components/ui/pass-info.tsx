import { passNotice, type PassStatus } from "@/lib/round-pass";

type PassInfoProps = { status: PassStatus; hasSavedTeam: boolean };

/** Como o passe é usado nesta rodada, junto à ação de salvar ou editar. */
export function PassInfo({ status, hasSavedTeam }: PassInfoProps) {
  const notice = passNotice(status, hasSavedTeam);
  const isWarning = notice.tone === "warning";

  return <p className={`rounded-xl px-3 py-2 text-[11px] leading-4 ${isWarning ? "border border-warning/30 bg-warning/10 text-warning" : "bg-primary/15 text-primary"}`}>{notice.text}</p>;
}
