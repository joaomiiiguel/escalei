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
const hoursFromNow = (hours) => new Date(now.getTime() + hours * 60 * 60 * 1_000).toISOString();

const { data: clubs, error: clubsError } = await supabase
  .from("clubes")
  .select("id, nome, sigla, logo_url")
  .eq("ativo", true)
  .not("logo_url", "is", null)
  .order("nome")
  .limit(6);

if (clubsError) throw new Error(`Não foi possível consultar os clubes com escudo: ${clubsError.message}`);
if (!clubs || clubs.length < 6) throw new Error("São necessários ao menos seis clubes ativos com escudo para criar a próxima rodada de demonstração.");

const { data: round, error: roundError } = await supabase
  .from("rodadas")
  .upsert({
    temporada: 2099,
    numero: 2,
    rotulo_api: "MOCK — Próxima rodada de demonstração",
    status: "AGENDADA",
    abre_em: hoursFromNow(24),
    trava_em: hoursFromNow(96),
    fechada_em: null,
    versao_regras: 1,
  }, { onConflict: "temporada,numero" })
  .select("id, numero, rotulo_api, status")
  .single();

if (roundError || !round) throw new Error(`Não foi possível gravar a próxima rodada de demonstração: ${roundError?.message ?? "resposta vazia"}`);

const games = [
  [clubs[0], clubs[1], 96],
  [clubs[2], clubs[3], 120],
  [clubs[4], clubs[5], 144],
].map(([home, away, startsIn], index) => ({
  id: 992_000 + index,
  rodada_id: round.id,
  clube_casa_id: home.id,
  clube_fora_id: away.id,
  inicio_em: hoursFromNow(startsIn),
  status: "A_JOGAR",
  status_api: "MOCK",
  gols_casa: null,
  gols_fora: null,
  pontuado_em: null,
  conferido_em: null,
}));

const { error: gamesError } = await supabase.from("jogos").upsert(games, { onConflict: "id" });
if (gamesError) throw new Error(`Não foi possível gravar os jogos da próxima rodada: ${gamesError.message}`);

const { data: savedGames, error: verificationError } = await supabase
  .from("jogos")
  .select("id, clube_casa_id, clube_fora_id")
  .eq("rodada_id", round.id)
  .in("id", games.map(({ id }) => id));

if (verificationError || savedGames?.length !== games.length) throw new Error("A verificação dos jogos da próxima rodada falhou.");

console.log(`${round.rotulo_api} criada: ${games.map(({ clube_casa_id, clube_fora_id }) => {
  const home = clubs.find(({ id }) => id === clube_casa_id);
  const away = clubs.find(({ id }) => id === clube_fora_id);
  return `${home?.sigla} × ${away?.sigla}`;
}).join("; ")}.`);
