
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CreateAction = (formData: FormData) => void | Promise<void>;

export function GroupCreateForm({ action }: { action: CreateAction }) {
  return <form action={action} className="flex flex-col gap-3 rounded-lg border border-foreground bg-white p-4 shadow">
    <div className="flex justify-between items-center">
      <h3 className="text-lg font-bold text-background">Criar novo grupo</h3>
    </div>
    <div className="flex gap-3">
      <Input name="nome" required minLength={3} maxLength={40} placeholder="Nome do grupo" className="h-10 border-foreground text-[#102117] w-3/4" />
      <Button type="submit" className="h-10 w-1/4 bg-secondary text-white">Novo Grupo</Button>
    </div>
  </form>;
}
