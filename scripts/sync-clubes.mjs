import { createClient } from "@supabase/supabase-js";

const apiKey = process.env.FOOTBALL_DATA_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const competitionCode = process.env.FOOTBALL_DATA_COMPETITION_CODE ?? "BSA";
const season = Number(process.env.FOOTBALL_DATA_SEASON ?? "2026");

const brazilianAbbreviations = {
  "Atletico Goianiense": "ACG",
  "Atletico-MG": "CAM",
  "Grêmio FBPA": "GRE",
  "São Paulo FC": "SAO",
  "Coritiba FBC": "CTB",
  "Clube do Remo": "REM",
  "SC Internacional": "INT",
};

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

if (!apiKey || !supabaseUrl || !serviceRoleKey) {
  throw new Error("FOOTBALL_DATA_API_KEY, NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.");
}

if (!/^[A-Z0-9_-]{2,12}$/.test(competitionCode) || !Number.isInteger(season)) {
  throw new Error("FOOTBALL_DATA_COMPETITION_CODE deve ser um código válido e FOOTBALL_DATA_SEASON deve ser um número inteiro.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { data: existingClubsForMapping, error: existingClubsForMappingError } = await supabase
  .from("clubes")
  .select("id, sigla, football_data_id");

if (existingClubsForMappingError) {
  throw new Error(`Não foi possível consultar o catálogo atual de clubes: ${existingClubsForMappingError.message}`);
}

const response = await fetch(`https://api.football-data.org/v4/competitions/${encodeURIComponent(competitionCode)}/teams?season=${season}`, {
  headers: { "X-Auth-Token": apiKey, Accept: "application/json" },
});

if (!response.ok) throw new Error(`football-data.org respondeu HTTP ${response.status}.`);

const payload = await response.json();
if (!Array.isArray(payload.teams)) {
  throw new Error(`football-data.org não retornou a lista de clubes esperada (${payload.message ?? "resposta inválida"}).`);
}

const existingByFootballDataId = new Map((existingClubsForMapping ?? []).flatMap((club) => club.football_data_id ? [[club.football_data_id, club]] : []));
const existingByAbbreviation = new Map((existingClubsForMapping ?? []).map((club) => [club.sigla, club]));
const existingById = new Map((existingClubsForMapping ?? []).map((club) => [club.id, club]));
const clubs = payload.teams.map((team) => {
  const sigla = brazilianAbbreviations[team.name] ?? team.tla?.trim().toUpperCase();
  const existingClub = existingByFootballDataId.get(team.id) ?? existingByAbbreviation.get(sigla);
  const collidingClub = existingById.get(team.id);

  if (!existingClub && collidingClub) {
    throw new Error(`O ID externo ${team.id} colide com o clube interno ${collidingClub.nome}. Faça o mapeamento manual antes de sincronizar.`);
  }

  return {
    id: existingClub?.id ?? team.id,
    football_data_id: team.id,
    nome: team.name?.trim(),
    sigla,
    logo_url: team.crest?.trim() || null,
    ativo: true,
    api_atualizado_em: new Date().toISOString(),
  };
});

if (clubs.length === 0) throw new Error("football-data.org não retornou clubes para esta competição e temporada.");

const invalidClub = clubs.find((club) => !Number.isInteger(club.id) || !club.nome || !/^[A-Z0-9]{3}$/.test(club.sigla ?? ""));
if (invalidClub) throw new Error("football-data.org retornou clube sem sigla de três caracteres válida; sincronização cancelada.");

const clubWithInvalidLogo = clubs.find((club) => club.logo_url && !isHttpsUrl(club.logo_url));
if (clubWithInvalidLogo) throw new Error("football-data.org retornou uma URL de escudo inválida; sincronização cancelada.");

const duplicatedAbbreviations = clubs
  .filter((club, index) => clubs.findIndex(({ sigla }) => sigla === club.sigla) !== index)
  .map(({ nome, sigla }) => `${sigla} (${nome})`);

if (duplicatedAbbreviations.length > 0) {
  throw new Error(`football-data.org retornou siglas duplicadas: ${duplicatedAbbreviations.join(", ")}.`);
}

const { error } = await supabase.from("clubes").upsert(clubs, { onConflict: "id" });
if (error) throw new Error(`Não foi possível gravar o catálogo de clubes no Supabase: ${error.message}`);

const { data: existingClubs, error: existingClubsError } = await supabase
  .from("clubes")
  .select("id")
  .eq("ativo", true);

if (existingClubsError) throw new Error("Não foi possível verificar os clubes ativos no Supabase.");

const currentClubIds = new Set(clubs.map((club) => club.id));
const inactiveClubIds = existingClubs.filter(({ id }) => !currentClubIds.has(id)).map(({ id }) => id);

if (inactiveClubIds.length > 0) {
  const { error: deactivateError } = await supabase.from("clubes").update({ ativo: false }).in("id", inactiveClubIds);
  if (deactivateError) throw new Error("Não foi possível desativar clubes fora da temporada selecionada.");
}

const { count, error: verificationError } = await supabase
  .from("clubes")
  .select("id", { count: "exact", head: true })
  .in("id", clubs.map((club) => club.id))
  .eq("ativo", true);

if (verificationError || count !== clubs.length) {
  throw new Error("O catálogo foi gravado, mas a verificação dos clubes ativos falhou.");
}

console.log(`Catálogo atualizado: ${clubs.length} clubes da Série A ${season}.`);
