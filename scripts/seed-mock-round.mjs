import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const now = new Date();
const hoursFromNow = (hours) => new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
const clubs = [
  { id: 990001, nome: "Clube Mock Verde", sigla: "MV1", ativo: true, cor_primaria: "#1B5E20", cor_secundaria: "#A5D6A7" },
  { id: 990002, nome: "Clube Mock Azul", sigla: "MA2", ativo: true, cor_primaria: "#0D47A1", cor_secundaria: "#90CAF9" },
  { id: 990003, nome: "Clube Mock Amarelo", sigla: "MM3", ativo: true, cor_primaria: "#F57F17", cor_secundaria: "#FFF59D" },
  { id: 990004, nome: "Clube Mock Vinho", sigla: "MV4", ativo: true, cor_primaria: "#7F1D1D", cor_secundaria: "#FCA5A5" },
  { id: 990005, nome: "Clube Mock Roxo", sigla: "MR5", ativo: true, cor_primaria: "#4C1D95", cor_secundaria: "#C4B5FD" },
  { id: 990006, nome: "Clube Mock Laranja", sigla: "ML6", ativo: true, cor_primaria: "#C2410C", cor_secundaria: "#FDBA74" },
];

const { error: clubsError } = await supabase.from("clubes").upsert(clubs, { onConflict: "id" });
if (clubsError) throw new Error(`Não foi possível gravar os clubes mockados: ${clubsError.message}`);

const { data: round, error: roundError } = await supabase
  .from("rodadas")
  .upsert({
    temporada: 2099,
    numero: 1,
    rotulo_api: "MOCK — Rodada de demonstração",
    status: "ABERTA",
    abre_em: hoursFromNow(-24),
    trava_em: hoursFromNow(72),
    fechada_em: null,
    versao_regras: 1,
  }, { onConflict: "temporada,numero" })
  .select("id, status, trava_em, rotulo_api")
  .single();
if (roundError || !round) throw new Error(`Não foi possível gravar a rodada mockada: ${roundError?.message ?? "resposta vazia"}`);

const games = [
  [990001, 990002, 24],
  [990003, 990004, 48],
  [990005, 990006, 72],
].map(([homeId, awayId, startsIn], index) => ({
  id: 991000 + index,
  rodada_id: round.id,
  clube_casa_id: homeId,
  clube_fora_id: awayId,
  inicio_em: hoursFromNow(startsIn),
  status: "A_JOGAR",
  status_api: "MOCK",
  gols_casa: null,
  gols_fora: null,
  pontuado_em: null,
  conferido_em: null,
}));

const { error: gamesError } = await supabase.from("jogos").upsert(games, { onConflict: "id" });
if (gamesError) throw new Error(`Não foi possível gravar os jogos mockados: ${gamesError.message}`);

const { count, error: verificationError } = await supabase
  .from("jogos")
  .select("id", { count: "exact", head: true })
  .eq("rodada_id", round.id);
if (verificationError || count !== games.length) {
  throw new Error("A verificação dos jogos mockados falhou.");
}

console.log(`Dados mockados prontos: ${round.rotulo_api} (${count} jogos; trava em ${round.trava_em}).`);
