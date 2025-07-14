<template>
  <svg :width="width" :height="height" viewBox="0 0 80 120" class="carta-svg">
    <!-- Fundo da carta -->
    <rect x="2" y="2" width="76" height="116" rx="10" :fill="corFundo" stroke="#222" stroke-width="3" />
    <!-- Valor e naipe -->
    <text x="12" y="28" font-size="22" font-weight="bold" :fill="corValor">{{ valor }}</text>
    <text v-if="naipe" x="12" y="48" font-size="20" :fill="corNaipe">{{ simboloNaipe }}</text>
    <!-- Valor e naipe invertido -->
    <text x="68" y="112" font-size="22" font-weight="bold" :fill="corValor" text-anchor="end" transform="rotate(180 68 112)">{{ valor }}</text>
    <text v-if="naipe" x="68" y="92" font-size="20" :fill="corNaipe" text-anchor="end" transform="rotate(180 68 92)">{{ simboloNaipe }}</text>
    <!-- Coringa -->
    <g v-if="!naipe && valor === 'C'">
      <circle cx="40" cy="60" r="18" fill="#f6c177" stroke="#d7263d" stroke-width="3" />
      <text x="40" y="68" font-size="22" font-weight="bold" fill="#d7263d" text-anchor="middle">🃏</text>
    </g>
  </svg>
</template>

<script>
export default {
  name: 'CartaSvg',
  props: {
    valor: { type: String, required: true }, // A, 5, 6, 7, 8, 9, 10, J, Q, K, C
    naipe: { type: String, default: null }, // S, H, D, C ou null
    width: { type: [Number, String], default: 80 },
    height: { type: [Number, String], default: 120 },
  },
  computed: {
    corFundo() {
      if (!this.naipe && this.valor === 'C') return '#fffbe6';
      return '#fff';
    },
    corValor() {
      if (this.naipe === 'H' || this.naipe === 'D') return '#d7263d';
      if (!this.naipe && this.valor === 'C') return '#d7263d';
      return '#232946';
    },
    corNaipe() {
      if (this.naipe === 'H' || this.naipe === 'D') return '#d7263d';
      if (this.naipe === 'S' || this.naipe === 'C') return '#232946';
      return '#232946';
    },
    simboloNaipe() {
      switch (this.naipe) {
        case 'S': return '♠';
        case 'H': return '♥';
        case 'D': return '♦';
        case 'C': return '♣';
        default: return '';
      }
    },
  },
}
</script>

<style scoped>
.carta-svg {
  box-shadow: 0 2px 8px #0005;
  border-radius: 10px;
  background: #fff;
  margin: 0 2px;
}
</style> 