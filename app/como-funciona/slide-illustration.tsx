import { CircleDollarSign, Trophy, UsersRound } from "lucide-react";
import Image from "next/image";

const slideIcons = [CircleDollarSign, Trophy, UsersRound];
const slideImages = ["/image.png", "/image-1.png", "/image-2.png"];
const slideTitles = ["Monte seu time", "Acompanhe cada rodada", "Dispute com a galera"];

export function SlideIllustration({ slide }: { slide: number }) {
  const Icon = slideIcons[slide];

  return (
    <div className="relative grid h-[55vh] min-h-[260px] w-full place-items-center overflow-hidden border-b border-[#2fe06b66] bg-[radial-gradient(circle_at_50%_24%,#2a6134_0%,#16291a_43%,#0f1710_78%)]">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-zinc-900 h-[55vh]">
        <Image src={slideImages[slide]} alt={slideTitles[slide]} fill className="object-cover" priority />
      </div>
      <div className="relative grid size-28 place-items-center rounded-full border border-[#b6ffca66] bg-[#102c18] shadow-[0_0_70px_18px_#2fe06b26]">
        <Icon aria-hidden="true" className="size-14 text-primary" strokeWidth={1.5} />
      </div>
    </div>
  );
}
