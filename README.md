<div align="center">

# Cunoku 九

**Um jogo de cartas de estratégia e blefe, com tema de mesa japonesa.**

Termine a partida com a **menor soma de cartas**, mesmo sem poder ver a própria mão.

[![Última versão](https://img.shields.io/github/v/release/MatheusPereira64/CunokuGame?label=vers%C3%A3o)](https://github.com/MatheusPereira64/CunokuGame/releases/latest)
[![CI](https://github.com/MatheusPereira64/CunokuGame/actions/workflows/ci.yml/badge.svg)](https://github.com/MatheusPereira64/CunokuGame/actions/workflows/ci.yml)

[**Jogar no navegador**](https://cunoku.cunokugame.workers.dev) · [**Baixar o app**](https://github.com/MatheusPereira64/CunokuGame/releases/latest) · [Regras](#como-jogar) · [Rodar localmente](#rodar-localmente)

<img src="docs/screenshots/mesa.jpg" alt="Mesa com dois bots: uma carta de oponente aparece revelada, só para quem usou o poder" width="720">

</div>

## O que tem no jogo

- **Jogue como quiser:** sala com amigos por código ou link, fila rápida, partida contra bots (fácil, médio ou difícil) e Wi‑Fi local
- **Partidas online:** tempo de 60 segundos por vez, revanche com os mesmos jogadores e amigos e jogadores recentes para convidar direto da sala
- **Competição:** desafio diário, liga semanal e ranking global com conta de e-mail e senha
- **Aprenda jogando:** tutorial na primeira partida, uma dica na primeira vez que cada poder aparece e um aviso curto com a jogada de cada um
- **Seu estilo:** ícones e cores de perfil, versos de carta e tapetes de mesa, e emotes durante a partida
- **Três idiomas:** português, espanhol e inglês
- **Em qualquer tela:** navegador, Android (APK) e iPhone (IPA sem assinatura, para instalar por sideload), com layout próprio para celular deitado

## Telas

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/menu.jpg" alt="Menu inicial do Cunoku com os modos de jogo"><br><sub>Menu inicial</sub></td>
    <td width="50%"><img src="docs/screenshots/lobby.jpg" alt="Sala de espera com o código da sala e dois jogadores sentados"><br><sub>Sala de espera, com um assento para cada jogador</sub></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/dica.jpg" alt="Dica explicando o poder do 9 ao lado da carta comprada"><br><sub>Dica na primeira vez que cada poder aparece</sub></td>
    <td><img src="docs/screenshots/habilidade.jpg" alt="Escolha das duas cartas da troca, ligadas por uma linha tracejada"><br><sub>Escolha do alvo direto na mesa</sub></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/troca.jpg" alt="Setas ligando a carta 1 do jogador à carta 4 do oponente"><br><sub>Troca: as setas mostram para onde cada carta foi</sub></td>
    <td><img src="docs/screenshots/aviso.jpg" alt="Aviso Baralho para Bot Alpha e balão comprou do baralho junto ao avatar"><br><sub>A jogada de cada um aparece num aviso curto</sub></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/emotes.jpg" alt="Roda de emotes aberta sobre a mesa"><br><sub>Emotes durante a partida</sub></td>
    <td><img src="docs/screenshots/cunoku.jpg" alt="Anúncio de tela cheia com o texto CUNOKU"><br><sub>Quando alguém declara Cunoku, as rodadas finais começam</sub></td>
  </tr>
</table>

## Como jogar

### Objetivo

Ter a **menor soma de cartas** quando a partida acabar. Cada jogador começa com 4 cartas viradas para baixo, e ninguém sabe o que tem na mão até usar um poder. A partida aceita de 2 a 6 jogadores.

### Valor das cartas

| Carta | Pontos |
|---|---|
| Coringa | **-1** |
| Rei | **0** |
| Ás | 1 |
| 2 a 10 | o próprio número |
| Valete | 11 |
| Rainha | 12 |

### Seu turno

1. **Compre** uma carta do baralho ou pegue a de cima da pilha de descarte.
2. **Decida** o que fazer com ela:
   - substituir uma carta da sua mão, descartando a antiga;
   - descartá-la direto na pilha;
   - usar o poder dela, se a carta veio do baralho. Carta pega do descarte não usa poder.

Nas partidas online com 2 ou mais pessoas, cada vez tem **60 segundos**. Se o tempo acabar, o jogo compra e descarta pelo jogador.

### Poderes

| Carta | Poder |
|---|---|
| **Ás e 2** (Vento 風) | Embaralha a mão de um oponente, que esquece o que sabia sobre ela. Todos veem quem foi atingido, e a soma dele não muda. |
| **3 e 4** (Selo) | Sela uma carta da mesa: ela não pode ser vista, trocada nem descartada até chegar de novo a sua vez. |
| **5 e 6** | Olha uma carta de um oponente. Ela fica revelada por 20 segundos, só para você. |
| **7 e 8** | Olha uma carta sua por 20 segundos. |
| **9 e 10** | Faz 2 jogadores trocarem 1 carta: você e outro, ou dois outros jogadores. |
| **Valete** | Você compra outra carta e é obrigado a substituir uma da sua mão por ela. |
| **Rainha** | Um oponente compra 2 cartas e você compra 1, respeitando o limite de 6 cartas na mão. |
| **Rei** | Revela todas as suas cartas ou as de um jogador por 20 segundos, só para você. Cartas seladas continuam viradas. |
| **Coringa** | Revela as cartas de todos por 40 segundos, só para você, e permite forçar um jogador a trocar uma carta por uma do baralho. |

### Descarte e punição

O descarte é uma **ação livre**: a qualquer momento, mesmo fora da sua vez, você pode descartar uma carta da mão que tenha o **mesmo número ou letra** da carta no topo da pilha, seja qual for o naipe (por exemplo, 7 sobre 7). Acertar não encerra a vez de ninguém. Só não dá para fazer isso na sua vez depois de comprar.

Mas é um risco: você não precisa conhecer a carta para tentar e, se errar, compra **2 cartas de punição**. Quem já tem 6 cartas perde a vez: a atual, se for a dela, ou a próxima, se errou fora dela.

### Fim da partida

A partir da **rodada 5**, um jogador satisfeito com as próprias cartas pode declarar **Cunoku**. Todos jogam mais **3 rodadas**, contadas a partir do turno de quem declarou. Depois as cartas são reveladas e somadas, e **vence quem tiver menos pontos**.

As regras também ficam em [`docs/Rules.md`](docs/Rules.md) e dentro do próprio jogo, numa colinha disponível durante a partida.

## Competição

- **Desafio diário:** a mesma seed para todos contra 3 bots, com uma tentativa por dia (UTC), streak e ranking do dia
- **Liga semanal:** soma os pontos do desafio e de partidas online com 2 ou mais pessoas com conta, e zera toda segunda (UTC)
- **Contas:** e-mail e senha, com o nome de usuário escolhido depois do cadastro. Os resultados são calculados no servidor. Ainda não há recuperação de senha

O desafio, a liga e as contas precisam de um servidor com banco de dados. Sem `DATABASE_URL`, eles ficam indisponíveis.

## Rodar localmente

Requer **Node 22+**.

```bash
npm install
npm run dev
```

O jogo abre em `http://localhost:5000`. Em desenvolvimento, sem banco, as salas ficam em memória. Para contas, ranking e competição, defina `DATABASE_URL` com uma conexão Postgres e crie as tabelas:

```bash
npx tsx script/init-db.ts
```

### Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor local (também serve para jogar na mesma Wi‑Fi) |
| `npm run build` e `npm start` | Monólito Node (Railway, Render ou local) |
| `npm run dev:cf` | Worker local com Wrangler |
| `npm run deploy:cf` | Publica na Cloudflare |
| `npm run check` | Verificação de tipos |
| `npm test` | Testes |
| `npm run ci` | Tipos, testes e build |

## Tecnologias

- **Frontend:** React, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion e Vite
- **Servidor local:** Express e WebSockets (`ws`)
- **Servidor online:** Cloudflare Workers e Durable Objects
- **Banco:** PostgreSQL com Drizzle ORM (Neon recomendado na nuvem)
- **Mobile:** Capacitor

## Estrutura do projeto

```
├── client/          # Frontend React + TypeScript
├── server/          # Backend Express + WebSockets (LAN / Node)
├── worker/          # Cloudflare Worker + Durable Objects (online)
├── shared/          # Código compartilhado (tipos, regras dos poderes, ranking)
├── android/ ios/    # Projetos Capacitor
├── releases/        # Notas de cada versão
└── docs/            # Regras, deploy e capturas de tela
```

## Deploy

O caminho recomendado é a Cloudflare. O guia completo está em [`docs/DEPLOY.md`](docs/DEPLOY.md).

```bash
npx wrangler login
npx wrangler secret put DATABASE_URL
npm run deploy:cf
```

Como alternativa, Railway ou Render com `npm run build` e `npm start`.
