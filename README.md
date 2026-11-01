# Cunoku - Card Game

Jogo de cartas Cunoku desenvolvido com React, TypeScript, Express e WebSockets.

## Estrutura do Projeto

```
├── client/          # Frontend React + TypeScript
├── server/          # Backend Express + WebSockets (LAN / Node)
├── worker/          # Cloudflare Worker + Durable Objects (cloud)
├── shared/          # Código compartilhado (tipos, schemas)
└── docs/            # Documentação
```

## Tecnologias

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend LAN**: Express, WebSockets (`ws`)
- **Backend cloud**: Cloudflare Workers + Durable Objects
- **Database**: PostgreSQL com Drizzle ORM (Neon recomendado no cloud)
- **Build**: Vite + Wrangler

## Scripts

- `npm run dev` — servidor local (LAN)
- `npm run build` / `npm start` — monólito Node (Railway/Render/local)
- `npm run build:cf` / `npm run deploy:cf` — Cloudflare
- `npm run dev:cf` — Wrangler local
- `npm run check` — TypeScript

## Deploy online

**Recomendado: Cloudflare** — veja [`docs/DEPLOY.md`](docs/DEPLOY.md).

```bash
npx wrangler login
npx wrangler secret put DATABASE_URL
npm run deploy:cf
```

Alternativas Node: Railway / Render com `npm run build` + `npm start`.

## Competição

- **Desafio diário**: mesma seed para todos contra 3 bots, uma tentativa por dia (UTC), com streak e ranking do dia.
- **Liga semanal**: soma pontos do desafio e de partidas online com 2+ pessoas; zera toda segunda (UTC).
- Os resultados são calculados no servidor e identificados por uma chave anônima do aparelho (sem login).
- Precisa de servidor: em LAN sem banco, o ranking fica na memória daquele servidor.

## Como Jogar

1. Crie uma nova sala ou entre em uma existente
2. Aguarde outros jogadores (mínimo 2)
3. Objetivo: menor pontuação; declare "Cunoku" quando estiver pronto

Consulte `docs/Rules.md` para regras completas.