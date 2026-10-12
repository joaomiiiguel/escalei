import { Button } from "@/components/shadcn/button";

type Action = (formData: FormData) => void | Promise<void>;

export function GoogleSignIn({ error, inviteToken, signInWithGoogle }: { error?: string; inviteToken: string; signInWithGoogle: Action }) {
  const message = error === "google" ? "Não foi possível entrar com o Google. Tente novamente." : error === "sem_liga" ? "Sua conta não está vinculada a nenhum grupo ativo. Peça um convite para participar." : null;

  return <main className="mx-auto grid min-h-dvh max-w-[490px] content-between bg-background px-5 py-10 text-foreground">
    <section className="grid gap-5 pt-12"><p className="text-3xl font-black tracking-tight">◉ escalei</p><div className="grid gap-2"><h1 className="text-3xl font-extrabold">Entre na sua conta</h1><p className="text-sm leading-6 text-muted-foreground">Continue com sua conta Google para jogar.</p></div></section>
    <div className="grid gap-4">
      {message && <p role="alert" className="text-sm text-destructive-foreground">{message}</p>}
      <div className="grid gap-3 text-center mb-10">
        <form action={signInWithGoogle}>
          <input type="hidden" name="convite" value={inviteToken} />
          <Button type="submit" variant="outline" className="h-[52px] w-full rounded-[14px] border-[#526359] bg-transparent text-foreground hover:bg-border">
            Continuar com Google
          </Button>
        </form>
      </div>
    </div>
  </main>;
}
