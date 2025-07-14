<template>
  <div class="jogo-page">
    <CunokuGame :num-jogadores="numJogadores" />
  </div>
</template>

<script>
import CunokuGame from '../components/CunokuGame.vue'
export default {
  name: 'JogoPage',
  components: { CunokuGame },
  props: {
    numJogadores: {
      type: Number,
      default: 2
    }
  }
}
</script>

<style scoped>
.jogo-page {
  display: flex;
  justify-content: center;
}
</style> 