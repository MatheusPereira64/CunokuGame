# Ícones do Navegador

Esta pasta é destinada para armazenar os ícones (favicons) do jogo que aparecem na aba do navegador.

## Como usar:

1. Adicione sua imagem de ícone nesta pasta (formato recomendado: PNG, ICO, ou SVG)
2. Nome sugerido: `favicon.png`, `favicon.ico`, ou `icon.png`
3. Tamanhos recomendados:
   - 32x32 pixels (tamanho padrão)
   - 16x16 pixels (tamanho pequeno)
   - 192x192 pixels (para PWA)
   - 512x512 pixels (para PWA)

## Atualizar o favicon:

Após adicionar a imagem, atualize o arquivo `index.html` na pasta `client` para referenciar o novo ícone:

```html
<link rel="icon" type="image/png" href="/icons/seu-icone.png" />
```

Ou se preferir manter na raiz do public:
```html
<link rel="icon" type="image/png" href="/favicon.png" />
```

## Formatos suportados:

- PNG (recomendado para transparência)
- ICO (formato tradicional)
- SVG (escalável, melhor qualidade)

