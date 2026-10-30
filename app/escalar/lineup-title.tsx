import { PassCount } from "@/components/ui/pass-count";
import TitleSection from "@/components/ui/title-section";

type LineupTitleProps = { title: string; passes: number | null | undefined; passExempt?: boolean };

/** `passes` é nulo só se a consulta falhar; zero também é exibido. */
export function LineupTitle({ title, passes, passExempt }: LineupTitleProps) {
  return <div className="flex items-center justify-between gap-3">
    <TitleSection title={title} />
    {typeof passes === "number" && <PassCount available={passes} exempt={passExempt} />}
  </div>;
}
