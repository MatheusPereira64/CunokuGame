import { apiUrl } from "./gameServer";
import { saveProfile, type ProfileAccent, type ProfileIconId } from "./playerProfile";
import type { PublicRankProfile, LeaderboardEntry, RankTier } from "@shared/rank";

const TOKEN_KEY = "cunoku_rank_token";
const PLAYER_KEY = "cunoku_rank_player_id";
const SAVED_ACCOUNTS_KEY = "cunoku_saved_accounts";

/** Conta usada neste aparelho. Sem token, o jogador volta digitando a senha. */
export interface SavedAccount {
  playerId: string;
  /** Nome de usuário; "" enquanto a conta não escolheu um. */
  nickname: string;
  displayName: string;
  /** E-mail de login; ausente nas contas antigas de PIN. */
  email?: string | null;
  token: string | null;
}

export type { PublicRankProfile, LeaderboardEntry, RankTier };

export function getRankToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getRankPlayerId(): string | null {
  try {
    return localStorage.getItem(PLAYER_KEY);
  } catch {
    return null;
  }
}

export function isRankLoggedIn(): boolean {
  return !!getRankToken();
}

function saveSession(token: string, playerId: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(PLAYER_KEY, playerId);
}

export function getSavedAccounts(): SavedAccount[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVED_ACCOUNTS_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((a) => typeof a?.playerId === "string" && (typeof a?.nickname === "string" || typeof a?.email === "string"))
      .map((a) => ({ ...a, nickname: typeof a.nickname === "string" ? a.nickname : "" }) as SavedAccount);
  } catch {
    return [];
  }
}

function writeSavedAccounts(accounts: SavedAccount[]) {
  try {
    localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    // quota / modo privado
  }
}

/** A conta entrada por último fica no topo da lista. */
function rememberAccount(profile: PublicRankProfile, token: string) {
  const all = getSavedAccounts();
  const previous = all.find((a) => a.playerId === profile.playerId);
  const others = all.filter((a) => a.playerId !== profile.playerId);
  writeSavedAccounts([
    {
      playerId: profile.playerId,
      nickname: profile.nickname,
      displayName: profile.displayName || profile.nickname,
      email: profile.email !== undefined ? profile.email : previous?.email ?? null,
      token,
    },
    ...others,
  ]);
}

export function forgetSavedAccount(playerId: string): void {
  writeSavedAccounts(getSavedAccounts().filter((a) => a.playerId !== playerId));
  if (getRankPlayerId() === playerId) logoutRank();
}

/**
 * Entra em uma conta salva sem digitar a senha.
 * Devolve null se a sessão expirou; a conta continua na lista para entrar com a senha.
 */
export async function switchToSavedAccount(playerId: string): Promise<PublicRankProfile | null> {
  const account = getSavedAccounts().find((a) => a.playerId === playerId);
  if (!account?.token) return null;
  saveSession(account.token, account.playerId);
  return fetchRankMe();
}

/** A conta do ranking é a fonte do nome/ícone: o aparelho guarda uma cópia. */
function rememberRankProfile(profile: PublicRankProfile): PublicRankProfile {
  saveProfile({
    // Conta nova ainda sem nome: mantém o nome que o aparelho já usava
    displayName: profile.displayName || profile.nickname || undefined,
    iconId: profile.iconId as ProfileIconId,
    accent: profile.accent as ProfileAccent,
  });
  return profile;
}

/** Encerra a sessão ativa; a conta continua salva para voltar depois. */
export function logoutRank(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(PLAYER_KEY);
  } catch {
    // ignore
  }
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  const trimmed = text.trim();
  if (trimmed.startsWith("<!") || trimmed.startsWith("<html")) {
    throw new Error(
      "Servidor online indisponível neste dispositivo (resposta HTML em vez de API). Atualize o app ou verifique a conexão.",
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Resposta inválida do servidor (HTTP ${res.status})`);
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = (await res.clone().json()) as { message?: string };
    return data.message || `HTTP ${res.status}`;
  } catch {
    const text = await res.text().catch(() => "");
    if (text.trim().startsWith("<!") || text.trim().startsWith("<html")) {
      return "API online não encontrada neste app — use a versão atualizada.";
    }
    return `HTTP ${res.status}`;
  }
}

/** Cadastro e login respondem igual: guarda a sessão e a conta neste aparelho. */
async function openRankSession(path: string, input: object): Promise<PublicRankProfile> {
  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = await parseJson<{ token: string; profile: PublicRankProfile }>(res);
  saveSession(data.token, data.profile.playerId);
  rememberAccount(data.profile, data.token);
  return rememberRankProfile(data.profile);
}

export async function registerRankAccount(input: {
  email: string;
  password: string;
  displayName?: string;
  iconId?: string;
  accent?: string;
}): Promise<PublicRankProfile> {
  return openRankSession("/api/rank/register", input);
}

export async function loginRankAccount(input: {
  email: string;
  password: string;
}): Promise<PublicRankProfile> {
  return openRankSession("/api/rank/login", input);
}

export async function fetchRankMe(): Promise<PublicRankProfile | null> {
  const token = getRankToken();
  if (!token) return null;
  const res = await fetch(apiUrl("/api/rank/me"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    // Sessão inválida: mantém a conta na lista, sem o token, para entrar de novo com a senha
    const playerId = getRankPlayerId();
    writeSavedAccounts(getSavedAccounts().map((a) => (a.playerId === playerId ? { ...a, token: null } : a)));
    logoutRank();
    return null;
  }
  if (!res.ok) throw new Error(await parseError(res));
  const data = await parseJson<{ profile: PublicRankProfile }>(res);
  rememberAccount(data.profile, token);
  return rememberRankProfile(data.profile);
}

/** Conta antiga (apelido + PIN), ainda logada aqui: passa a entrar por e-mail e senha. */
export async function linkRankEmail(input: { email: string; password: string }): Promise<PublicRankProfile | null> {
  const token = getRankToken();
  if (!token) return null;
  const res = await fetch(apiUrl("/api/rank/me/email"), {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  if (res.status === 401) {
    logoutRank();
    return null;
  }
  if (!res.ok) throw new Error(await parseError(res));
  const data = await parseJson<{ profile: PublicRankProfile }>(res);
  rememberAccount(data.profile, token);
  return data.profile;
}

export async function syncRankProfile(patch: {
  nickname?: string;
  displayName?: string;
  iconId?: string;
  accent?: string;
  frameId?: string;
  titleId?: string;
  bannerId?: string;
}): Promise<PublicRankProfile | null> {
  const token = getRankToken();
  if (!token) return null;
  const res = await fetch(apiUrl("/api/rank/me"), {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(patch),
  });
  if (res.status === 401) {
    logoutRank();
    return null;
  }
  if (!res.ok) throw new Error(await parseError(res));
  const data = await parseJson<{ profile: PublicRankProfile }>(res);
  rememberAccount(data.profile, token);
  return data.profile;
}

export async function reportRankMatchResult(input: {
  won: boolean;
  finalScore: number;
  mode: "pvp" | "bots" | "offline";
  botDifficulty?: "easy" | "medium" | "hard";
}): Promise<PublicRankProfile | null> {
  const token = getRankToken();
  if (!token) return null;
  const res = await fetch(apiUrl("/api/rank/match-result"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });
  if (res.status === 401) {
    logoutRank();
    return null;
  }
  if (!res.ok) throw new Error(await parseError(res));
  const data = await parseJson<{ profile: PublicRankProfile }>(res);
  return data.profile;
}

/**
 * Rank global só conta PvP: offline/bots não entram.
 * Precisa de pelo menos outro humano na mesa.
 */
export function countsForGlobalRank(
  isOffline: boolean,
  players: { id: string; isBot?: boolean }[],
  localPlayerId: string,
): boolean {
  if (isOffline) return false;
  return players.some((p) => p.id !== localPlayerId && !p.isBot);
}

export async function fetchLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const res = await fetch(apiUrl(`/api/rank/leaderboard?limit=${limit}`));
  if (!res.ok) throw new Error(await parseError(res));
  const data = await parseJson<{ entries: LeaderboardEntry[] }>(res);
  return data.entries ?? [];
}
