# Ícones do app (PWA / tela inicial)

| Arquivo | Uso |
|---------|-----|
| `CunokuGame.png` | Arte completa do ícone |
| `icon-192.png` | PWA Android / Chrome (192×192) |
| `icon-512.png` | PWA Android / Chrome (512×512) + maskable |
| `apple-touch-icon.png` | iPhone / iPad “Adicionar à Tela de Início” |

O manifesto em `vite.config.ts` e o `index.html` apontam para estes arquivos.
Com o service worker registrado, o usuário pode instalar o Cunoku e o ícone aparece na área de trabalho do celular.
