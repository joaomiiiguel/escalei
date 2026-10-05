"use client";

import { useState } from "react";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/ui/input";

type Action = (formData: FormData) => void | Promise<void>;

export function EmailSignIn({ createAccount, error, success, signIn, signUp, signInWithGoogle }: { createAccount: boolean; error?: string; success?: string; signIn: Action; signUp: Action; signInWithGoogle: Action }) {
  const [creating, setCreating] = useState(createAccount);
  const message = error === "credenciais" ? "E-mail ou senha incorretos." : error === "cadastro" ? "Não foi possível criar a conta. Tente outro e-mail." : error === "google" ? "Não foi possível entrar com o Google. Tente novamente." : error === "campos" ? "Use um e-mail válido e uma senha de pelo menos 8 caracteres." : null;

  return <main className="mx-auto grid min-h-dvh max-w-[490px] content-between bg-[#0f1710] px-5 py-10 text-[#f3f5f4]">
    <section className="grid gap-5 pt-12"><p className="text-3xl font-black tracking-tight">◉ escalei</p><div className="grid gap-2"><h1 className="text-3xl font-extrabold">{creating ? "Crie sua conta" : "Entre na sua conta"}</h1><p className="text-sm leading-6 text-[#a0a8af]">{creating ? "Cadastre-se para montar seu time e acompanhar cada rodada." : "Use seu e-mail e senha para continuar."}</p></div></section>
    <div className="grid gap-4">
      {message && <p role="alert" className="text-sm text-[#ffc3c3]">{message}</p>}
      {success === "confirmacao" && <p role="status" className="text-sm text-[#a6f2ba]">Confira seu e-mail para confirmar a conta antes de entrar.</p>}
      <form action={creating ? signUp : signIn} className="grid gap-4">
        <label className="grid gap-2 text-sm font-bold text-[#a0a8af]"><span>E-mail</span><Input name="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" required autoFocus className="h-14 rounded-[14px] border-[#2fe06b]/50 bg-[#29332c] px-4 text-[#f3f5f4] placeholder:text-[#a0a8af]" /></label>
        <label className="grid gap-2 text-sm font-bold text-[#a0a8af]"><span>Senha</span><Input name="senha" type="password" autoComplete={creating ? "new-password" : "current-password"} minLength={8} required className="h-14 rounded-[14px] border-[#2fe06b]/50 bg-[#29332c] px-4 text-[#f3f5f4]" /></label>
        {creating && <label className="grid gap-2 text-sm font-bold text-[#a0a8af]"><span>Confirmar senha</span><Input name="confirmar_senha" type="password" autoComplete="new-password" minLength={8} required className="h-14 rounded-[14px] border-[#2fe06b]/50 bg-[#29332c] px-4 text-[#f3f5f4]" /></label>}
        <Button type="submit" className="h-[52px] rounded-[14px] bg-[#2fe06b] font-bold text-[#06200f] hover:bg-[#49ef7c]">{creating ? "Criar conta" : "Entrar"}</Button>
      </form>
      <div className="grid gap-3 text-center"><span className="text-xs text-[#6d7d76]">ou</span><form action={signInWithGoogle}><Button type="submit" variant="outline" className="h-[52px] w-full rounded-[14px] border-[#526359] bg-transparent text-[#f3f5f4] hover:bg-[#29332c]">Continuar com Google</Button></form><button type="button" onClick={() => setCreating((value) => !value)} className="text-sm text-[#a0a8af] underline underline-offset-4">{creating ? "Já tenho uma conta" : "Ainda não tenho conta"}</button></div>
    </div>
  </main>;
}
