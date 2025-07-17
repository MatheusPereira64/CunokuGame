<template>
  <div class="cunoku-game">
    <div v-if="!estado">
      <p>Aguardando sincronização do jogo...</p>
    </div>
    <div v-else>
      <div>
        <h2>Jogadores</h2>
        <ul>
          <li v-for="(player, idx) in estado.players" :key="idx">
            <b v-if="idx === estado.jogadorDaVez">▶</b>
            {{ player.nome }} - Cartas: {{ player.mao.length }}
            <span v-if="idx === meuIndice">(Você)</span>
          </li>
        </ul>
      </div>
      <div class="baralho-pilha">
        <div>
          <h2>Baralho</h2>
          <p>Cartas restantes: {{ estado.baralho.length }}</p>
        </div>
        <div>
          <h2>Pilha de Descarte</h2>
          <div v-if="estado.pilha.length > 0">
            <CartaSvg :valor="mapValorSvg(estado.pilha[estado.pilha.length-1].nome)" :naipe="mapNaipeSvg(estado.pilha[estado.pilha.length-1].naipe)" :width="60" :height="90" />
            <p class="topo-pilha">Topo: {{ estado.pilha[estado.pilha.length-1].nome }} {{ estado.pilha[estado.pilha.length-1].naipe || '' }}</p>
          </div>
          <div v-else>
            <p>Pilha vazia</p>
          </div>
        </div>
      </div>
      <div>
        <h3>Sua mão</h3>
        <div class="mao">
          <div v-for="(carta, idx) in maoReal" :key="idx" class="carta-btn animate__animated animate__fadeInUp">
            <CartaSvg v-if="cartaEstaRevelada(idx)" :valor="mapValorSvg(carta.nome)" :naipe="mapNaipeSvg(carta.naipe)" :width="60" :height="90" />
            <div v-else class="verso-carta" style="width:60px;height:90px;display:flex;align-items:center;justify-content:center;background:#232946;border-radius:8px;border:2px solid #eebbc3;box-shadow:0 2px 8px #0007;">
              <span style="font-size:2.2rem;color:#eebbc3;">🂠</span>
            </div>
            <button v-if="indiceDescarteTentativa === null" class="btn-descartar-carta" @click="tentarDescarte(idx)">Descartar</button>
          </div>
        </div>
        <!-- Seleção de segunda carta para descarte -->
        <div v-if="indiceDescarteTentativa !== null" class="mensagem-pilha">
          <p>Selecione outra carta que você acredita ter o mesmo valor para descartar junto:</p>
          <div class="mao">
            <button v-for="(carta, idx2) in maoReal" :key="'descartar-'+idx2" v-if="idx2 !== indiceDescarteTentativa" class="carta-btn" @click="confirmarDescarte(idx2)">
              <span style="font-size:2.2rem;color:#eebbc3;">🂠</span>
            </button>
          </div>
          <button class="btn-principal" @click="cancelarDescarte">Cancelar</button>
        </div>
      </div>
      <div v-if="estado.jogadorDaVez === meuIndice">
        <button class="btn-principal" @click="comprarCarta" v-if="!escolhendoAcao && !acaoPendente">Comprar carta</button>
        <!-- Fluxo de escolha de ação ao comprar carta -->
        <div v-if="escolhendoAcao && cartaComprada" class="acao-compra">
          <h4>Você comprou:</h4>
          <CartaSvg :valor="mapValorSvg(cartaComprada.nome)" :naipe="mapNaipeSvg(cartaComprada.naipe)" :width="60" :height="90" />
          <p>Escolha o que fazer:</p>
          <ul>
            <li>
              <button class="btn-acao" @click="indiceSubstituir = indiceSubstituir === null ? 0 : null" :disabled="indiceSubstituir !== null">Substituir uma carta da mão</button>
              <div v-if="indiceSubstituir !== null">
                <span>Selecione a carta da mão para substituir:</span>
                <div class="mao">
                  <button v-for="(carta, idx) in estado.players[meuIndice]?.mao || []" :key="'sub-'+idx" class="carta-btn" @click="substituirCarta(idx)">
                    <div class="verso-carta" style="width:60px;height:90px;display:flex;align-items:center;justify-content:center;">
                      <span style="font-size:2.2rem;color:#eebbc3;">🂠</span>
                    </div>
                  </button>
                </div>
                <button class="btn-principal" @click="indiceSubstituir = null">Cancelar</button>
              </div>
            </li>
            <li>
              <button class="btn-acao" @click="descartarCartaComprada">Descartar carta comprada</button>
            </li>
            <li>
              <button class="btn-acao" @click="usarHabilidade">Usar habilidade da carta</button>
            </li>
          </ul>
        </div>
      </div>
      <div v-else>
        <p>Aguarde sua vez...</p>
      </div>
    </div>
    <div v-if="escolhendoCartaPropria">
      <div class="habilidade-msg">
        <p>Escolha uma carta da sua mão para ver:</p>
        <div class="mao">
          <button v-for="(carta, idx) in estado.players[meuIndice]?.mao || []" :key="'ver-'+idx" class="carta-btn" @click="escolherCartaPropria(idx)">
            <CartaSvg :valor="mapValorSvg(carta.nome)" :naipe="mapNaipeSvg(carta.naipe)" :width="60" :height="90" />
          </button>
        </div>
      </div>
    </div>
    <div v-if="escolhendoCartaOponente">
      <div class="habilidade-msg">
        <p>Escolha um oponente para ver uma carta:</p>
        <ul>
          <li v-for="op in oponentesDisponiveis" :key="op.idx">
            <button class="btn-acao" @click="escolherCartaOponente(op.idx)">{{ op.nome }} ({{ op.qtd }} cartas)</button>
          </li>
        </ul>
        <div v-if="oponenteSelecionado !== null">
          <p>Escolha a carta do oponente {{ oponentesDisponiveis.find(o=>o.idx===oponenteSelecionado)?.nome }}:</p>
          <div class="mao">
            <button v-for="i in oponentesDisponiveis.find(o=>o.idx===oponenteSelecionado)?.qtd || 0" :key="'op-carta-'+i" class="carta-btn" @click="escolherCartaDoOponente(i-1)">
              <span>Carta {{ i }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    <div v-if="cartaRevelada" class="habilidade-msg">
      <p v-if="cartaRevelada.oponente">Você viu a carta do oponente {{ cartaRevelada.oponente }}: {{ cartaRevelada.carta.nome }} {{ cartaRevelada.carta.naipe || '' }}</p>
      <p v-else>Carta revelada: {{ cartaRevelada.carta.nome }} {{ cartaRevelada.carta.naipe || '' }}</p>
      <CartaSvg :valor="mapValorSvg(cartaRevelada.carta.nome)" :naipe="mapNaipeSvg(cartaRevelada.carta.naipe)" :width="60" :height="90" />
    </div>
    <div v-if="escolhendoJogadoresTroca">
      <div class="habilidade-msg">
        <p>Escolha dois jogadores para trocar cartas:</p>
        <ul>
          <li v-for="j in jogadoresDisponiveisTroca" :key="j.idx">
            <button class="btn-acao" :disabled="jogadoresSelecionadosTroca.includes(j.idx)" @click="escolherJogadorTroca(j.idx)">{{ j.nome }} ({{ j.qtd }} cartas)</button>
          </li>
        </ul>
        <div v-if="jogadoresSelecionadosTroca.length === 2">
          <button class="btn-principal" @click="confirmarJogadoresTroca">Confirmar troca</button>
        </div>
      </div>
    </div>
    <div v-if="aguardandoEscolhaTroca">
      <div class="habilidade-msg">
        <p>Escolha a carta para trocar:</p>
        <div class="mao">
          <button v-for="i in qtdCartasTroca" :key="'troca-carta-'+i" class="carta-btn" @click="escolherCartaParaTroca(i-1)">
            <span>Carta {{ i }}</span>
          </button>
        </div>
      </div>
    </div>
    <div v-if="mensagemStatus" class="mensagem-pilha">{{ mensagemStatus }}</div>
    <div v-if="fimDeJogo && resultadoFinal">
      <h2>Fim de Jogo!</h2>
      <div>
        <h3>Cartas de todos os jogadores:</h3>
        <ul>
          <li v-for="(player, idx) in estado.players" :key="idx">
            <b>{{ player.nome }}</b>:
            <span v-for="(carta, cidx) in player.mao" :key="cidx">
              {{ carta.nome }}{{ carta.naipe ? ' ' + carta.naipe : '' }}
            </span>
            <span> | Soma: {{ resultadoFinal.somas.find(s => s.nome === player.nome)?.soma }}</span>
            <span v-if="resultadoFinal.vencedores.includes(player.nome)" style="color:#ffe082;font-weight:bold;"> ← Vencedor</span>
          </li>
        </ul>
      </div>
      <div>
        <h3>Vencedor{{ resultadoFinal.vencedores.length > 1 ? 'es' : '' }}:</h3>
        <ul>
          <li v-for="v in resultadoFinal.vencedores" :key="v">🏆 {{ v }}</li>
        </ul>
      </div>
    </div>
    <div v-else>
      <div v-if="estado && estado.turnoAtual >= 5 && !estado.fimDeclarado">
        <button class="btn-principal" @click="declararFimDeJogo">Declarar fim de jogo</button>
      </div>
      <div v-if="estado && estado.fimDeclarado && estado.turnosRestantesFim !== null">
        <div class="mensagem-pilha">Fim de jogo declarado! Restam {{ estado.turnosRestantesFim }} turnos até o final.</div>
      </div>
    </div>
  </div>
</template>

<script>
import CartaSvg from './CartaSvg.vue'
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

function criarBaralho() {
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

export default {
  name: 'CunokuGame',
  props: {
    numJogadores: { type: Number, default: 2 },
    jogador: { type: Object, default: null },
    socket: { type: Object, default: null },
    sala: { type: String, default: '' },
  },
  data() {
    return {
      estado: null,
      meuIndice: null,
      cartaComprada: null, // Nova carta comprada
      escolhendoAcao: false, // Se está escolhendo o que fazer com a carta
      indiceSubstituir: null, // Índice da carta a substituir
      escolhendoCartaPropria: false, // Se está escolhendo carta para ver
      maxCartasProprias: 0, // Quantidade de cartas na mão
      cartaRevelada: null, // Carta revelada pela habilidade
      escolhendoCartaOponente: false, // Se está escolhendo carta de oponente
      oponentesDisponiveis: [], // Lista de oponentes para escolher
      oponenteSelecionado: null, // Índice do oponente selecionado
      escolhendoJogadoresTroca: false, // Se está escolhendo jogadores para troca
      jogadoresDisponiveisTroca: [], // Lista de jogadores para troca
      jogadoresSelecionadosTroca: [], // Índices dos jogadores selecionados
      aguardandoEscolhaTroca: false, // Se está aguardando escolher carta para troca
      ordemTroca: null, // 0 ou 1, ordem da escolha da carta para troca
      qtdCartasTroca: 0, // Quantidade de cartas do jogador para troca
      // NOVO: controle de cartas reveladas temporariamente
      cartasReveladas: [], // [{idx: 0, carta: {...}}]
      indiceDescarteTentativa: null, // NOVO: controle de descarte a qualquer momento
      mensagemStatus: '', // NOVO: mensagem de status
      fimDeJogo: false, // NOVO: controle de fim de jogo
      resultadoFinal: null, // NOVO: resultado do fim de jogo
    }
  },
  computed: {
    maoReal() {
      // Mostra a mão real do backend, sem incluir carta comprada pendente
      if (!this.estado || this.meuIndice === null) return [];
      return this.estado.players[this.meuIndice]?.mao || [];
    },
    acaoPendente() {
      // Retorna true se há ação pendente para o jogador da vez
      return this.estado && this.estado.aguardandoAcao && this.estado.aguardandoAcao.jogador === this.meuIndice;
    },
  },
  watch: {
    socket: {
      immediate: true,
      handler(s) {
        if (s) {
          s.on('estado_jogo', (estado) => {
            // Detecta ação pendente para o jogador local
            if (estado && estado.aguardandoAcao && this.meuIndice !== null && estado.aguardandoAcao.jogador === this.meuIndice) {
              this.cartaComprada = estado.aguardandoAcao.carta;
              this.escolhendoAcao = true;
            } else {
              this.cartaComprada = null;
              this.escolhendoAcao = false;
            }
            this.estado = estado;
            // Descobre o índice do jogador local
            if (this.jogador && estado && estado.players) {
              this.meuIndice = estado.players.findIndex(p => p.nome === this.jogador.nome)
            }
          })
          s.on('escolher_carta_propria', ({ max }) => {
            this.escolhendoCartaPropria = true;
            this.maxCartasProprias = max;
          });
          s.on('carta_revelada', ({ carta, indice, oponente }) => {
            this.cartaRevelada = { carta, indice, oponente };
            // NOVO: Revela a carta temporariamente na mão
            if (typeof oponente === 'undefined') {
              // Revela carta da própria mão
              this.cartasReveladas.push({ idx: indice, carta });
              setTimeout(() => {
                this.cartasReveladas = this.cartasReveladas.filter(c => c.idx !== indice);
              }, 4000);
            }
            setTimeout(() => { this.cartaRevelada = null; }, 4000);
            this.escolhendoCartaPropria = false;
            this.escolhendoCartaOponente = false;
            this.oponenteSelecionado = null;
          });
          s.on('escolher_carta_oponente', ({ oponentes }) => {
            this.escolhendoCartaOponente = true;
            this.oponentesDisponiveis = oponentes;
            this.oponenteSelecionado = null;
          });
          s.on('escolher_jogadores_troca', ({ jogadores }) => {
            this.escolhendoJogadoresTroca = true;
            this.jogadoresDisponiveisTroca = jogadores;
            this.jogadoresSelecionadosTroca = [];
          });
          s.on('escolher_carta_para_troca', ({ idx, qtd, ordem }) => {
            this.aguardandoEscolhaTroca = true;
            this.ordemTroca = ordem;
            this.qtdCartasTroca = qtd;
          });
          s.on('mensagem', (msg) => {
            if (msg.tipo === 'fim_declarado') {
              this.mensagemStatus = `Fim de jogo declarado por ${msg.jogador}. O jogo terminará em 2 turnos completos!`;
            } else if (msg.tipo === 'descarte_correto') {
              this.mensagemStatus = `${msg.jogador} descartou duas cartas de valor ${msg.carta}!`;
            } else if (msg.tipo === 'descarte_errado') {
              this.mensagemStatus = `${msg.jogador} errou o descarte e comprou 2 cartas!`;
            }
            setTimeout(() => { this.mensagemStatus = ''; }, 4000);
          });
          s.on('fim_de_jogo', (resultado) => {
            this.fimDeJogo = true;
            this.resultadoFinal = resultado;
          });
        }
      }
    }
  },
  components: { CartaSvg },
  methods: {
    // Exemplo: enviar ação para o backend
    comprarCarta() {
      if (this.socket && this.estado && this.estado.jogadorDaVez === this.meuIndice) {
        this.socket.emit('comprar_carta', { sala: this.sala, jogador: this.jogador.nome })
        // Espera o backend responder com o novo estado para mostrar a carta comprada
        // A lógica de mostrar a carta será feita no handler do estado_jogo
      }
    },
    substituirCarta(idx) {
      // Envia para o backend qual carta da mão será substituída pela carta comprada
      if (this.socket && this.cartaComprada && this.estado && this.indiceSubstituir !== null) {
        // Salva a carta que será descartada para mostrar na mensagem
        const cartaDescartada = this.estado.players[this.meuIndice]?.mao[idx];
        this.socket.emit('substituir_carta', {
          sala: this.sala,
          jogador: this.jogador.nome,
          indice: idx,
          carta: this.cartaComprada
        })
        this.escolhendoAcao = false;
        this.indiceSubstituir = null;
        // Mensagem temporária para o jogador
        this.mensagemStatus = `Você descartou a carta ${cartaDescartada?.nome || '?'}${cartaDescartada?.naipe ? ' ' + cartaDescartada.naipe : ''} e comprou a carta ${this.cartaComprada?.nome || '?'}${this.cartaComprada?.naipe ? ' ' + this.cartaComprada.naipe : ''}`;
        setTimeout(() => { this.mensagemStatus = ''; }, 4000);
        this.cartaComprada = null;
      }
    },
    descartarCartaComprada() {
      // Envia para o backend o pedido de descarte da carta comprada
      if (this.socket && this.cartaComprada && this.estado) {
        this.socket.emit('descartar_carta', {
          sala: this.sala,
          jogador: this.jogador.nome,
          carta: this.cartaComprada
        })
        this.escolhendoAcao = false;
        this.cartaComprada = null;
        this.indiceSubstituir = null;
      }
    },
    usarHabilidade() {
      // Envia para o backend o pedido de usar a habilidade da carta comprada
      if (this.socket && this.cartaComprada && this.estado) {
        this.socket.emit('usar_habilidade', {
          sala: this.sala,
          jogador: this.jogador.nome,
          carta: this.cartaComprada
        })
        this.escolhendoAcao = false;
        this.cartaComprada = null;
        this.indiceSubstituir = null;
      }
    },
    escolherCartaPropria(idx) {
      // Envia para o backend o índice da carta da própria mão que o jogador quer ver
      this.socket.emit('usar_habilidade', {
        sala: this.sala,
        jogador: this.jogador.nome,
        carta: this.cartaComprada,
        indiceAlvo: idx
      });
      this.escolhendoCartaPropria = false;
    },
    escolherCartaOponente(idxOponente) {
      this.oponenteSelecionado = idxOponente;
    },
    escolherCartaDoOponente(idxCarta) {
      this.socket.emit('usar_habilidade', {
        sala: this.sala,
        jogador: this.jogador.nome,
        carta: this.cartaComprada,
        alvo: this.oponenteSelecionado,
        indiceAlvo: idxCarta
      });
      this.escolhendoCartaOponente = false;
      this.oponenteSelecionado = null;
    },
    escolherJogadorTroca(idxJogador) {
      if (!this.jogadoresSelecionadosTroca.includes(idxJogador) && this.jogadoresSelecionadosTroca.length < 2) {
        this.jogadoresSelecionadosTroca.push(idxJogador);
      }
    },
    confirmarJogadoresTroca() {
      this.socket.emit('usar_habilidade', {
        sala: this.sala,
        jogador: this.jogador.nome,
        carta: this.cartaComprada,
        alvos: this.jogadoresSelecionadosTroca
      });
      this.escolhendoJogadoresTroca = false;
    },
    escolherCartaParaTroca(idxCarta) {
      // Envia para o backend o índice da carta escolhida para troca
      this.socket.emit('usar_habilidade', {
        sala: this.sala,
        jogador: this.jogador.nome,
        carta: this.cartaComprada,
        indicesAlvo: [idxCarta]
      });
      this.aguardandoEscolhaTroca = false;
      this.ordemTroca = null;
      this.qtdCartasTroca = 0;
    },
    // NOVO: tentativa de descarte a qualquer momento
    tentarDescarte(idx) {
      // Abre seleção de segunda carta para comparar
      this.indiceDescarteTentativa = idx;
    },
    confirmarDescarte(idx2) {
      // Envia para o backend a tentativa de descarte
      if (this.socket && this.estado) {
        this.socket.emit('tentar_descarte', {
          sala: this.sala,
          jogador: this.jogador.nome,
          indice1: this.indiceDescarteTentativa,
          indice2: idx2
        });
        this.indiceDescarteTentativa = null;
      }
    },
    cancelarDescarte() {
      this.indiceDescarteTentativa = null;
    },
    declararFimDeJogo() {
      if (this.socket && this.estado && !this.estado.fimDeclarado && this.estado.turnoAtual >= 5) {
        this.socket.emit('declarar_fim_de_jogo', {
          sala: this.sala,
          jogador: this.jogador.nome
        });
      }
    },
    // Adapte outros métodos para enviar eventos ao backend
    mapValorSvg(nome) {
      switch (nome) {
        case 'Às': return 'A';
        case 'Cinco': return '5';
        case 'Seis': return '6';
        case 'Sete': return '7';
        case 'Oito': return '8';
        case 'Nove': return '9';
        case 'Dez': return '10';
        case 'Valete': return 'J';
        case 'Rainha': return 'Q';
        case 'Rei': return 'K';
        case 'Coringa': return 'C';
        default: return '?';
      }
    },
    mapNaipeSvg(naipe) {
      switch (naipe) {
        case '♠': return 'S';
        case '♥': return 'H';
        case '♦': return 'D';
        case '♣': return 'C';
        default: return null;
      }
    },
    // NOVO: verifica se a carta está revelada
    cartaEstaRevelada(idx) {
      return this.cartasReveladas.some(c => c.idx === idx);
    },
  },
};
</script>

<style scoped>
.cunoku-game {
  margin: 0 auto;
  background: #232946;
  border-radius: 12px;
  padding: 28px;
  box-shadow: 0 2px 16px #0005;
  color: #f4f4f4;
  max-width: 600px;
}
h2, h3 {
  color: #eebbc3;
}
ul {
  color: #eebbc3;
}
.mao {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.carta {
  background: #121629;
  border: 2px solid #eebbc3;
  border-radius: 8px;
  padding: 0.7rem 1.2rem;
  font-size: 1.1rem;
  color: #eebbc3;
  cursor: pointer;
  min-width: 60px;
  box-shadow: 0 2px 8px #0007;
  transition: background 0.2s, border 0.2s, color 0.2s;
}
.carta:hover, .btn-acao:hover {
  background: #eebbc3;
  color: #232946;
  border-color: #232946;
}
.carta-espia {
  background: #f6c177 !important;
  color: #232946 !important;
  border-color: #f6c177 !important;
}
.carta-comprada {
  color: #f6c177;
  font-size: 1.2rem;
}
.btn-principal {
  background: #eebbc3;
  color: #232946;
  border: none;
  border-radius: 6px;
  padding: 0.6rem 1.4rem;
  font-size: 1.1rem;
  margin: 0.2rem 0.5rem 0.2rem 0;
  cursor: pointer;
  font-weight: bold;
  box-shadow: 0 1px 4px #0003;
  transition: background 0.2s, color 0.2s;
}
.btn-principal:hover {
  background: #f6c177;
  color: #232946;
}
.btn-descartar {
  background: #f25042;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.6rem 1.4rem;
  font-size: 1.1rem;
  margin: 0.2rem 0.5rem 0.2rem 0;
  cursor: pointer;
  font-weight: bold;
  box-shadow: 0 1px 4px #0003;
  transition: background 0.2s, color 0.2s;
}
.btn-descartar:hover {
  background: #d7263d;
  color: #fff;
}
.btn-acao {
  background: #232946;
  color: #eebbc3;
  border: 2px solid #eebbc3;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-size: 1rem;
  cursor: pointer;
  min-width: 60px;
  margin: 0.1rem 0.2rem;
  box-shadow: 0 1px 4px #0003;
  transition: background 0.2s, color 0.2s, border 0.2s;
}
.btn-acao:active, .btn-acao:focus {
  background: #eebbc3;
  color: #232946;
  border-color: #232946;
}
.habilidade-msg {
  background: #f6c177;
  color: #232946;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  margin: 0.5rem 0 1rem 0;
  font-weight: bold;
  box-shadow: 0 1px 4px #0002;
}
.carta-btn {
  background: none;
  border: none;
  padding: 0;
  margin: 0 2px;
  box-shadow: none;
  cursor: pointer;
}
.carta-btn:focus {
  outline: 2px solid #f6c177;
}
.baralho-pilha {
  display: flex;
  gap: 2.5rem;
  margin-bottom: 1.5rem;
}
.topo-pilha {
  color: #f6c177;
  font-weight: bold;
  margin-top: 0.3rem;
}
.btn-descartar-carta {
  display: block;
  margin: 0.3rem auto 0 auto;
  background: #f25042;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.2rem 0.7rem;
  font-size: 0.95rem;
  cursor: pointer;
  font-weight: bold;
  box-shadow: 0 1px 4px #0003;
  transition: background 0.2s, color 0.2s;
}
.btn-descartar-carta:hover {
  background: #d7263d;
  color: #fff;
}
.mensagem-pilha {
  margin-top: 1.2rem;
  background: #f6c177;
  color: #232946;
  border-radius: 8px;
  padding: 0.7rem 1.2rem;
  font-weight: bold;
  text-align: center;
  box-shadow: 0 1px 8px #0002;
}
.verso-carta {
  background: #232946;
  border-radius: 8px;
  border: 2px solid #eebbc3;
  box-shadow: 0 2px 8px #0007;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 90px;
}
</style> 