# Cunoku 1.0.3 — Android e iOS

## Android (recomendado)

1. Baixe **`Cunoku-1.0.3.apk`**
2. Permita instalar apps de fontes desconhecidas (se pedir)
3. Abra o APK e instale — o **Cunoku** aparece na tela inicial

## iOS

### App nativo (Mac / Xcode)

1. Baixe **`Cunoku-1.0.3.ipa`**
2. Abra o projeto `ios/App` no Xcode (macOS) ou instale o IPA com a sua conta Apple
3. O IPA desta release é gerado no CI sem certificado de App Store; para instalar num iPhone é preciso assinar no Xcode ou com Apple Developer

### Atalho na tela inicial (sem Mac)

1. Abra o Cunoku no **Safari**
2. Compartilhar → **Adicionar à Tela de Início**

### Novidades
- Perfil local com ícone, cor e estatísticas de partidas
- Projeto nativo **iOS** (Capacitor), na mesma versão do Android
- App Android `1.0.3` (`versionCode` 4)

### Multiplayer
- **Bots / offline:** funciona no app
- **Wi‑Fi (LAN):** use o IP do host no app
- **Servidor online:** use a URL do servidor ao criar/entrar

## PC (opcional)

Node.js 20+: `npm ci --omit=dev` e `npm start` → `http://localhost:5000`

## Notas
- Versão do app: `1.0.3` (`com.cunoku.game`)
