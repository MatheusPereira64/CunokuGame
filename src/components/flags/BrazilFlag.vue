<template>
  <svg 
    :width="width" 
    :height="height" 
    viewBox="0 0 28 20" 
    xmlns="http://www.w3.org/2000/svg"
    class="flag-icon"
  >
    <!-- Background -->
    <rect width="28" height="20" fill="#009739"/>
    <!-- Yellow Diamond -->
    <polygon points="14,2 26,10 14,18 2,10" fill="#FEDD00"/>
    <!-- Blue Circle -->
    <circle cx="14" cy="10" r="3.5" fill="#002776"/>
    <!-- Stars -->
    <g fill="#FFFFFF" font-size="1.5" font-family="serif">
      <text x="14" y="11.5" text-anchor="middle" font-size="1">★</text>
      <text x="12" y="9" text-anchor="middle" font-size="0.8">★</text>
      <text x="16" y="9" text-anchor="middle" font-size="0.8">★</text>
      <text x="11" y="12" text-anchor="middle" font-size="0.7">★</text>
      <text x="17" y="12" text-anchor="middle" font-size="0.7">★</text>
    </g>
  </svg>
</template>

<script setup>
defineProps({
  width: {
    type: [String, Number],
    default: 28
  },
  height: {
    type: [String, Number],
    default: 20
  }
})
</script>

<style scoped>
.flag-icon {
  border-radius: 3px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s ease;
}

.flag-icon:hover {
  transform: scale(1.05);
}
</style>
