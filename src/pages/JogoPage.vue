<template>
  <div class="jogo-container">
    <div class="info-jogador">
      <span>Você é: <b>{{ nomeJogador }}</b></span>
    </div>
    <div v-if="meuTurno" class="turno-msg">
      <span>É o seu turno, <b>{{ nomeJogador }}</b>!</span>
    </div>
    <div v-else class="turno-msg">
      <span>Aguarde sua vez...</span>
    </div>
    <CunokuGame />
    <!-- Resto do jogo -->
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import CunokuGame from '../components/CunokuGame.vue'
const props = defineProps({
  numJogadores: Number,
  jogador: Object,
  sala: String,
  socket: Object,
  nomeJogador: String
})

// Exemplo de controle de turno (ajuste conforme sua lógica real)
const turnoAtual = ref(0)
const meuTurno = computed(() => props.jogador && props.jogador.indice === turnoAtual.value)

// Exemplo: definir o índice do jogador (ajuste conforme sua lógica de peers)
watch(() => props.jogador, (novo) => {
  if (novo && typeof novo.indice === 'number') {
    // já tem índice
  } else {
    // atribuir índice se necessário
  }
})
</script>

<style scoped>
.jogo-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}
.info-jogador {
  font-size: 1.2rem;
  color: #eebbc3;
  margin-bottom: 1rem;
}
.turno-msg {
  font-size: 1.4rem;
  color: #ffe082;
  background: #232946;
  padding: 1rem 2rem;
  border-radius: 12px;
  border: 2px solid #d4af37;
  box-shadow: 0 2px 8px #0007;
  margin-bottom: 1.5rem;
}
</style> 