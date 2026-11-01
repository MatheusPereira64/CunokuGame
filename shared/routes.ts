import { z } from 'zod';
import { insertRoomSchema, rooms } from './schema';

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
  tier: z.enum(['bronze', 'silver', 'gold', 'diamond']),
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
      input: z.object({
        playerKey: z.string().uuid(),
        playerName: z.string().trim().min(1).max(24),
      }),
      responses: {
        200: z.object({
          alreadyPlayed: z.boolean(),
          code: z.string().nullable(),
          playerId: z.string().nullable(),
        }),
        400: errorSchemas.validation,
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
