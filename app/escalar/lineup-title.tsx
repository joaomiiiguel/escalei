import { PassCount } from "@/components/ui/pass-count";
import { scoreboard } from "@/components/ui/scoreboard";

type LineupTitleProps = { title: string; passes: number | null | undefined; passExempt?: boolean };

/** `passes` é nulo só se a consulta falhar; zero também é exibido. */
export function LineupTitle({ title, passes, passExempt }: LineupTitleProps) {
  return <div className="flex items-center justify-between gap-3">
    <h1 className={`${scoreboard} text-[34px] uppercase leading-[0.85] text-giz`}>{title}</h1>
    {typeof passes === "number" && <PassCount available={passes} exempt={passExempt} />}
  </div>;
}
