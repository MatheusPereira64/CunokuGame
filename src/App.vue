<script setup>
import { ref } from 'vue'
import HomePage from './pages/HomePage.vue'
import JogoPage from './pages/JogoPage.vue'

const pagina = ref('inicio')
const numJogadores = ref(2)

function iniciarJogo(qtd) {
  numJogadores.value = qtd
  pagina.value = 'jogo'
}
</script>

<template>
  <div class="app-layout">
    <nav class="menu">
      <button :class="{ ativo: pagina === 'inicio' }" @click="pagina = 'inicio'">Início</button>
      <button :class="{ ativo: pagina === 'jogo' }" @click="pagina = 'jogo'">Jogar</button>
    </nav>
    <main>
      <HomePage v-if="pagina === 'inicio'" @iniciar-jogo="iniciarJogo" />
      <JogoPage v-else-if="pagina === 'jogo'" :num-jogadores="numJogadores" />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  background: #232946;
}
.menu {
  display: flex;
  gap: 1rem;
  background: #121629;
  padding: 1.2rem 2rem 1.2rem 2rem;
  border-radius: 0 0 16px 16px;
  box-shadow: 0 2px 16px #0005;
  justify-content: center;
}
.menu button {
  background: #232946;
  border: 2px solid #eebbc3;
  color: #eebbc3;
  font-size: 1.15rem;
  padding: 0.7rem 2.2rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  transition: background 0.2s, color 0.2s, border 0.2s;
  margin: 0 0.2rem;
  box-shadow: 0 1px 4px #0003;
}
.menu button.ativo,
.menu button:hover {
  background: #eebbc3;
  color: #232946;
  border-color: #232946;
}
main {
  max-width: 700px;
  margin: 2rem auto;
  background: #232946;
  border-radius: 16px;
  box-shadow: 0 2px 16px #0005;
  padding: 2.5rem 2rem;
}
</style>
