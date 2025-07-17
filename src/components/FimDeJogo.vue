<template>
  <div class="fimdejogo-container">
    <h2>Fim de Jogo!</h2>
    <div class="resultados-area">
      <h3>Cartas de todos os jogadores:</h3>
      <ul>
        <li v-for="(player, idx) in resultado?.jogadores || []" :key="idx">
          <b>{{ player.nome }}</b>:
          <span v-for="(carta, cidx) in player.mao" :key="cidx">
            {{ carta.nome }}{{ carta.naipe ? ' ' + carta.naipe : '' }}
          </span>
          <span> | Soma: {{ resultado?.somas?.find(s => s.nome === player.nome)?.soma }}</span>
          <span v-if="resultado?.vencedores?.includes(player.nome)" style="color:#ffe082;font-weight:bold;"> ← Vencedor</span>
        </li>
      </ul>
    </div>
    <div class="somas-area">
      <h3>Soma das cartas dos jogadores:</h3>
      <ul>
        <li v-for="s in resultado?.somas || []" :key="s.nome">
          <b>{{ s.nome }}:</b> {{ s.soma }}
        </li>
      </ul>
    </div>
    <div class="vencedores-area">
      <h3>Vencedor{{ resultado?.vencedores?.length > 1 ? 'es' : '' }}:</h3>
      <ul>
        <li v-for="v in resultado?.vencedores || []" :key="v">🏆 {{ v }}</li>
      </ul>
    </div>
    <div class="ranking-area">
      <h3>Ranking:</h3>
      <ul>
        <li v-for="(item, idx) in ranking" :key="item.nome">
          <span v-if="item.medalha">{{ item.medalha }} </span>
          <b>{{ item.nome }}</b>: {{ item.soma }} pontos
        </li>
      </ul>
    </div>
    <button class="btn-principal" @click="$emit('voltar-inicio')">Voltar ao Início</button>
  </div>
</template>

<script setup>
const props = defineProps({
  resultado: Object
})

// Gera ranking ordenado por soma crescente, com medalhas para os 3 primeiros (empates inclusos)
import { computed } from 'vue'
const ranking = computed(() => {
  if (!props.resultado?.somas) return [];
  // Ordena por soma crescente
  const ordenado = [...props.resultado.somas].sort((a, b) => a.soma - b.soma);
  // Atribui medalhas considerando empates
  let medalhas = ['🥇', '🥈', '🥉'];
  let ranking = [];
  let pos = 0;
  let lastSoma = null;
  let medalhaIdx = 0;
  for (let i = 0; i < ordenado.length; i++) {
    const s = ordenado[i];
    if (lastSoma === null || s.soma !== lastSoma) {
      pos = i;
      medalhaIdx = pos;
    }
    let medalha = medalhaIdx < 3 ? medalhas[medalhaIdx] : null;
    ranking.push({ ...s, medalha });
    lastSoma = s.soma;
  }
  return ranking;
});
</script>

<style scoped>
.fimdejogo-container {
  background: linear-gradient(135deg, #14532d 80%, #0a1a0a 100%);
  border-radius: 18px;
  box-shadow: 0 4px 32px #0008, 0 0 0 4px #d4af37;
  border: 2px solid #d4af37;
  padding: 40px 32px;
  min-height: 400px;
  max-width: 600px;
  margin: 60px auto 0 auto;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #eebbc3;
}
.resultados-area, .vencedores-area {
  width: 100%;
  margin-bottom: 2rem;
}
h2, h3 {
  color: #eebbc3;
  text-align: center;
}
ul {
  color: #eebbc3;
  list-style: none;
  padding: 0;
  margin: 0;
}
.btn-principal {
  background: #eebbc3;
  color: #232946;
  border: none;
  border-radius: 8px;
  padding: 0.8rem 2rem;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  margin-top: 2rem;
  box-shadow: 0 1px 4px #0003;
  transition: background 0.2s, color 0.2s;
}
.btn-principal:hover {
  background: #ffe082;
  color: #232946;
}
.somas-area {
  width: 100%;
  margin-bottom: 2rem;
  background: #232946;
  border-radius: 10px;
  padding: 1rem 1.5rem;
  box-shadow: 0 1px 8px #0005;
  color: #ffe082;
}
.somas-area ul {
  color: #ffe082;
  font-size: 1.15rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.somas-area li {
  margin-bottom: 0.5rem;
}
.ranking-area {
  width: 100%;
  margin-bottom: 2rem;
  background: #232946;
  border-radius: 10px;
  padding: 1rem 1.5rem;
  box-shadow: 0 1px 8px #0005;
  color: #ffe082;
}
.ranking-area ul {
  color: #ffe082;
  font-size: 1.18rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.ranking-area li {
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
</style> 