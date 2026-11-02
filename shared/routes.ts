import { z } from 'zod';
import { insertRoomSchema, rooms } from './schema';
import { RANK_TIERS } from './rank';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

const dailyRankingRowSchema = z.object({
  rank: z.number(),
  name: z.string(),
  score: z.number(),
  won: z.boolean(),
  isMe: z.boolean(),
});

const leagueRowSchema = z.object({
  rank: z.number(),
  name: z.string(),
  points: z.number(),
  wins: z.number(),
  games: z.number(),
  tier: z.enum(RANK_TIERS),
  isMe: z.boolean(),
});

export const api = {
  rooms: {
    create: {
      method: 'POST' as const,
      path: '/api/rooms',
      input: z.object({
        playerName: z.string().min(1),
        gameMode: z.enum(['multiplayer', 'vs_bots']).optional().default('multiplayer'),
        botDifficulty: z.enum(['easy', 'medium', 'hard']).optional().default('medium'),
        maxPlayers: z.number().min(2).max(6).optional().default(4),
        botCount: z.number().min(0).max(5).optional().default(0),
      }),
      responses: {
        201: z.object({ code: z.string(), playerId: z.string() }),
        400: errorSchemas.validation,
      },
    },
    join: {
      method: 'POST' as const,
      path: '/api/rooms/join',
      input: z.object({
        code: z.string().length(4),
        playerName: z.string().min(1),
      }),
      responses: {
        200: z.object({ code: z.string(), playerId: z.string(), room: z.custom<typeof rooms.$inferSelect>() }),
        404: errorSchemas.notFound,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/rooms',
      responses: {
        200: z.array(z.custom<typeof rooms.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/rooms/:code',
      responses: {
        200: z.custom<typeof rooms.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  daily: {
    status: {
      method: 'GET' as const,
      path: '/api/daily',
      responses: {
        200: z.object({
          day: z.string(),
          resetsAt: z.string(),
          inProgress: z.boolean(),
          result: z.object({
            rank: z.number(),
            score: z.number(),
            won: z.boolean(),
            points: z.number(),
          }).nullable(),
          streak: z.object({ current: z.number(), best: z.number() }),
          total: z.number(),
          top: z.array(dailyRankingRowSchema),
        }),
      },
    },
    start: {
      method: 'POST' as const,
      path: '/api/daily/start',
      responses: {
        200: z.object({
          alreadyPlayed: z.boolean(),
          code: z.string().nullable(),
          playerId: z.string().nullable(),
        }),
      },
    },
  },
  league: {
    standings: {
      method: 'GET' as const,
      path: '/api/league',
      responses: {
        200: z.object({
          week: z.string(),
          resetsAt: z.string(),
          totalPlayers: z.number(),
          top: z.array(leagueRowSchema),
          me: leagueRowSchema.nullable(),
          lastWeek: z.object({
            week: z.string(),
            podium: z.array(leagueRowSchema),
          }),
        }),
      },
    },
  },
  matchmaking: {
    enqueue: {
      method: 'POST' as const,
      path: '/api/matchmaking',
      input: z.object({
        playerName: z.string().min(1).max(24),
      }),
      responses: {
        200: z.object({
          status: z.enum(["waiting", "filling", "countdown", "matched"]),
          ticketId: z.string(),
          playerId: z.string(),
          code: z.string().optional(),
          hostId: z.string().optional(),
          position: z.number().optional(),
          players: z.number().optional(),
          secondsLeft: z.number().optional(),
        }),
      },
    },
  },
  lan: {
    info: {
      method: 'GET' as const,
      path: '/api/lan-info',
      responses: {
        200: z.object({
          port: z.number(),
          addresses: z.array(z.string()),
          joinBaseUrls: z.array(z.string()),
        }),
      },
    },
  },
  rank: {
    register: {
      method: 'POST' as const,
      path: '/api/rank/register',
      input: z.object({
        nickname: z.string().min(3).max(16),
        pin: z.string().regex(/^\d{4,6}$/),
        displayName: z.string().max(24).optional(),
        iconId: z.string().max(32).optional(),
        accent: z.string().max(32).optional(),
      }),
    },
    login: {
      method: 'POST' as const,
      path: '/api/rank/login',
      input: z.object({
        nickname: z.string().min(3).max(16),
        pin: z.string().regex(/^\d{4,6}$/),
      }),
    },
    me: {
      method: 'GET' as const,
      path: '/api/rank/me',
    },
    profile: {
      method: 'PATCH' as const,
      path: '/api/rank/me',
      input: z.object({
        displayName: z.string().max(24).optional(),
        iconId: z.string().max(32).optional(),
        accent: z.string().max(32).optional(),
        frameId: z.string().max(32).optional(),
        titleId: z.string().max(32).optional(),
        bannerId: z.string().max(32).optional(),
      }),
    },
    matchResult: {
      method: 'POST' as const,
      path: '/api/rank/match-result',
      input: z.object({
        won: z.boolean(),
        finalScore: z.number(),
        mode: z.enum(["pvp", "bots", "offline"]).default("pvp"),
        botDifficulty: z.enum(["easy", "medium", "hard"]).optional(),
      }),
    },
    leaderboard: {
      method: 'GET' as const,
      path: '/api/rank/leaderboard',
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
