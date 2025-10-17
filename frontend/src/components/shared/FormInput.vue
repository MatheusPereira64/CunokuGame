<template>
  <label class="flash-input" :class="inputClasses">
    <span v-if="label" class="input-label-flash">{{ label }}</span>
    <div class="input-container-flash">
      <input 
        :value="modelValue"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
        :type="type"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :maxlength="maxlength"
        :minlength="minlength"
        :pattern="pattern"
        :autocomplete="autocomplete"
        class="input-field-flash"
        v-bind="$attrs"
      />
      <div class="input-glow-effect"></div>
      <div v-if="showIcon" class="input-icon-flash">
        <span class="icon">{{ icon }}</span>
      </div>
    </div>
    <div v-if="error" class="input-error-flash">{{ error }}</div>
    <div v-if="hint" class="input-hint-flash">{{ hint }}</div>
  </label>
</template>

<script>
export default {
  name: 'FormInput',
  inheritAttrs: false,
  props: {
    modelValue: {
      type: [String, Number],
      default: ''
    },
    label: {
      type: String,
      default: ''
    },
    type: {
      type: String,
      default: 'text',
      validator: value => ['text', 'email', 'password', 'number', 'tel', 'url', 'search'].includes(value)
    },
    placeholder: {
      type: String,
      default: ''
    },
    disabled: {
      type: Boolean,
      default: false
    },
    required: {
      type: Boolean,
      default: false
    },
    error: {
      type: String,
      default: ''
    },
    hint: {
      type: String,
      default: ''
    },
    size: {
      type: String,
      default: 'normal', // 'small', 'normal', 'large'
      validator: value => ['small', 'normal', 'large'].includes(value)
    },
    variant: {
      type: String,
      default: 'default', // 'default', 'outline', 'filled', 'minimal'
      validator: value => ['default', 'outline', 'filled', 'minimal'].includes(value)
    },
    showIcon: {
      type: Boolean,
      default: false
    },
    icon: {
      type: String,
      default: '✉️'
    },
    maxlength: {
      type: Number,
      default: null
    },
    minlength: {
      type: Number,
      default: null
    },
    pattern: {
      type: String,
      default: null
    },
    autocomplete: {
      type: String,
      default: 'off'
    }
  },
  emits: ['update:modelValue', 'focus', 'blur', 'input'],
  data() {
    return {
      isFocused: false
    }
  },
  computed: {
    inputClasses() {
      return [
        `input-${this.size}`,
        `input-${this.variant}`,
        {
          'input-focused': this.isFocused,
          'input-error': this.error,
          'input-disabled': this.disabled,
          'input-with-icon': this.showIcon
        }
      ]
    }
  },
  methods: {
    handleInput(event) {
      this.$emit('update:modelValue', event.target.value)
      this.$emit('input', event)
    },
    handleFocus(event) {
      this.isFocused = true
      this.$emit('focus', event)
    },
    handleBlur(event) {
      this.isFocused = false
      this.$emit('blur', event)
    }
  }
}
</script>

<style scoped>
/* Componente de input reutilizável */
.flash-input {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  position: relative;
  width: 100%;
}

.input-label-flash {
  color: var(--flash-gold);
  font-weight: bold;
  font-size: 1rem;
  text-shadow: 0 0 5px var(--flash-gold);
  margin-bottom: 0.5rem;
  display: block;
}

.input-container-flash {
  position: relative;
  display: flex;
  align-items: center;
}

.input-field-flash {
  width: 100%;
  padding: 1rem 1.5rem;
  background: var(--flash-dark-gradient);
  border: 2px solid var(--flash-gold);
  border-radius: 15px;
  color: var(--flash-text-light);
  font-size: 1rem;
  font-weight: 500;
  transition: all var(--flash-fast) var(--flash-bounce);
  box-shadow: var(--flash-glow-medium);
  outline: none;
  position: relative;
  z-index: 2;
}

.input-field-flash::placeholder {
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
}

.input-field-flash:focus {
  border-color: var(--flash-neon-blue);
  box-shadow: var(--flash-glow-strong), 0 0 20px var(--flash-neon-blue);
  transform: translateY(-2px);
}

.input-field-flash:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: rgba(0, 0, 0, 0.3);
}

.input-glow-effect {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, transparent, rgba(255, 215, 0, 0.1), transparent);
  border-radius: 15px;
  animation: flash-input-glow 3s ease-in-out infinite;
  pointer-events: none;
}

@keyframes flash-input-glow {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}

.input-icon-flash {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  z-index: 3;
  pointer-events: none;
}

.input-icon-flash .icon {
  font-size: 1.2rem;
  color: var(--flash-gold);
  text-shadow: 0 0 10px var(--flash-gold);
}

.input-error-flash {
  color: var(--flash-red);
  font-size: 0.9rem;
  font-weight: bold;
  text-shadow: 0 0 5px var(--flash-red);
  margin-top: 0.25rem;
  animation: flash-error-shake 0.5s ease-in-out;
}

@keyframes flash-error-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.input-hint-flash {
  color: var(--flash-text-light);
  font-size: 0.8rem;
  opacity: 0.8;
  margin-top: 0.25rem;
}

/* Tamanhos */
.flash-input.input-small .input-field-flash {
  padding: 0.7rem 1rem;
  font-size: 0.9rem;
}

.flash-input.input-large .input-field-flash {
  padding: 1.3rem 2rem;
  font-size: 1.1rem;
}

/* Variantes */
.flash-input.input-outline .input-field-flash {
  background: transparent;
  border: 2px solid var(--flash-gold);
}

.flash-input.input-filled .input-field-flash {
  background: rgba(255, 215, 0, 0.1);
  border: 2px solid var(--flash-gold);
}

.flash-input.input-minimal .input-field-flash {
  background: transparent;
  border: none;
  border-bottom: 2px solid var(--flash-gold);
  border-radius: 0;
  box-shadow: none;
}

.flash-input.input-minimal .input-field-flash:focus {
  box-shadow: 0 0 10px var(--flash-neon-blue);
}

/* Estados */
.flash-input.input-focused .input-glow-effect {
  animation: flash-input-focus-glow 1s ease-in-out infinite;
}

@keyframes flash-input-focus-glow {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.8; }
}

.flash-input.input-error .input-field-flash {
  border-color: var(--flash-red);
  box-shadow: 0 0 15px var(--flash-red);
}

.flash-input.input-error .input-glow-effect {
  background: linear-gradient(45deg, transparent, rgba(255, 0, 0, 0.1), transparent);
}

.flash-input.input-disabled .input-field-flash {
  cursor: not-allowed;
}

.flash-input.input-disabled .input-glow-effect {
  display: none;
}

/* Input com ícone */
.flash-input.input-with-icon .input-field-flash {
  padding-right: 3rem;
}

/* Responsividade */
@media (max-width: 768px) {
  .input-field-flash {
    padding: 0.8rem 1rem;
    font-size: 0.9rem;
  }
  
  .flash-input.input-large .input-field-flash {
    padding: 1rem 1.5rem;
    font-size: 1rem;
  }
  
  .input-label-flash {
    font-size: 0.9rem;
  }
}

/* Animações de entrada */
.flash-input {
  animation: flash-input-enter 0.5s ease-out;
}

@keyframes flash-input-enter {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Efeito de digitação */
.input-field-flash:focus + .input-glow-effect {
  animation: flash-input-typing 0.5s ease-in-out;
}

@keyframes flash-input-typing {
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
}
</style>
