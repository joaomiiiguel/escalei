import { CircleDollarSign, Trophy, UsersRound } from "lucide-react";

const slideIcons = [CircleDollarSign, Trophy, UsersRound];

export function SlideIllustration({ slide }: { slide: number }) {
  const Icon = slideIcons[slide];

  return (
    <div className="relative grid h-[min(45vh,380px)] min-h-[260px] w-full place-items-center overflow-hidden border-b border-[#2fe06b66] bg-[radial-gradient(circle_at_50%_24%,#2a6134_0%,#16291a_43%,#0f1710_78%)]">
      <div aria-hidden="true" className="absolute size-60 rounded-full border border-[#2fe06b33]" />
      <div aria-hidden="true" className="absolute size-40 rounded-full border border-dashed border-[#2fe06b55]" />
      <div aria-hidden="true" className="absolute h-px w-full bg-[#2fe06b2e]" />
      <div aria-hidden="true" className="absolute h-full w-px bg-[#2fe06b2e]" />
      <div className="relative grid size-28 place-items-center rounded-full border border-[#b6ffca66] bg-[#102c18] shadow-[0_0_70px_18px_#2fe06b26]">
        <Icon aria-hidden="true" className="size-14 text-[#2fe06b]" strokeWidth={1.5} />
      </div>
    </div>
  );
}
