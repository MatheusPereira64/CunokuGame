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
