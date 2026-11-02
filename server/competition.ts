import type { GameState, InsertMatchResult, MatchReward, Player, Room } from "@shared/schema";
import {
  aggregateLeague,
  computeStreak,
  DAILY_BOT_COUNT,
  DAILY_BOT_DIFFICULTY,
  dailyPoints,
  dailySeed,
  dayKey,
  nextDayStart,
  nextWeekStart,
  ONLINE_SCORED_MATCHES_PER_DAY,
  onlinePoints,
  previousWeekKey,
  sortDailyResults,
  weekKey,
  type LeagueStanding,
} from "@shared/competition";
import { generateRoomCode, newPlayerId } from "@shared/roomCode";
import { createBots } from "./bot";
import { GameLogic } from "./game";
import type { CompetitionStore, RankSummary } from "./competitionStore";
import type { IStorage } from "./storage";

const DAILY_TOP_SIZE = 20;
const LEAGUE_TOP_SIZE = 50;

export type RecordedReward = { playerId: string; reward: MatchReward };

export type DailyStartResult = {
  alreadyPlayed: boolean;
  code: string | null;
  playerId: string | null;
  /** Sala recém-criada, para o Worker semear o Durable Object. Não vai para o cliente. */
  createdRoom?: Room;
};

function makePlayer(id: string, name: string, isBot: boolean): Player {
  return { id, name, isBot, isConnected: true, hand: [], score: 0, knownCards: {} };
}

async function accountIdFor(store: CompetitionStore, token: string | null | undefined) {
  return token ? store.getAccountByToken(token) : null;
}

/**
 * Inicia ou retoma a tentativa do dia; cada conta do ranking tem uma única tentativa.
 * Devolve null quando o token não pertence a uma conta.
 */
export async function startDailyChallenge(
  storage: IStorage,
  store: CompetitionStore,
  token: string | null | undefined,
  now = new Date(),
): Promise<DailyStartResult | null> {
  const account = await accountIdFor(store, token);
  if (!account) return null;

  const day = dayKey(now);
  const finished = await store.getPlayerResults(account.id, { kind: "daily", day });
  if (finished.length > 0) return { alreadyPlayed: true, code: null, playerId: null };

  const existing = await store.getDailyEntry(day, account.id);
  if (existing) return { alreadyPlayed: false, code: existing.roomCode, playerId: existing.playerId };

  // Código maior que o das salas comuns: não é digitado e evita esgotar os códigos de 4 letras
  const code = generateRoomCode(8);
  const playerId = newPlayerId();
  const bots = createBots(DAILY_BOT_COUNT, DAILY_BOT_DIFFICULTY);
  const state = GameLogic.createInitialState(
    [
      makePlayer(playerId, account.displayName, false),
      ...bots.map((b) => makePlayer(b.id, b.name, true)),
    ],
    { seed: dailySeed(day), dailyDay: day },
  );

  await storage.createRoom({
    code,
    hostId: playerId,
    status: "playing",
    gameMode: "daily",
    botDifficulty: DAILY_BOT_DIFFICULTY,
    maxPlayers: DAILY_BOT_COUNT + 1,
    botCount: DAILY_BOT_COUNT,
  });
  const room = await storage.updateGameState(code, state);

  const entry = await store.createDailyEntry({ day, rankPlayerId: account.id, roomCode: code, playerId });
  return {
    alreadyPlayed: false,
    code: entry.roomCode,
    playerId: entry.playerId,
    createdRoom: entry.roomCode === code ? room : undefined,
  };
}

export async function getDailyStatus(
  store: CompetitionStore,
  token: string | null | undefined,
  now = new Date(),
) {
  const day = dayKey(now);
  const accountId = (await accountIdFor(store, token))?.id ?? null;
  const ranked = sortDailyResults(await store.getResultsForDay(day, "daily"));

  const myIndex = accountId ? ranked.findIndex((r) => r.rankPlayerId === accountId) : -1;
  const mine = myIndex >= 0 ? ranked[myIndex]! : null;
  const entry = accountId ? await store.getDailyEntry(day, accountId) : undefined;
  const playedDays = accountId
    ? (await store.getPlayerResults(accountId, { kind: "daily" })).map((r) => r.day)
    : [];

  return {
    day,
    resetsAt: nextDayStart(now).toISOString(),
    inProgress: !!entry && !mine,
    result: mine
      ? { rank: myIndex + 1, score: mine.score, won: mine.won, points: mine.points }
      : null,
    streak: computeStreak(playedDays, day),
    total: ranked.length,
    top: ranked.slice(0, DAILY_TOP_SIZE).map((r, i) => ({
      rank: i + 1,
      name: r.displayName,
      score: r.score,
      won: r.won,
      isMe: r.rankPlayerId === accountId,
    })),
  };
}

function toLeagueRow(
  standing: LeagueStanding,
  summaries: Map<string, RankSummary>,
  accountId: string | null,
) {
  const { rankPlayerId, ...row } = standing;
  const summary = summaries.get(rankPlayerId);
  return {
    ...row,
    name: summary?.displayName ?? row.name,
    tier: summary?.rank ?? ("bronze" as const),
    isMe: rankPlayerId === accountId,
  };
}

/** A liga soma pontos da semana; a faixa exibida é o rank global da conta no ranking existente. */
export async function getLeagueStandings(
  store: CompetitionStore,
  token: string | null | undefined,
  now = new Date(),
) {
  const accountId = (await accountIdFor(store, token))?.id ?? null;
  const week = weekKey(now);
  const lastWeek = previousWeekKey(now);
  const standings = aggregateLeague(await store.getResultsForWeek(week));
  const podium = aggregateLeague(await store.getResultsForWeek(lastWeek)).slice(0, 3);
  const top = standings.slice(0, LEAGUE_TOP_SIZE);
  const me = accountId ? standings.find((s) => s.rankPlayerId === accountId) : undefined;

  const visible = [...top, ...podium, ...(me ? [me] : [])].map((s) => s.rankPlayerId);
  const summaries = await store.getAccountSummaries(Array.from(new Set(visible)));

  return {
    week,
    resetsAt: nextWeekStart(now).toISOString(),
    totalPlayers: standings.length,
    top: top.map((s) => toLeagueRow(s, summaries, accountId)),
    me: me ? toLeagueRow(me, summaries, accountId) : null,
    lastWeek: {
      week: lastWeek,
      podium: podium.map((s) => toLeagueRow(s, summaries, accountId)),
    },
  };
}

/**
 * Grava o resultado calculado pelo servidor. Partidas só contra bots fora do desafio
 * diário não pontuam, e o índice único (sala + conta) impede registro duplicado.
 * O nome vem da conta: o do estado da sala é informado pelo cliente.
 */
export async function recordFinishedMatch(
  store: CompetitionStore,
  room: Room,
  state: GameState,
  rankPlayerIds: Map<string, string>,
  now = new Date(),
): Promise<RecordedReward[]> {
  const base = { day: dayKey(now), week: weekKey(now), roomCode: room.code };
  const humans = state.players.filter((p) => !p.isBot);
  const toRow = (
    player: Player,
    rankPlayerId: string,
    displayName: string | undefined,
    kind: string,
    points: number,
  ): InsertMatchResult => ({
    ...base,
    rankPlayerId,
    displayName: displayName ?? player.name,
    kind,
    won: state.winnerId === player.id,
    score: player.score,
    points,
  });

  if (room.gameMode === "daily") {
    const entry = await store.getDailyEntryByRoom(room.code);
    const player = humans.find((p) => p.id === entry?.playerId);
    if (!entry || !player) return [];
    const summaries = await store.getAccountSummaries([entry.rankPlayerId]);
    const points = dailyPoints(state.winnerId === player.id, player.score);
    const displayName = summaries.get(entry.rankPlayerId)?.displayName;
    // A tentativa conta no dia em que começou, mesmo terminando depois da virada
    const inserted = await store.insertMatchResults([
      { ...toRow(player, entry.rankPlayerId, displayName, "daily", points), day: entry.day },
    ]);
    if (inserted.length === 0) return [];

    const ranked = sortDailyResults(await store.getResultsForDay(entry.day, "daily"));
    const days = (await store.getPlayerResults(entry.rankPlayerId, { kind: "daily" })).map((r) => r.day);
    return [
      {
        playerId: player.id,
        reward: {
          points,
          daily: {
            rank: ranked.findIndex((r) => r.rankPlayerId === entry.rankPlayerId) + 1,
            total: ranked.length,
            streak: computeStreak(days, base.day).current,
          },
        },
      },
    ];
  }

  const eligible = humans.flatMap((p) => {
    const rankPlayerId = rankPlayerIds.get(p.id);
    return rankPlayerId ? [{ player: p, rankPlayerId }] : [];
  });
  if (eligible.length < 2) return [];

  const summaries = await store.getAccountSummaries(eligible.map((e) => e.rankPlayerId));
  const rows = await Promise.all(
    eligible.map(async ({ player, rankPlayerId }) => {
      const today = await store.getPlayerResults(rankPlayerId, { kind: "online", day: base.day });
      const scored = today.filter((r) => r.points > 0).length;
      const won = state.winnerId === player.id;
      const points = scored < ONLINE_SCORED_MATCHES_PER_DAY ? onlinePoints(won) : 0;
      return toRow(player, rankPlayerId, summaries.get(rankPlayerId)?.displayName, "online", points);
    }),
  );
  const inserted = await store.insertMatchResults(rows);
  return inserted.flatMap((row) => {
    const match = eligible.find((e) => e.rankPlayerId === row.rankPlayerId);
    return match ? [{ playerId: match.player.id, reward: { points: row.points } }] : [];
  });
}
