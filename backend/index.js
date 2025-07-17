const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

const PORT = 3000;

// Estrutura para armazenar salas e jogadores
const salas = {};
// Estrutura para armazenar o estado do jogo por sala
const estadoJogo = {};
// Estrutura para armazenar informações de bots e dificuldade por sala
const infoBots = {};
// Estrutura para memória dos bots por sala
const memoriaBots = {};

function criarBaralho(numJogadores = 4) {
  const VALORES_CARTAS = [
    { nome: 'Rei', valor: 0 },
    { nome: 'Às', valor: 1 },
    { nome: 'Cinco', valor: 5 },
    { nome: 'Seis', valor: 6 },
    { nome: 'Sete', valor: 7 },
    { nome: 'Oito', valor: 8 },
    { nome: 'Nove', valor: 9 },
    { nome: 'Dez', valor: 10 },
    { nome: 'Valete', valor: 11 },
    { nome: 'Rainha', valor: 12 },
    { nome: 'Coringa', valor: -1 },
  ];
  const NAIPES = ['♠', '♥', '♦', '♣'];
  let baralho = [];
  const cartasNecessarias = numJogadores * 10 * 4;
  const baralhoBase = [];
  for (const carta of VALORES_CARTAS) {
    if (carta.nome === 'Coringa') {
      baralhoBase.push({ ...carta, naipe: null });
      baralhoBase.push({ ...carta, naipe: null });
    } else {
      for (const naipe of NAIPES) {
        baralhoBase.push({ ...carta, naipe });
      }
    }
  }
  const multiplicador = Math.ceil(cartasNecessarias / baralhoBase.length);
  for (let m = 0; m < multiplicador; m++) {
    baralho = baralho.concat(baralhoBase.map(c => ({ ...c })));
  }
  for (let i = baralho.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [baralho[i], baralho[j]] = [baralho[j], baralho[i]];
  }
  return baralho;
}

app.get('/', (req, res) => {
  res.send('Backend funcionando com suporte a multiplayer!');
});

io.on('connection', (socket) => {
  console.log('Novo jogador conectado:', socket.id);

  socket.on('entrar_sala', ({ nome, sala }) => {
    if (!salas[sala]) {
      salas[sala] = [];
    }
    if (salas[sala].length >= 8) {
      socket.emit('sala_cheia');
      return;
    }
    salas[sala].push({ id: socket.id, nome });
    socket.join(sala);
    io.to(sala).emit('atualizar_jogadores', salas[sala]);
    socket.emit('entrou_sala', { sala, nome });
    console.log(`${nome} entrou na sala ${sala}`);
  });

  socket.on('pedir_jogadores', ({ sala }) => {
    if (salas[sala]) {
      socket.emit('atualizar_jogadores', salas[sala]);
    }
  });

  socket.on('iniciar_jogo', ({ sala, bots, dificuldade }) => {
    // Cria o estado inicial do jogo para a sala
    const jogadores = salas[sala] || [];
    const numJogadores = jogadores.length + (bots && Array.isArray(bots) ? bots.length : 0);
    const baralho = criarBaralho(numJogadores);
    const cartasPorJogador = 4;
    // Adiciona bots como jogadores
    let players = jogadores.map(j => ({ nome: j.nome, mao: [], humano: true }));
    if (bots && Array.isArray(bots)) {
      bots.forEach(nome => {
        players.push({ nome, mao: [], humano: false });
      });
      infoBots[sala] = { nomes: bots, dificuldade: dificuldade || 'facil' };
      // Inicializa memória dos bots
      memoriaBots[sala] = {};
      bots.forEach(nome => {
        memoriaBots[sala][nome] = { cartasOponentes: {} };
      });
    } else {
      infoBots[sala] = null;
      memoriaBots[sala] = null;
    }
    for (let i = 0; i < cartasPorJogador; i++) {
      players.forEach(player => {
        player.mao.push(baralho.pop());
      });
    }
    const pilha = [baralho.pop()];
    estadoJogo[sala] = {
      players,
      baralho,
      pilha,
      jogadorDaVez: 0,
      cartasPorJogador,
      jogoIniciado: true,
      aguardandoAcao: null, // Adicionado para controlar ações pendentes
      turnoAtual: 1, // NOVO: contador de turnos
      fimDeclarado: false, // NOVO: se o fim foi declarado
      jogadorDeclarouFim: null, // NOVO: quem declarou
      turnosRestantesFim: null, // NOVO: turnos extras após declaração
      resultadoFinal: null // NOVO: resultado do jogo
    };
    io.to(sala).emit('jogo_iniciado');
    io.to(sala).emit('estado_jogo', estadoJogo[sala]);
    // Se o primeiro jogador for bot, já aciona o bot (REMOVIDO)
    // setTimeout(() => checarBotEVez(sala), 500);
  });

  // Função auxiliar para avançar turno e lidar com fim de jogo
  function avancarTurno(estado, sala) {
    // Avança o jogador da vez
    estado.jogadorDaVez = (estado.jogadorDaVez + 1) % estado.players.length;
    // Só conta turno quando o ciclo completa
    if (estado.jogadorDaVez === 0) {
      estado.turnoAtual = (estado.turnoAtual || 1) + 1;
    }
    // Se fim foi declarado, decrementa turnos restantes
    if (estado.fimDeclarado && estado.turnosRestantesFim !== null) {
      estado.turnosRestantesFim--;
      if (estado.turnosRestantesFim <= 0) {
        // Fim do jogo: revelar cartas e calcular vencedor
        estado.jogoIniciado = false;
        // Calcula soma das cartas de cada jogador
        const somas = estado.players.map(p => ({ nome: p.nome, soma: p.mao.reduce((acc, c) => acc + (typeof c.valor === 'number' ? c.valor : 0), 0) }));
        const menor = Math.min(...somas.map(s => s.soma));
        const vencedores = somas.filter(s => s.soma === menor).map(s => s.nome);
        estado.resultadoFinal = { somas, vencedores };
        io.to(sala).emit('fim_de_jogo', estado.resultadoFinal);
      }
    }
    // Checa se é vez de bot após avançar (REMOVIDO)
    // setTimeout(() => checarBotEVez(sala), 500);
  }

  socket.on('comprar_carta', ({ sala, jogador }) => {
    const estado = estadoJogo[sala];
    if (!estado || !estado.jogoIniciado) return;
    const idx = estado.players.findIndex(p => p.nome === jogador);
    if (idx !== estado.jogadorDaVez) return;
    if (estado.baralho.length === 0) return;
    const cartaComprada = estado.baralho.pop();
    // Adiciona a carta temporariamente em uma ação pendente
    estado.aguardandoAcao = { jogador: idx, carta: cartaComprada };
    // Envia o estado atualizado (mas não avança o turno nem adiciona à mão ainda)
    io.to(sala).emit('estado_jogo', estado);
  });

  // Atualizar todos os pontos que avançam turno para usar avancarTurno
  socket.on('substituir_carta', ({ sala, jogador, indice, carta }) => {
    const estado = estadoJogo[sala];
    if (!estado || !estado.jogoIniciado) return;
    const idx = estado.players.findIndex(p => p.nome === jogador);
    if (idx !== estado.jogadorDaVez) return;
    if (!estado.aguardandoAcao || estado.aguardandoAcao.jogador !== idx) return;
    // Substitui a carta na mão
    if (indice >= 0 && indice < estado.players[idx].mao.length) {
      const cartaDescartada = estado.players[idx].mao[indice];
      estado.players[idx].mao[indice] = estado.aguardandoAcao.carta;
      estado.pilha.push(cartaDescartada);
      // Memorizar carta descartada para todos bots médios/difíceis
      if (memoriaBots[sala]) {
        Object.keys(memoriaBots[sala]).forEach(bot => {
          if (infoBots[sala]?.dificuldade === 'medio' || infoBots[sala]?.dificuldade === 'dificil') {
            memoriaBots[sala][bot].cartasOponentes[estado.players[idx].nome] = memoriaBots[sala][bot].cartasOponentes[estado.players[idx].nome] || {};
            memoriaBots[sala][bot].cartasOponentes[estado.players[idx].nome][indice] = { ...cartaDescartada };
          }
        });
      }
      delete estado.aguardandoAcao;
      avancarTurno(estado, sala);
      io.to(sala).emit('estado_jogo', estado);
    }
  });
  socket.on('descartar_carta', ({ sala, jogador, carta }) => {
    const estado = estadoJogo[sala];
    if (!estado || !estado.jogoIniciado) return;
    const idx = estado.players.findIndex(p => p.nome === jogador);
    if (idx !== estado.jogadorDaVez) return;
    if (!estado.aguardandoAcao || estado.aguardandoAcao.jogador !== idx) return;
    // Descarta a carta comprada (não adiciona à mão)
    estado.pilha.push(estado.aguardandoAcao.carta);
    // Memorizar carta descartada para todos bots médios/difíceis
    if (memoriaBots[sala]) {
      Object.keys(memoriaBots[sala]).forEach(bot => {
        if (infoBots[sala]?.dificuldade === 'medio' || infoBots[sala]?.dificuldade === 'dificil') {
          memoriaBots[sala][bot].cartasOponentes[estado.players[idx].nome] = memoriaBots[sala][bot].cartasOponentes[estado.players[idx].nome] || {};
          memoriaBots[sala][bot].cartasOponentes[estado.players[idx].nome]['descartes'] = memoriaBots[sala][bot].cartasOponentes[estado.players[idx].nome]['descartes'] || [];
          memoriaBots[sala][bot].cartasOponentes[estado.players[idx].nome]['descartes'].push({ ...estado.aguardandoAcao.carta });
        }
      });
    }
    delete estado.aguardandoAcao;
    avancarTurno(estado, sala);
    io.to(sala).emit('estado_jogo', estado);
  });
  socket.on('usar_habilidade', async ({ sala, jogador, carta, alvo, indiceAlvo, alvos, indicesAlvo }) => {
    const estado = estadoJogo[sala];
    if (!estado || !estado.jogoIniciado) return;
    const idx = estado.players.findIndex(p => p.nome === jogador);
    if (idx !== estado.jogadorDaVez) return;
    if (!estado.aguardandoAcao || estado.aguardandoAcao.jogador !== idx) return;

    // Sempre use a carta comprada do backend
    const cartaUsada = estado.aguardandoAcao.carta;

    // Habilidade: Sete/Oito permite ver carta própria
    if (cartaUsada.nome === 'Sete' || cartaUsada.nome === 'Oito') {
      if (typeof indicesAlvo !== 'undefined' && Array.isArray(indicesAlvo)) {
        indiceAlvo = indicesAlvo[0];
      }
      if (typeof indiceAlvo !== 'number') {
        socket.emit('escolher_carta_propria', { max: estado.players[idx].mao.length });
        return;
      }
      const cartaVista = estado.players[idx].mao[indiceAlvo];
      socket.emit('carta_revelada', { carta: cartaVista, indice: indiceAlvo });
      estado.pilha.push(cartaUsada);
      avancarTurno(estado, sala);
      io.to(sala).emit('estado_jogo', estado);
      delete estado.aguardandoAcao;
      return;
    }

    // Habilidade: Cinco/Seis permite ver carta de um oponente
    if (cartaUsada.nome === 'Cinco' || cartaUsada.nome === 'Seis') {
      if (typeof alvo !== 'number' || typeof indiceAlvo !== 'number') {
        const oponentes = estado.players.map((p, i) => ({ nome: p.nome, idx: i, qtd: p.mao.length })).filter((p, i) => i !== idx);
        socket.emit('escolher_carta_oponente', { oponentes });
        return;
      }
      const cartaVista = estado.players[alvo].mao[indiceAlvo];
      socket.emit('carta_revelada', { carta: cartaVista, indice: indiceAlvo, oponente: estado.players[alvo].nome });
      // Se for bot médio ou difícil, memoriza carta do oponente
      const botNome = estado.players[idx].nome;
      const salaMem = memoriaBots[sala];
      if (salaMem && salaMem[botNome] && (infoBots[sala]?.dificuldade === 'medio' || infoBots[sala]?.dificuldade === 'dificil')) {
        salaMem[botNome].cartasOponentes[estado.players[alvo].nome] = salaMem[botNome].cartasOponentes[estado.players[alvo].nome] || {};
        salaMem[botNome].cartasOponentes[estado.players[alvo].nome][indiceAlvo] = { ...cartaVista };
      }
      estado.pilha.push(cartaUsada);
      avancarTurno(estado, sala);
      io.to(sala).emit('estado_jogo', estado);
      delete estado.aguardandoAcao;
      return;
    }

    // Habilidade: Nove/Dez permite trocar cartas entre dois jogadores
    if (cartaUsada.nome === 'Nove' || cartaUsada.nome === 'Dez') {
      if (!alvos || !Array.isArray(alvos) || alvos.length !== 2) {
        const jogadoresDisponiveis = estado.players.map((p, i) => ({ nome: p.nome, idx: i, qtd: p.mao.length }));
        socket.emit('escolher_jogadores_troca', { jogadores: jogadoresDisponiveis });
        return;
      }
      if (!indicesAlvo || !Array.isArray(indicesAlvo) || indicesAlvo.length !== 2) {
        for (let i = 0; i < 2; i++) {
          const jogadorAlvo = estado.players[alvos[i]];
          io.to(salas[sala].find(j => j.nome === jogadorAlvo.nome).id).emit('escolher_carta_para_troca', { idx: alvos[i], qtd: jogadorAlvo.mao.length, ordem: i });
        }
        return;
      }
      const idxA = alvos[0];
      const idxB = alvos[1];
      const cartaA = estado.players[idxA].mao[indicesAlvo[0]];
      const cartaB = estado.players[idxB].mao[indicesAlvo[1]];
      estado.players[idxA].mao[indicesAlvo[0]] = cartaB;
      estado.players[idxB].mao[indicesAlvo[1]] = cartaA;
      estado.pilha.push(cartaUsada);
      avancarTurno(estado, sala);
      io.to(sala).emit('estado_jogo', estado);
      delete estado.aguardandoAcao;
      return;
    }

    // Outras habilidades serão implementadas aqui...

    estado.pilha.push(cartaUsada);
    avancarTurno(estado, sala);
    io.to(sala).emit('estado_jogo', estado);
    delete estado.aguardandoAcao;
  });

  socket.on('tentar_descarte', ({ sala, jogador, indice1, indice2 }) => {
    const estado = estadoJogo[sala];
    if (!estado || !estado.jogoIniciado) return;
    const idx = estado.players.findIndex(p => p.nome === jogador);
    if (idx === -1) return;
    const mao = estado.players[idx].mao;
    if (
      typeof indice1 !== 'number' || typeof indice2 !== 'number' ||
      indice1 === indice2 ||
      indice1 < 0 || indice2 < 0 ||
      indice1 >= mao.length || indice2 >= mao.length
    ) return;
    const carta1 = mao[indice1];
    const carta2 = mao[indice2];
    if (carta1 && carta2 && carta1.nome === carta2.nome) {
      // Acertou: remove ambas e coloca na pilha
      // Remover o índice maior primeiro para não bagunçar os índices
      if (indice1 > indice2) {
        mao.splice(indice1, 1);
        mao.splice(indice2, 1);
      } else {
        mao.splice(indice2, 1);
        mao.splice(indice1, 1);
      }
      estado.pilha.push(carta1, carta2);
      io.to(sala).emit('mensagem', { tipo: 'descarte_correto', jogador, carta: carta1.nome });
    } else {
      // Errou: compra 2 cartas se houver
      for (let i = 0; i < 2; i++) {
        if (estado.baralho.length > 0) {
          mao.push(estado.baralho.pop());
        }
      }
      io.to(sala).emit('mensagem', { tipo: 'descarte_errado', jogador });
    }
    io.to(sala).emit('estado_jogo', estado);
  });

  // NOVO: evento para declarar fim de jogo
  socket.on('declarar_fim_de_jogo', ({ sala, jogador }) => {
    const estado = estadoJogo[sala];
    if (!estado || !estado.jogoIniciado) return;
    if (estado.turnoAtual < 5) return; // Só pode declarar a partir do 5º turno
    if (estado.fimDeclarado) return; // Só pode declarar uma vez
    estado.fimDeclarado = true;
    estado.jogadorDeclarouFim = jogador;
    estado.turnosRestantesFim = 2 * estado.players.length; // 2 turnos completos
    io.to(sala).emit('mensagem', { tipo: 'fim_declarado', jogador });
    io.to(sala).emit('estado_jogo', estado);
  });

  socket.on('disconnect', () => {
    for (const sala in salas) {
      salas[sala] = salas[sala].filter(j => j.id !== socket.id);
      io.to(sala).emit('atualizar_jogadores', salas[sala]);
    }
    console.log('Jogador desconectado:', socket.id);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor backend rodando em http://0.0.0.0:${PORT}`);
}); 