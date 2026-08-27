# Deploy Cloudflare (Cunoku)

Guia para hospedar o jogo online no **Cloudflare Workers** (API + WebSocket via Durable Objects + frontend estático).

O servidor Node (`npm run dev` / `npm start`) continua válido para **LAN / Capacitor local**.

## Pré-requisitos

1. Conta [Cloudflare](https://dash.cloudflare.com)
2. Postgres (recomendado: [Neon](https://neon.tech) gratuito)
3. Node 22+ e Wrangler (`npm i` já inclui)

## 1. Banco de dados

1. Crie um projeto no Neon e copie a **connection string** (`DATABASE_URL`)
2. (Opcional) Hyperdrive no Cloudflare para pool de conexões na edge:
   ```bash
   npx wrangler hyperdrive create cunoku-db --connection-string="$DATABASE_URL"
   ```
   Depois descomente o bloco `[[hyperdrive]]` em [`wrangler.toml`](../wrangler.toml) com o `id` retornado.

## 2. Secrets e login (local)

```bash
npx wrangler login
npx wrangler secret put DATABASE_URL
# cole a connection string do Neon
```

## 2b. Secrets do GitHub Actions (obrigatório para CI)

Em **GitHub → Settings → Secrets and variables → Actions → New repository secret**, crie:

| Secret | Onde pegar |
|--------|------------|
| `CLOUDFLARE_ACCOUNT_ID` | `98533e6d6fee8bc0cace27496f700c10` (já da sua conta) ou Dashboard → Overview → Account ID |
| `CLOUDFLARE_API_TOKEN` | [Create Token](https://dash.cloudflare.com/profile/api-tokens) → template **Edit Cloudflare Workers** (ou Custom: Account → Workers Scripts Edit + Account Settings Read) |

`DATABASE_URL` **não** precisa estar no GitHub: configure uma vez no Worker com `npx wrangler secret put DATABASE_URL`.

Sem `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID`, o workflow falha no passo **Deploy to Cloudflare**.

Opcional (Deployments no GitHub): em **Settings → Environments**, crie `production` se ainda não existir (o workflow já usa `environment: production`).

## 3. Deploy manual

```bash
npm run deploy:cf
```

Isso gera o frontend (`dist/public`) e publica o Worker `cunoku` com assets SPA + rotas `/api/*` e `/ws`.

URL atual: https://cunoku.cunokugame.workers.dev

## 4. Deploy automático (CI)

O workflow [`.github/workflows/deploy-cloudflare.yml`](../.github/workflows/deploy-cloudflare.yml):

- Dispara em **push na `main`** ou **Actions → Deploy Cloudflare → Run workflow**
- Publica no Cloudflare
- Aparece em **GitHub → Deployments** (environment `production`)

## 5. Testar

1. Abra a URL do Worker
2. Crie uma sala e copie o código
3. Em outra aba/dispositivo, entre na sala
4. Confirme lobby + início da partida (WebSocket)
5. Health: `GET /api/health`

## 6. Capacitor / app nativo

No modo **servidor** do menu, use a URL HTTPS do Cloudflare (mesma origem para API e `wss`).

## 7. Dev local Cloudflare

```bash
# Com Postgres local ou DATABASE_URL no .dev.vars:
# DATABASE_URL=postgresql://...
npm run dev:cf
```

Arquivo `.dev.vars` (não commitado):

```
DATABASE_URL=postgresql://user:pass@host/db
```

## Arquitetura

```
Browser / APK
  → Assets (Vite)          Workers Assets
  → REST /api/rooms*       Worker
  → WSS /ws?code=XXXX      Durable Object (1 por sala)
  → Postgres               Neon (+ Hyperdrive opcional)
```

LAN: continue usando `npm run dev` / `npm start` (Express + `ws`).

## Cutover (sair do Railway)

1. Deploy Cloudflare estável + Neon
2. Atualize bookmarks / URL no app
3. Desligue o serviço Railway quando não precisar mais

## Troubleshooting

| Problema | Solução |
|----------|---------|
| `DATABASE_URL` missing / salas falham | `wrangler secret put DATABASE_URL` |
| WS 400 Missing room code | Client deve enviar `?code=` (já no `wsUrl(roomCode)`) |
| Tabela rooms | Criada automaticamente no primeiro request API |
| Hyperdrive id inválido | Deixe o bloco comentado e use só `DATABASE_URL` |

## Legado Railway / Render

Ainda é possível rodar o monólito Node (`npm run build` + `npm start`) nessas plataformas. O caminho **recomendado para cloud** passou a ser Cloudflare.
