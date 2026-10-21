import { Button } from "@/components/shadcn/button";
import { Logo } from "@/components/ui/logo";
import GoogleIcon from '@mui/icons-material/Google';
import { ShieldX } from "lucide-react";

type Action = (formData: FormData) => void | Promise<void>;

export function GoogleSignIn({ error, inviteToken, signInWithGoogle }: { error?: string; inviteToken: string; signInWithGoogle: Action }) {
  const message = error === "google" ? "Não foi possível entrar com o Google. Tente novamente." : error === "convite_email" ? "Este e-mail não está autorizado para o grupo. Peça ao gestor para adicioná-lo." : error === "grupo_inativado" ? "Seu grupo foi inativado. Entre em contato com o suporte caso precise de ajuda." : error === "sem_liga" ? "Sua conta não está vinculada a nenhum grupo ativo. Peça um convite para participar." : null;

  return <main className="flex flex-col items-center justify-center min-h-dvh px-5 py-10 text-foreground">
    <section className="flex flex-col items-center gap-5 pb-24">
      <Logo size="xl" />
    </section>
    <div className="grid gap-3 w-2/3 max-w-[400px] text-center">
      <h1 className="text-2xl font-bold uppercase text-primary tracking-wider">Login</h1>
      <p className="text-xs text-white">Seu time está esperando. Bora escalar?</p>
      <div className="grid gap-3 text-center mb-10">
        <form action={signInWithGoogle}>
          <input type="hidden" name="convite" value={inviteToken} />
          <Button type="submit" variant="outline" className="py-5 w-full rounded-lg border-primary bg-primary/20 text-primary hover:bg-border">
            <GoogleIcon className="h-5" /> Entrar com Google
          </Button>
        </form>
      </div>
    </div>
    {message && <div className="flex items-center gap-3 absolute bottom-10 w-4/5 p-4 bg-red-900 rounded-lg">
      <ShieldX className="size-6 shrink-0 text-white" aria-label="Erro" /><p role="alert" className="text-sm text-white">{message}</p></div>}
  </main>;
}
