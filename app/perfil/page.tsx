import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { deleteAccount, updatePreferences } from "./actions";

export default async function Profile({ searchParams }: { searchParams: Promise<{ atualizado?: string; erro?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: profile } = await supabase
    .from("perfis")
    .select("apelido, tema, notificacoes_email, termos_aceitos_em")
    .eq("id", user.id)
    .maybeSingle();
  const params = await searchParams;

  return <main>
    <h1>Perfil</h1>
    <p>{profile?.apelido ?? "Perfil pendente"}</p>
    <p>Termos aceitos: {profile?.termos_aceitos_em ? "sim" : "pendente"}</p>
    {params.atualizado && <p>Preferências salvas.</p>}
    {params.erro && <p>Não foi possível concluir a operação. Revise os dados e tente novamente.</p>}

    <section>
      <h2>Preferências</h2>
      <form action={updatePreferences}>
        <label>
          Tema
          <select name="tema" defaultValue={profile?.tema ?? "escuro"}>
            <option value="escuro">Escuro</option>
            <option value="claro">Claro</option>
          </select>
        </label>
        <label>
          <input name="notificacoes_email" type="checkbox" defaultChecked={profile?.notificacoes_email ?? true} />
          Receber notificações por e-mail
        </label>
        <button type="submit">Salvar preferências</button>
      </form>
    </section>

    <section>
      <h2>Excluir conta</h2>
      <p>Esta ação remove permanentemente seu perfil, seus times e seu acesso.</p>
      <form action={deleteAccount}>
        <label>
          Digite EXCLUIR para confirmar
          <input name="confirmacao" required autoComplete="off" />
        </label>
        <button type="submit">Excluir minha conta</button>
      </form>
    </section>
  </main>;
}
