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

function criarBaralho() {
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
  const baralho = [];
  for (const carta of VALORES_CARTAS) {
    if (carta.nome === 'Coringa') {
      baralho.push({ ...carta, naipe: null });
      baralho.push({ ...carta, naipe: null });
    } else {
      for (const naipe of NAIPES) {
        baralho.push({ ...carta, naipe });
      }
    }
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

  socket.on('iniciar_jogo', ({ sala }) => {
    // Cria o estado inicial do jogo para a sala
    const jogadores = salas[sala] || [];
    const baralho = criarBaralho();
    const cartasPorJogador = 4;
    const players = jogadores.map(j => ({ nome: j.nome, mao: [] }));
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
    };
    io.to(sala).emit('jogo_iniciado');
    io.to(sala).emit('estado_jogo', estadoJogo[sala]);
  });

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
      delete estado.aguardandoAcao;
      // Avança o turno
      estado.jogadorDaVez = (estado.jogadorDaVez + 1) % estado.players.length;
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
    delete estado.aguardandoAcao;
    // Avança o turno
    estado.jogadorDaVez = (estado.jogadorDaVez + 1) % estado.players.length;
    io.to(sala).emit('estado_jogo', estado);
  });

  socket.on('usar_habilidade', async ({ sala, jogador, carta, alvo, indiceAlvo, alvos, indicesAlvo }) => {
    const estado = estadoJogo[sala];
    if (!estado || !estado.jogoIniciado) return;
    const idx = estado.players.findIndex(p => p.nome === jogador);
    if (idx !== estado.jogadorDaVez) return;
    if (!estado.aguardandoAcao || estado.aguardandoAcao.jogador !== idx) return;

    // Habilidade: Sete/Oito permite ver carta própria
    if (carta.nome === 'Sete' || carta.nome === 'Oito') {
      if (typeof indicesAlvo !== 'undefined' && Array.isArray(indicesAlvo)) {
        // fallback para compatibilidade
        indiceAlvo = indicesAlvo[0];
      }
      if (typeof indiceAlvo !== 'number') {
        socket.emit('escolher_carta_propria', { max: estado.players[idx].mao.length });
        return;
      }
      const cartaVista = estado.players[idx].mao[indiceAlvo];
      socket.emit('carta_revelada', { carta: cartaVista, indice: indiceAlvo });
      estado.pilha.push(carta);
      estado.jogadorDaVez = (estado.jogadorDaVez + 1) % estado.players.length;
      io.to(sala).emit('estado_jogo', estado);
      delete estado.aguardandoAcao;
      return;
    }

    // Habilidade: Cinco/Seis permite ver carta de um oponente
    if (carta.nome === 'Cinco' || carta.nome === 'Seis') {
      if (typeof alvo !== 'number' || typeof indiceAlvo !== 'number') {
        const oponentes = estado.players.map((p, i) => ({ nome: p.nome, idx: i, qtd: p.mao.length })).filter((p, i) => i !== idx);
        socket.emit('escolher_carta_oponente', { oponentes });
        return;
      }
      const cartaVista = estado.players[alvo].mao[indiceAlvo];
      socket.emit('carta_revelada', { carta: cartaVista, indice: indiceAlvo, oponente: estado.players[alvo].nome });
      estado.pilha.push(carta);
      estado.jogadorDaVez = (estado.jogadorDaVez + 1) % estado.players.length;
      io.to(sala).emit('estado_jogo', estado);
      delete estado.aguardandoAcao;
      return;
    }

    // Habilidade: Nove/Dez permite trocar cartas entre dois jogadores
    if (carta.nome === 'Nove' || carta.nome === 'Dez') {
      // Se não vieram os alvos, pedir ao frontend
      if (!alvos || !Array.isArray(alvos) || alvos.length !== 2) {
        // Envia lista de jogadores para escolher dois
        const jogadoresDisponiveis = estado.players.map((p, i) => ({ nome: p.nome, idx: i, qtd: p.mao.length }));
        socket.emit('escolher_jogadores_troca', { jogadores: jogadoresDisponiveis });
        return;
      }
      // Se não vieram os índices das cartas, pedir ao frontend
      if (!indicesAlvo || !Array.isArray(indicesAlvo) || indicesAlvo.length !== 2) {
        // Para cada jogador, pedir para escolher a carta
        for (let i = 0; i < 2; i++) {
          const jogadorAlvo = estado.players[alvos[i]];
          io.to(salas[sala].find(j => j.nome === jogadorAlvo.nome).id).emit('escolher_carta_para_troca', { idx: alvos[i], qtd: jogadorAlvo.mao.length, ordem: i });
        }
        return;
      }
      // Realiza a troca
      const idxA = alvos[0];
      const idxB = alvos[1];
      const cartaA = estado.players[idxA].mao[indicesAlvo[0]];
      const cartaB = estado.players[idxB].mao[indicesAlvo[1]];
      estado.players[idxA].mao[indicesAlvo[0]] = cartaB;
      estado.players[idxB].mao[indicesAlvo[1]] = cartaA;
      estado.pilha.push(carta);
      estado.jogadorDaVez = (estado.jogadorDaVez + 1) % estado.players.length;
      io.to(sala).emit('estado_jogo', estado);
      delete estado.aguardandoAcao;
      return;
    }

    // Outras habilidades serão implementadas aqui...

    estado.pilha.push(carta);
    estado.jogadorDaVez = (estado.jogadorDaVez + 1) % estado.players.length;
    io.to(sala).emit('estado_jogo', estado);
    delete estado.aguardandoAcao;
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