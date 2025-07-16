<template>
  <div class="home-page">
    <h1>Bem-vindo ao Cunoku 🔥</h1>
    <p>Jogo de cartas com poderes e estratégia. Clique em Jogar para começar!</p>
    <h2>Regras Básicas</h2>
    <ul>
      <li><b>Rainha</b>: 12 pontos</li>
      <li><b>Às</b>: 1 ponto</li>
      <li><b>Valete</b>: 11 pontos</li>
      <li><b>Rei</b>: 0 pontos</li>
      <li><b>Coringa</b>: -1 ponto</li>
      <li><b>9/10</b>: Troca de cartas entre jogadores</li>
      <li><b>7/8</b>: Veja uma carta sua</li>
      <li><b>5/6</b>: Veja uma carta de um oponente</li>
      <li><b>Descarte</b>: Jogadores podem descartar cartas iguais</li>
      <li><b>Compra</b>: Compre, veja e use o poder ou troque</li>
      <li><b>Final</b>: Declare fim, todos revelam e somam pontos</li>
      <li><b>Punição</b>: Descarte errado, compre 2 cartas</li>
    </ul>
    <div class="inicio-jogo">
      <button v-if="!mostrarSelecao" class="btn-principal animate__animated animate__fadeInUp" @click="mostrarSelecao = true">Começar</button>
      <div v-else class="selecao-jogadores animate__animated animate__fadeIn">
        <label for="nomeJogador">Seu nome:</label>
        <input id="nomeJogador" v-model="nomeJogador" placeholder="Digite seu nome" />
        <label for="sala">Sala:</label>
        <input id="sala" v-model="sala" placeholder="Nome da sala" />
        <label for="numJogadores">Número de jogadores:</label>
        <select id="numJogadores" v-model.number="numJogadores">
          <option v-for="n in 7" :key="n" :value="n+1">{{ n+1 }}</option>
        </select>
        <button class="btn-principal" @click="entrarSala">Iniciar Jogo</button>
        <div v-if="erroSala" class="erro-sala">{{ erroSala }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import { io } from 'socket.io-client'
let socket
export default {
  name: 'HomePage',
  data() {
    return {
      mostrarSelecao: false,
      numJogadores: 2,
      nomeJogador: '',
      sala: '',
      erroSala: '',
    }
  },
  methods: {
    entrarSala() {
      this.erroSala = ''
      if (!this.nomeJogador || !this.sala) {
        this.erroSala = 'Preencha seu nome e o nome da sala.'
        return
      }
      if (!socket) {
        socket = io('http://192.168.0.12:3000')
      }
      socket.emit('entrar_sala', { nome: this.nomeJogador, sala: this.sala })
      socket.on('sala_cheia', () => {
        this.erroSala = 'Sala cheia! Escolha outra.'
      })
      socket.on('entrou_sala', ({ sala, nome }) => {
        this.$emit('iniciar-jogo', {
          qtd: this.numJogadores,
          jogadorInfo: { nome },
          salaInfo: sala,
          socketInstance: socket
        })
        // Aqui você pode salvar o socket e dados do jogador para o JogoPage
      })
    },
    confirmarJogadores() {
      this.$emit('iniciar-jogo', this.numJogadores)
    }
  }
}
</script>

<style scoped>
.home-page {
  text-align: center;
  color: #eebbc3;
}
.home-page h1, .home-page h2 {
  color: #f6c177;
}
.home-page ul {
  text-align: left;
  max-width: 400px;
  margin: 1rem auto;
  background: #121629;
  border-radius: 12px;
  padding: 1.2rem 2rem;
  box-shadow: 0 1px 8px #0005;
  color: #eebbc3;
  border: 2px solid #eebbc3;
}
.home-page li b {
  color: #f6c177;
}
.inicio-jogo {
  margin-top: 2.5rem;
}
.selecao-jogadores {
  margin-top: 1.2rem;
  background: #232946;
  border-radius: 10px;
  padding: 1.2rem 2rem;
  display: inline-block;
  border: 2px solid #eebbc3;
}
label {
  color: #f6c177;
  font-weight: bold;
  margin-right: 0.7rem;
}
select, input {
  background: #121629;
  color: #eebbc3;
  border: 2px solid #eebbc3;
  border-radius: 6px;
  padding: 0.3rem 1rem;
  font-size: 1.1rem;
  margin-right: 1rem;
}
.erro-sala {
  color: #f25042;
  margin-top: 0.7rem;
  font-weight: bold;
}
</style> 