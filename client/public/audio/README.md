# Soundtrack e Efeitos Sonoros

Esta pasta contém os arquivos de áudio do jogo Cunoku.

## Estrutura Recomendada

- `soundtrack/` - Músicas de fundo e temas do jogo
- `sfx/` - Efeitos sonoros (comprar carta, descartar, etc.)
- `ui/` - Sons de interface (cliques, notificações, etc.)

## Formatos Suportados

- MP3
- OGG
- WAV

## Como Usar

Os arquivos nesta pasta podem ser acessados diretamente via URL:
```
/audio/nome-do-arquivo.mp3
```

Ou importados no código:
```typescript
import soundUrl from '/audio/soundtrack/main-theme.mp3';
```

