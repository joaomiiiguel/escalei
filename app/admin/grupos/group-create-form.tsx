import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/ui/input";

type CreateAction = (formData: FormData) => void | Promise<void>;

export function GroupCreateForm({ action }: { action: CreateAction }) {
  return <form action={action} className="grid grid-cols-[1fr_72px_92px_auto] gap-3 rounded-lg border border-[#d8e2da] bg-white p-4">
    <Input name="nome" required minLength={3} maxLength={40} placeholder="Nome do grupo" className="h-10 border-[#d8e2da] bg-white text-[#102117]" />
    <Input name="icone" defaultValue="⚽" required maxLength={8} aria-label="Ícone do grupo" className="h-10 border-[#d8e2da] bg-white text-center text-[#102117]" />
    <Input name="temporada" type="number" min="2024" max="2100" defaultValue="2026" required aria-label="Temporada" className="h-10 border-[#d8e2da] bg-white text-[#102117]" />
    <Button type="submit" className="h-10 bg-[#065f46] text-white hover:bg-[#047857]">Criar grupo</Button>
  </form>;
}
