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
    };
    io.to(sala).emit('jogo_iniciado');
    io.to(sala).emit('estado_jogo', estadoJogo[sala]);
  });

  socket.on('comprar_carta', ({ sala, jogador }) => {
    const estado = estadoJogo[sala];
    if (!estado || !estado.jogoIniciado) return;
    // Só o jogador da vez pode comprar
    const idx = estado.players.findIndex(p => p.nome === jogador);
    if (idx !== estado.jogadorDaVez) return;
    if (estado.baralho.length === 0) return;
    const cartaComprada = estado.baralho.pop();
    estado.players[idx].mao.push(cartaComprada);
    // Avança o turno
    estado.jogadorDaVez = (estado.jogadorDaVez + 1) % estado.players.length;
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