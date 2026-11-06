import { SubmitButton } from "@/components/ui/submit-button";
import { Logo } from "@/components/ui/logo";
import { ShieldX } from "lucide-react";

type Action = (formData: FormData) => void | Promise<void>;

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989z" />
    </svg>
  );
}

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
          <SubmitButton variant="outline" loadingText="Entrando…" className="py-5 w-full rounded-lg border-primary bg-primary/20 text-primary hover:bg-border">
            <GoogleIcon /> Entrar com Google
          </SubmitButton>
        </form>
      </div>
    </div>
    {message && <div className="flex items-center gap-3 absolute bottom-10 w-4/5 p-4 bg-red-900 rounded-lg">
      <ShieldX className="size-6 shrink-0 text-white" aria-label="Erro" /><p role="alert" className="text-sm text-white">{message}</p></div>}
  </main>;
}
