# Cunoku 1.0.1 — Android

## Celular (recomendado)

1. Baixe **`Cunoku-1.0.1.apk`**
2. No Android, permita instalar apps de fontes desconhecidas (se pedir)
3. Abra o APK e instale — o **Cunoku** aparece como aplicativo na tela inicial

Não precisa de Node, npm nem computador no telefone.

### Novidades
- App Android nativo (Capacitor) com ícone Cunoku
- Instalação direta via APK no Release
- Checagem de updates pela página de Releases do GitHub

### Multiplayer
- **Bots / offline:** funciona no app
- **Wi‑Fi (LAN):** outro dispositivo na mesma rede precisa rodar o servidor (PC), e no app use o IP do host
- **Servidor online:** use a URL do servidor ao criar/entrar na sala

## PC (servidor / navegador) — opcional

Se quiser hospedar a partida no computador:

1. Baixe o código-fonte ou o zip de produção (se disponível)
2. Com Node.js 20+: `npm ci --omit=dev` e `npm start`
3. Abra `http://localhost:5000` (ou o IP do PC na Wi‑Fi)

## Notas
- Versão do app: `1.0.1` (`com.cunoku.game`)
- Porta padrão do servidor: `5000`
