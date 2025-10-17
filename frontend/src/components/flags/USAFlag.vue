<template>
  <svg 
    :width="width" 
    :height="height" 
    viewBox="0 0 28 20" 
    xmlns="http://www.w3.org/2000/svg"
    class="flag-icon"
  >
    <!-- Red stripes -->
    <rect width="28" height="20" fill="#B22234"/>
    
    <!-- White stripes -->
    <rect width="28" height="1.54" y="1.54" fill="#FFFFFF"/>
    <rect width="28" height="1.54" y="4.62" fill="#FFFFFF"/>
    <rect width="28" height="1.54" y="7.69" fill="#FFFFFF"/>
    <rect width="28" height="1.54" y="10.77" fill="#FFFFFF"/>
    <rect width="28" height="1.54" y="13.85" fill="#FFFFFF"/>
    <rect width="28" height="1.54" y="16.92" fill="#FFFFFF"/>
    <rect width="28" height="1.54" y="20" fill="#FFFFFF"/>
    
    <!-- Blue canton -->
    <rect width="11.2" height="10" fill="#3C3B6E"/>
    
    <!-- Stars (simplified) -->
    <g fill="#FFFFFF" font-size="0.8" font-family="serif">
      <!-- 5 rows of stars -->
      <text x="1.4" y="1.5" text-anchor="middle">★</text>
      <text x="3.2" y="1.5" text-anchor="middle">★</text>
      <text x="5.0" y="1.5" text-anchor="middle">★</text>
      <text x="6.8" y="1.5" text-anchor="middle">★</text>
      <text x="8.6" y="1.5" text-anchor="middle">★</text>
      <text x="10.4" y="1.5" text-anchor="middle">★</text>
      
      <text x="2.3" y="2.8" text-anchor="middle">★</text>
      <text x="4.1" y="2.8" text-anchor="middle">★</text>
      <text x="5.9" y="2.8" text-anchor="middle">★</text>
      <text x="7.7" y="2.8" text-anchor="middle">★</text>
      <text x="9.5" y="2.8" text-anchor="middle">★</text>
      
      <text x="1.4" y="4.1" text-anchor="middle">★</text>
      <text x="3.2" y="4.1" text-anchor="middle">★</text>
      <text x="5.0" y="4.1" text-anchor="middle">★</text>
      <text x="6.8" y="4.1" text-anchor="middle">★</text>
      <text x="8.6" y="4.1" text-anchor="middle">★</text>
      <text x="10.4" y="4.1" text-anchor="middle">★</text>
      
      <text x="2.3" y="5.4" text-anchor="middle">★</text>
      <text x="4.1" y="5.4" text-anchor="middle">★</text>
      <text x="5.9" y="5.4" text-anchor="middle">★</text>
      <text x="7.7" y="5.4" text-anchor="middle">★</text>
      <text x="9.5" y="5.4" text-anchor="middle">★</text>
      
      <text x="1.4" y="6.7" text-anchor="middle">★</text>
      <text x="3.2" y="6.7" text-anchor="middle">★</text>
      <text x="5.0" y="6.7" text-anchor="middle">★</text>
      <text x="6.8" y="6.7" text-anchor="middle">★</text>
      <text x="8.6" y="6.7" text-anchor="middle">★</text>
      <text x="10.4" y="6.7" text-anchor="middle">★</text>
      
      <text x="2.3" y="8.0" text-anchor="middle">★</text>
      <text x="4.1" y="8.0" text-anchor="middle">★</text>
      <text x="5.9" y="8.0" text-anchor="middle">★</text>
      <text x="7.7" y="8.0" text-anchor="middle">★</text>
      <text x="9.5" y="8.0" text-anchor="middle">★</text>
      
      <text x="1.4" y="9.3" text-anchor="middle">★</text>
      <text x="3.2" y="9.3" text-anchor="middle">★</text>
      <text x="5.0" y="9.3" text-anchor="middle">★</text>
      <text x="6.8" y="9.3" text-anchor="middle">★</text>
      <text x="8.6" y="9.3" text-anchor="middle">★</text>
      <text x="10.4" y="9.3" text-anchor="middle">★</text>
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
