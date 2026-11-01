import type { GameState, InsertMatchResult, MatchReward, Player, Room } from "@shared/schema";
import {
  aggregateLeague,
  computeStreak,
  DAILY_BOT_COUNT,
  DAILY_BOT_DIFFICULTY,
  dailyPoints,
  dailySeed,
  dayKey,
  isPlayerKey,
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
import type { CompetitionStore } from "./competitionStore";
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

/** Inicia ou retoma a tentativa do dia; cada jogador tem uma única tentativa. */
export async function startDailyChallenge(
  storage: IStorage,
  store: CompetitionStore,
  input: { playerKey: string; playerName: string },
  now = new Date(),
): Promise<DailyStartResult> {
  const day = dayKey(now);
  const finished = await store.getPlayerResults(input.playerKey, { kind: "daily", day });
  if (finished.length > 0) return { alreadyPlayed: true, code: null, playerId: null };

  const existing = await store.getDailyEntry(day, input.playerKey);
  if (existing) return { alreadyPlayed: false, code: existing.roomCode, playerId: existing.playerId };

  // Código maior que o das salas comuns: não é digitado e evita esgotar os códigos de 4 letras
  const code = generateRoomCode(8);
  const playerId = newPlayerId();
  const bots = createBots(DAILY_BOT_COUNT, DAILY_BOT_DIFFICULTY);
  const state = GameLogic.createInitialState(
    [
      makePlayer(playerId, input.playerName, false),
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

  const entry = await store.createDailyEntry({ day, playerKey: input.playerKey, roomCode: code, playerId });
  return {
    alreadyPlayed: false,
    code: entry.roomCode,
    playerId: entry.playerId,
    createdRoom: entry.roomCode === code ? room : undefined,
  };
}

export async function getDailyStatus(store: CompetitionStore, rawKey: unknown, now = new Date()) {
  const day = dayKey(now);
  const playerKey = isPlayerKey(rawKey) ? rawKey : null;
  const ranked = sortDailyResults(await store.getResultsForDay(day, "daily"));

  const myIndex = playerKey ? ranked.findIndex((r) => r.playerKey === playerKey) : -1;
  const mine = myIndex >= 0 ? ranked[myIndex]! : null;
  const entry = playerKey ? await store.getDailyEntry(day, playerKey) : undefined;
  const playedDays = playerKey
    ? (await store.getPlayerResults(playerKey, { kind: "daily" })).map((r) => r.day)
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
      isMe: r.playerKey === playerKey,
    })),
  };
}

function toLeagueRow(standing: LeagueStanding, playerKey: string | null) {
  const { playerKey: key, ...row } = standing;
  return { ...row, isMe: key === playerKey };
}

export async function getLeagueStandings(store: CompetitionStore, rawKey: unknown, now = new Date()) {
  const playerKey = isPlayerKey(rawKey) ? rawKey : null;
  const week = weekKey(now);
  const lastWeek = previousWeekKey(now);
  const standings = aggregateLeague(await store.getResultsForWeek(week));
  const lastStandings = aggregateLeague(await store.getResultsForWeek(lastWeek));
  const me = playerKey ? standings.find((s) => s.playerKey === playerKey) : undefined;

  return {
    week,
    resetsAt: nextWeekStart(now).toISOString(),
    totalPlayers: standings.length,
    top: standings.slice(0, LEAGUE_TOP_SIZE).map((s) => toLeagueRow(s, playerKey)),
    me: me ? toLeagueRow(me, playerKey) : null,
    lastWeek: {
      week: lastWeek,
      podium: lastStandings.slice(0, 3).map((s) => toLeagueRow(s, playerKey)),
    },
  };
}

/**
 * Grava o resultado calculado pelo servidor. Partidas só contra bots fora do desafio
 * diário não pontuam, e o índice único (sala + jogador) impede registro duplicado.
 */
export async function recordFinishedMatch(
  store: CompetitionStore,
  room: Room,
  state: GameState,
  playerKeys: Map<string, string>,
  now = new Date(),
): Promise<RecordedReward[]> {
  const base = { day: dayKey(now), week: weekKey(now), roomCode: room.code };
  const humans = state.players.filter((p) => !p.isBot);
  const toRow = (player: Player, playerKey: string, kind: string, points: number): InsertMatchResult => ({
    ...base,
    playerKey,
    displayName: player.name,
    kind,
    won: state.winnerId === player.id,
    score: player.score,
    points,
  });

  if (room.gameMode === "daily") {
    const entry = await store.getDailyEntryByRoom(room.code);
    const player = humans.find((p) => p.id === entry?.playerId);
    if (!entry || !player) return [];
    const points = dailyPoints(state.winnerId === player.id, player.score);
    // A tentativa conta no dia em que começou, mesmo terminando depois da virada
    const inserted = await store.insertMatchResults([
      { ...toRow(player, entry.playerKey, "daily", points), day: entry.day },
    ]);
    if (inserted.length === 0) return [];

    const ranked = sortDailyResults(await store.getResultsForDay(entry.day, "daily"));
    const days = (await store.getPlayerResults(entry.playerKey, { kind: "daily" })).map((r) => r.day);
    return [
      {
        playerId: player.id,
        reward: {
          points,
          daily: {
            rank: ranked.findIndex((r) => r.playerKey === entry.playerKey) + 1,
            total: ranked.length,
            streak: computeStreak(days, base.day).current,
          },
        },
      },
    ];
  }

  const eligible = humans.flatMap((p) => {
    const playerKey = playerKeys.get(p.id);
    return playerKey ? [{ player: p, playerKey }] : [];
  });
  if (eligible.length < 2) return [];

  const rows = await Promise.all(
    eligible.map(async ({ player, playerKey }) => {
      const today = await store.getPlayerResults(playerKey, { kind: "online", day: base.day });
      const scored = today.filter((r) => r.points > 0).length;
      const won = state.winnerId === player.id;
      return toRow(player, playerKey, "online", scored < ONLINE_SCORED_MATCHES_PER_DAY ? onlinePoints(won) : 0);
    }),
  );
  const inserted = await store.insertMatchResults(rows);
  return inserted.flatMap((row) => {
    const match = eligible.find((e) => e.playerKey === row.playerKey);
    return match ? [{ playerId: match.player.id, reward: { points: row.points } }] : [];
  });
}
