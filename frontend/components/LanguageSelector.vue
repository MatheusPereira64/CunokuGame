<template>
  <div class="language-selector">
    <button 
      @click="changeLanguage('pt')"
      :class="{ active: currentLanguage === 'pt' }"
      class="flag-btn"
      title="Português"
    >
      <BrazilFlag :width="24" :height="18" />
    </button>
    
    <button 
      @click="changeLanguage('en')"
      :class="{ active: currentLanguage === 'en' }"
      class="flag-btn"
      title="English"
    >
      <USAFlag :width="24" :height="18" />
    </button>
  </div>
</template>

<script setup>
import { currentLanguage, setLanguage } from '../i18n/index.js'
import BrazilFlag from './flags/BrazilFlag.vue'
import USAFlag from './flags/USAFlag.vue'

function changeLanguage(lang) {
  setLanguage(lang)
}
</script>

<style scoped>
.language-selector {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.flag-btn {
  background: transparent;
  border: 2px solid transparent;
  border-radius: 8px;
  padding: 0.4rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  min-height: auto;
  margin: 0;
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  background: linear-gradient(145deg, #2A2A2A 0%, #1A1A1A 100%);
}

.flag-btn:hover {
  border-color: var(--primary-gold);
  background: linear-gradient(135deg, #333 0%, #222 100%);
  transform: translateY(-1px) scale(1.05);
  box-shadow: 
    0 4px 16px rgba(212, 175, 55, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

.flag-btn.active {
  border-color: var(--secondary-gold);
  background: linear-gradient(135deg, var(--primary-gold) 0%, var(--secondary-gold) 100%);
  box-shadow: 
    0 4px 16px rgba(212, 175, 55, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.flag-btn.active:hover {
  transform: translateY(-1px) scale(1.05);
  box-shadow: 
    0 6px 20px rgba(212, 175, 55, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
}

.flag-btn:active {
  transform: translateY(0) scale(1.02);
}

/* Override dos estilos de botão global para os botões de bandeira */
.flag-btn {
  font-family: inherit;
  font-size: inherit;
  font-weight: inherit;
  text-transform: none;
  letter-spacing: normal;
  word-spacing: normal;
  line-height: normal;
}
</style>
