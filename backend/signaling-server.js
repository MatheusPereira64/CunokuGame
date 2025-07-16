// Servidor de sinalização WebSocket para WebRTC P2P
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 3001 });
const salas = {};

wss.on('connection', (ws) => {
  let salaId = null;

  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.type === 'join') {
        salaId = data.sala;
        if (!salas[salaId]) salas[salaId] = [];
        if (salas[salaId].length > 8) {
          ws.send(JSON.stringify({ type: 'error', message: 'Sala cheia (máximo 8 jogadores)' }));
          ws.close();
          return;
        }
        salas[salaId].push(ws);
        ws.send(JSON.stringify({ type: 'init', index: salas[salaId].length - 1, total: salas[salaId].length }));
        // Notifica todos os outros peers sobre o novo peer
        salas[salaId].forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'peer-joined', total: salas[salaId].length }));
          }
        });
      } else if (data.type === 'signal' && salaId && salas[salaId]) {
        // Envia sinalização para todos os outros peers
        salas[salaId].forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'signal', from: salas[salaId].indexOf(ws), data: data.data }));
          }
        });
      } else if (data.type === 'listar_lobbys') {
        // Envia a lista de salas disponíveis (menos de 8 jogadores)
        const lobbys = Object.entries(salas)
          .filter(([_, clients]) => clients.length < 8)
          .map(([nome, clients]) => ({ nome, jogadores: clients.length }))
        ws.send(JSON.stringify({ type: 'lobbys_disponiveis', lobbys }))
      }
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', message: 'Mensagem inválida' }));
    }
  });

  ws.on('close', () => {
    if (salaId && salas[salaId]) {
      salas[salaId] = salas[salaId].filter((client) => client !== ws);
      if (salas[salaId].length === 0) delete salas[salaId];
    }
  });
});

console.log('Servidor de sinalização WebSocket rodando na porta 3001'); 