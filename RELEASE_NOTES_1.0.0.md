# Cunoku 1.0.0 — execução local

## Requisitos
- Node.js 20+

## Como rodar
```bash
npm ci --omit=dev
npm start
```

Abra no navegador: `http://localhost:5000`  
Na mesma Wi‑Fi, use o IP do PC (ex.: `http://192.168.x.x:5000`).

## Notas
- Porta padrão: `5000` (variável `PORT`)
- Sem `DATABASE_URL` usa memória (salas locais)
- Instalação PWA: no celular, use “Adicionar à tela inicial” / Instalar app
