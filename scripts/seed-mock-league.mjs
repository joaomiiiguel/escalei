import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const MOCK_ORIGIN = "mock-liga-2099";
const MOCK_LEAGUE_CODE = "MCKLGA29";
const MOCK_LEAGUE = { nome: "Resenha Mock da Rodada", icone: "🍺", temporada: 2099 };
const mockAccounts = [
  { email: "mock.marcosv10@escalei.test", apelido: "marcosv10" },
  { email: "mock.jupimenta@escalei.test", apelido: "jupimenta" },
  { email: "mock.cacaubola@escalei.test", apelido: "cacaubola" },
  { email: "mock.tonhozl@escalei.test", apelido: "tonhozl" },
  { email: "mock.prialmeida@escalei.test", apelido: "prialmeida" },
  { email: "mock.rafamock@escalei.test", apelido: "rafamock" },
  { email: "mock.reservaliga@escalei.test", apelido: "reservaliga", incluirNaLiga: false },
];

const { data: authPage, error: authError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1_000 });
if (authError) throw new Error(`Não foi possível consultar usuários de teste: ${authError.message}`);
const authUsersByEmail = new Map((authPage.users ?? []).flatMap((user) => user.email ? [[user.email, user]] : []));

const mockUsers = [];
for (const account of mockAccounts) {
  let authUser = authUsersByEmail.get(account.email);
  if (!authUser) {
    const { data, error } = await supabase.auth.admin.createUser({ email: account.email, email_confirm: true });
    if (error || !data.user) throw new Error(`Não foi possível criar ${account.apelido}: ${error?.message ?? "resposta vazia"}`);
    authUser = data.user;
  }
  mockUsers.push({ ...account, id: authUser.id });
}

const now = new Date().toISOString();
const { error: profilesError } = await supabase.from("perfis").upsert(mockUsers.map((account) => ({
  id: account.id,
  apelido: account.apelido,
  origem: MOCK_ORIGIN,
  termos_versao: MOCK_ORIGIN,
  termos_aceitos_em: now,
})), { onConflict: "id" });
if (profilesError) throw new Error(`Não foi possível gravar os perfis mockados: ${profilesError.message}`);

const { data: profiles, error: profilesReadError } = await supabase
  .from("perfis")
  .select("id, apelido, origem")
  .order("criado_em");
if (profilesReadError) throw new Error(`Não foi possível consultar perfis para a liga mockada: ${profilesReadError.message}`);

const realProfileIds = (profiles ?? []).filter((profile) => profile.origem !== MOCK_ORIGIN).map((profile) => profile.id);
const mockMemberIds = mockUsers.filter((account) => account.incluirNaLiga !== false).map((account) => account.id);
const memberIds = [...new Set([...realProfileIds, ...mockMemberIds])];
const ownerId = realProfileIds[0] ?? mockUsers[0]?.id;
if (!ownerId || memberIds.length < 2) throw new Error("São necessários ao menos dois perfis para preparar a liga mockada.");

const { data: league, error: leagueError } = await supabase
  .from("ligas")
  .upsert({
    ...MOCK_LEAGUE,
    dono_id: ownerId,
    tipo: "CONVITE",
    codigo_convite: MOCK_LEAGUE_CODE,
    convite_expira_em: null,
    arquivada_em: null,
  }, { onConflict: "codigo_convite" })
  .select("id")
  .single();
if (leagueError || !league) throw new Error(`Não foi possível preparar a liga mockada: ${leagueError?.message ?? "resposta vazia"}`);

const { error: membersError } = await supabase.from("ligas_membros").upsert(memberIds.map((usuarioId) => ({
  liga_id: league.id,
  usuario_id: usuarioId,
  convidado_por: usuarioId === ownerId ? null : ownerId,
})), { onConflict: "liga_id,usuario_id" });
if (membersError) throw new Error(`Não foi possível adicionar membros à liga mockada: ${membersError.message}`);

const { count: memberCount, error: verificationError } = await supabase
  .from("ligas_membros")
  .select("usuario_id", { count: "exact", head: true })
  .eq("liga_id", league.id);
if (verificationError || memberCount !== memberIds.length) throw new Error("A verificação dos membros da liga mockada falhou.");

console.log(`Liga mockada pronta com ${memberCount} membros (${mockMemberIds.length} contas de teste na liga, 1 perfil reserva fora dela e ${realProfileIds.length} perfis existentes).`);
