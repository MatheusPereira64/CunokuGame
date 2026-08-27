# Cunoku 1.0.8 — Android

## Android

1. Baixe **`Cunoku-1.0.8.apk`** e instale por cima da 1.0.7
2. Sem desinstalar (mesma assinatura de release)

### Correções
- App nativo (APK) passa a usar o Worker cloud (`cunoku.cunokugame.workers.dev`) para ranking, conta global e multiplayer online
- Mensagens de erro mais claras quando a API responde HTML em vez de JSON
- Ajuste no workflow de deploy Cloudflare (checagem do token)

### Requisito do servidor
- O Worker precisa estar deployado com as rotas `/api/rank/*` (secret `CLOUDFLARE_API_TOKEN` no GitHub Actions ou `npx wrangler deploy`)

## Notas
- Versão: `1.0.8` (`com.cunoku.game`, versionCode 9)
