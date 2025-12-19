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
    }
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
