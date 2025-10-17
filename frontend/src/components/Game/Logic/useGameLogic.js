import { ref, computed } from 'vue'

export function useGameLogic() {
  // Estado do jogo
  const estado = ref(null)
  const meuIndice = ref(null)
  const escolhendoAcao = ref(false)
  const cartaComprada = ref(null)
  const indiceSubstituir = ref(null)
  const indiceDescarteTentativa = ref(null)
  const acaoPendente = ref(false)
  const mensagemStatus = ref('')
  const cartasReveladas = ref([])
  const cartasReveladasTemporariamente = ref([])
  const reacaoAtiva = ref(false)
  const valorReacao = ref('')
  const cartaOriginalReacao = ref(null)
  
  // Estados para habilidades
  const escolhendoCartaPropria = ref(false)
  const escolhendoCartaOponente = ref(false)
  const escolhendoTroca = ref(false)
  const resultadoFinal = ref(null)
  const fimDeJogo = ref(false)
  const fimDeclarado = ref(false)
  const jogadorDeclarouFim = ref(null)
  const turnosRestantesFim = ref(0)
  
  // Modo offline
  const modoOffline = ref(false)

  // Computed properties
  const maoReal = computed(() => {
    if (!estado.value || meuIndice.value === null) return []
    return estado.value.players[meuIndice.value]?.mao || []
  })

  const podeComprarCarta = computed(() => {
    return estado.value && 
           estado.value.jogadorDaVez === meuIndice.value && 
           !escolhendoAcao.value && 
           !acaoPendente.value
  })

  const podeDeclararFim = computed(() => {
    return estado.value && 
           estado.value.turnoAtual >= 5 && 
           !estado.value.fimDeclarado
  })

  // Métodos de mapeamento
  const mapValorSvg = (nome) => {
    switch (nome) {
      case 'Ás': return 'A'
      case 'Dois': return '2'
      case 'Três': return '3'
      case 'Quatro': return '4'
      case 'Cinco': return '5'
      case 'Seis': return '6'
      case 'Sete': return '7'
      case 'Oito': return '8'
      case 'Nove': return '9'
      case 'Dez': return '10'
      case 'Valete': return 'J'
      case 'Dama': return 'Q'
      case 'Rei': return 'K'
      default: return null
    }
  }

  const mapNaipeSvg = (naipe) => {
    switch (naipe) {
      case '♠': return 'S'
      case '♥': return 'H'
      case '♦': return 'D'
      case '♣': return 'C'
      default: return null
    }
  }

  // Métodos de verificação
  const cartaEstaRevelada = (idx) => {
    return cartasReveladas.value.some(c => c.idx === idx)
  }

  // Sistema de revelação temporária
  const revelarCartaTemporariamente = (playerIdx, cardIdx, duracao = 5000) => {
    cartasReveladasTemporariamente.value.push({ playerIdx, cardIdx })
    setTimeout(() => {
      cartasReveladasTemporariamente.value = cartasReveladasTemporariamente.value
        .filter(c => !(c.playerIdx === playerIdx && c.cardIdx === cardIdx))
    }, duracao)
  }

  const cartaEstaReveladaTemporariamente = (playerIdx, cardIdx) => {
    return cartasReveladasTemporariamente.value.some(
      c => c.playerIdx === playerIdx && c.cardIdx === cardIdx
    )
  }

  // Sistema de pontuação
  const calcularPontuacao = (cartas) => {
    return cartas.reduce((total, carta) => {
      const valor = carta.nome
      switch (valor) {
        case 'Rei': return total + 0
        case 'Ás': return total + 1
        case 'Coringa': return total - 1
        case 'Dois': return total + 2
        case 'Três': return total + 3
        case 'Quatro': return total + 4
        case 'Cinco': return total + 5
        case 'Seis': return total + 6
        case 'Sete': return total + 7
        case 'Oito': return total + 8
        case 'Nove': return total + 9
        case 'Dez': return total + 10
        case 'Valete': return total + 11
        case 'Dama': return total + 12
        default: return total
      }
    }, 0)
  }

  const calcularPontuacoesFinais = () => {
    if (!estado.value) return []
    
    return estado.value.players.map((player, index) => ({
      nome: player.nome,
      pontuacao: calcularPontuacao(player.mao || []),
      indice: index
    })).sort((a, b) => a.pontuacao - b.pontuacao) // Menor pontuação primeiro
  }

  // Sistema de punição por descarte errado
  const punirDescarteErrado = (playerIndex) => {
    if (!estado.value) return
    
    const player = estado.value.players[playerIndex]
    if (!player) return
    
    // Comprar 2 cartas do baralho
    for (let i = 0; i < 2; i++) {
      if (estado.value.baralho.length > 0) {
        const carta = estado.value.baralho.pop()
        player.mao.push(carta)
      }
    }
    
    showMessage(`${player.nome} descartou carta errada e comprou 2 cartas!`, 5000)
  }

  // Validar descarte em reação
  const validarDescarteReacao = (playerIndex, cartaDescartada, cartaOriginal) => {
    // Verificar se os valores são iguais (independente do naipe)
    return cartaDescartada.nome === cartaOriginal.nome
  }

  // Ativar reação quando uma carta é descartada
  const ativarReacao = (cartaDescartada) => {
    reacaoAtiva.value = true
    valorReacao.value = cartaDescartada.nome
    cartaOriginalReacao.value = cartaDescartada
    showMessage(`Reação ativada! Jogadores podem descartar cartas de valor "${cartaDescartada.nome}"`, 5000)
  }

  // Desativar reação
  const desativarReacao = () => {
    reacaoAtiva.value = false
    valorReacao.value = ''
    cartaOriginalReacao.value = null
  }

  // Processar descarte em reação
  const processarDescarteReacao = (playerIndex, cartaDescartada) => {
    if (!reacaoAtiva.value || !cartaOriginalReacao.value) return false
    
    const isValid = validarDescarteReacao(playerIndex, cartaDescartada, cartaOriginalReacao.value)
    
    if (isValid) {
      // Descarte válido - remover carta da mão e adicionar à pilha
      const player = estado.value.players[playerIndex]
      const cardIndex = player.mao.findIndex(c => c.nome === cartaDescartada.nome && c.naipe === cartaDescartada.naipe)
      if (cardIndex !== -1) {
        player.mao.splice(cardIndex, 1)
        estado.value.pilha.push(cartaDescartada)
        showMessage(`${player.nome} reagiu com sucesso!`, 3000)
        desativarReacao()
        return true
      }
    } else {
      // Descarte inválido - punir jogador
      punirDescarteErrado(playerIndex)
      return false
    }
    
    return false
  }

  // Sistema de fim de jogo
  const declararFimDeJogo = (playerIndex) => {
    if (!estado.value || fimDeclarado.value) return false
    
    fimDeclarado.value = true
    jogadorDeclarouFim.value = estado.value.players[playerIndex]?.nome
    turnosRestantesFim.value = estado.value.players.length // Uma rodada completa
    
    showMessage(`${jogadorDeclarouFim.value} declarou fim do jogo! Mais uma rodada completa.`, 5000)
    return true
  }

  const avancarTurnoComFim = () => {
    if (!estado.value || !fimDeclarado.value) return
    
    // Avançar turno normalmente
    estado.value.jogadorDaVez = (estado.value.jogadorDaVez + 1) % estado.value.players.length
    
    // Se voltou ao jogador que declarou fim, terminar jogo
    if (estado.value.jogadorDaVez === estado.value.players.findIndex(p => p.nome === jogadorDeclarouFim.value)) {
      finalizarJogo()
    }
  }

  const finalizarJogo = () => {
    if (!estado.value) return
    
    fimDeJogo.value = true
    resultadoFinal.value = calcularPontuacoesFinais()
    
    const vencedor = resultadoFinal.value[0]
    showMessage(`🎉 ${vencedor.nome} venceu com ${vencedor.pontuacao} pontos!`, 10000)
  }

  // Métodos de posicionamento
  const getPlayerPosition = (playerIndex) => {
    if (!estado.value) return 'bottom'
    
    const totalPlayers = estado.value.players.length
    const positions = {
      2: ['bottom', 'top'],
      3: ['bottom', 'top-left', 'top-right'],
      4: ['bottom', 'left', 'top', 'right'],
      5: ['bottom', 'bottom-left', 'top-left', 'top-right', 'bottom-right'],
      6: ['bottom', 'left', 'top-left', 'top-right', 'right', 'bottom-right']
    }
    
    const positionArray = positions[totalPlayers] || positions[6]
    return positionArray[playerIndex] || 'bottom'
  }

  const getPlayerIcon = (playerIndex, playerName = '') => {
    // Ícones especiais para bots conhecidos
    const botIcons = {
      'Hulk': '/assets/botIcons/Hulk.jpeg',
      'Naldo': '/assets/botIcons/Naldo.jpeg',
      'Noku': '/assets/botIcons/Noku.jpeg',
      'Sanfona': '/assets/botIcons/Sanfona.jpeg',
      'Jogador': '👤'
    }
    
    // Verificar se é um bot com ícone especial
    if (botIcons[playerName]) {
      return botIcons[playerName]
    }
    
    // Ícones padrão para outros jogadores
    const defaultIcons = ['👤', '🎭', '🎪', '🎯', '🎲', '🎨']
    return defaultIcons[playerIndex % defaultIcons.length]
  }

  // Métodos de reset
  const resetGameState = () => {
    escolhendoAcao.value = false
    cartaComprada.value = null
    indiceSubstituir.value = null
    indiceDescarteTentativa.value = null
    acaoPendente.value = false
    escolhendoCartaPropria.value = false
    escolhendoCartaOponente.value = false
    escolhendoTroca.value = false
  }

  const showMessage = (message, duration = 3000) => {
    mensagemStatus.value = message
    setTimeout(() => {
      mensagemStatus.value = ''
    }, duration)
  }

  // Lógica dos bots
  const checarBotEVez = () => {
    if (!modoOffline.value || !estado.value || !estado.value.jogoIniciado) return
    const idx = estado.value.jogadorDaVez
    const player = estado.value.players[idx]
    if (player && player.humano === false) {
      setTimeout(() => jogarBot(idx), 800)
    }
  }

  const jogarBot = (idx) => {
    if (!estado.value.jogoIniciado) return
    if (!estado.value.aguardandoAcao) {
      const cartaComprada = estado.value.baralho.pop()
      estado.value.aguardandoAcao = { jogador: idx, carta: cartaComprada }
      
      setTimeout(() => {
        // Se for carta de habilidade, bot usa habilidade
        if (['Cinco','Seis','Sete','Oito','Nove','Dez'].includes(cartaComprada.nome)) {
          usarHabilidadeBot(idx, cartaComprada)
          return
        }
        // Bot sempre descarta carta comprada se não for habilidade
        estado.value.pilha.push(estado.value.aguardandoAcao.carta)
        delete estado.value.aguardandoAcao
        avancarTurnoLocal()
      }, 900)
    }
  }

  const usarHabilidadeBot = (idx, carta) => {
    // Lógica simples: bot sempre usa habilidade de forma aleatória
    const minTurnos = 5
    if (carta.nome === 'Sete' || carta.nome === 'Oito') {
      // Ver carta própria (escolhe aleatória)
      estado.value.pilha.push(carta)
      delete estado.value.aguardandoAcao
      avancarTurnoLocal()
      return
    }
    if (carta.nome === 'Cinco' || carta.nome === 'Seis') {
      // Ver carta de oponente (escolhe aleatório)
      const oponentes = estado.value.players.map((p, i) => i).filter(i => i !== idx)
      const alvo = oponentes[Math.floor(Math.random() * oponentes.length)]
      estado.value.pilha.push(carta)
      delete estado.value.aguardandoAcao
      avancarTurnoLocal()
      return
    }
    if (carta.nome === 'Nove' || carta.nome === 'Dez') {
      // Troca cartas entre dois jogadores aleatórios
      const indices = estado.value.players.map((p, i) => i)
      let j1 = idx
      while (j1 === idx) j1 = indices[Math.floor(Math.random() * indices.length)]
      let j2 = idx
      while (j2 === idx || j2 === j1) j2 = indices[Math.floor(Math.random() * indices.length)]
      const i1 = Math.floor(Math.random() * estado.value.players[j1].mao.length)
      const i2 = Math.floor(Math.random() * estado.value.players[j2].mao.length)
      const cartaA = estado.value.players[j1].mao[i1]
      const cartaB = estado.value.players[j2].mao[i2]
      estado.value.players[j1].mao[i1] = cartaB
      estado.value.players[j2].mao[i2] = cartaA
      estado.value.pilha.push(carta)
      // Mensagem detalhada da troca
      showMessage(`O jogador ${estado.value.players[idx].nome} trocou a carta ${i1+1} com a carta ${i2+1} do Jogador ${estado.value.players[j2].nome}`, 4000)
      delete estado.value.aguardandoAcao
      avancarTurnoLocal()
      return
    }
    // Fim de jogo: só pode declarar após minTurnos
    const soma = estado.value.players[idx].mao.reduce((acc, c) => acc + (typeof c.valor === 'number' ? c.valor : 0), 0)
    if (estado.value.turnoAtual >= minTurnos && soma < 15 && Math.random() < 0.8 && !estado.value.fimDeclarado) {
      estado.value.fimDeclarado = true
      estado.value.jogadorDeclarouFim = estado.value.players[idx].nome
      estado.value.turnosRestantesFim = 2 * estado.value.players.length
    }
    estado.value.pilha.push(carta)
    delete estado.value.aguardandoAcao
    avancarTurnoLocal()
  }

  const avancarTurnoLocal = () => {
    // Avança o jogador da vez
    estado.value.jogadorDaVez = (estado.value.jogadorDaVez + 1) % estado.value.players.length
    
    // Incrementa turno apenas quando volta para o jogador 0 (um ciclo completo)
    if (estado.value.jogadorDaVez === 0) {
      estado.value.turnoAtual = (estado.value.turnoAtual || 1) + 1
      
      // Se fim foi declarado, decrementa turnos restantes apenas quando completar um ciclo
      if (estado.value.fimDeclarado && estado.value.turnosRestantesFim !== null) {
        estado.value.turnosRestantesFim--
        console.log(`Turno completo! Turnos restantes: ${estado.value.turnosRestantesFim}`)
        
        if (estado.value.turnosRestantesFim <= 0) {
          estado.value.jogoIniciado = false
          // Calcula soma das cartas de cada jogador
          const somas = estado.value.players.map(p => ({ 
            nome: p.nome, 
            soma: p.mao.reduce((acc, c) => acc + (typeof c.valor === 'number' ? c.valor : 0), 0) 
          }))
          const menor = Math.min(...somas.map(s => s.soma))
          const vencedores = somas.filter(s => s.soma === menor).map(s => s.nome)
          resultadoFinal.value = { somas, vencedores, jogadores: estado.value.players }
          fimDeJogo.value = true
          return
        }
      }
    }
    // Continua verificando se é vez de bot
    checarBotEVez()
  }

  return {
    // Estado
    estado,
    meuIndice,
    escolhendoAcao,
    cartaComprada,
    indiceSubstituir,
    indiceDescarteTentativa,
    acaoPendente,
    mensagemStatus,
    cartasReveladas,
    reacaoAtiva,
    valorReacao,
    escolhendoCartaPropria,
    escolhendoCartaOponente,
    escolhendoTroca,
    resultadoFinal,
    fimDeJogo,
    fimDeclarado,
    jogadorDeclarouFim,
    turnosRestantesFim,
    modoOffline,
    
    // Computed
    maoReal,
    podeComprarCarta,
    podeDeclararFim,
    
    // Métodos
    mapValorSvg,
    mapNaipeSvg,
    cartaEstaRevelada,
    revelarCartaTemporariamente,
    cartaEstaReveladaTemporariamente,
    calcularPontuacao,
    calcularPontuacoesFinais,
    punirDescarteErrado,
    validarDescarteReacao,
    ativarReacao,
    desativarReacao,
    processarDescarteReacao,
    declararFimDeJogo,
    avancarTurnoComFim,
    finalizarJogo,
    getPlayerPosition,
    getPlayerIcon,
    resetGameState,
    showMessage,
    
    // Métodos dos bots
    checarBotEVez,
    jogarBot,
    usarHabilidadeBot,
    avancarTurnoLocal
  }
}
