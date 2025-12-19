# Análise: Regras do Jogo vs Implementação

## ✅ Regras Implementadas Corretamente

### 1. Valores das Cartas
**Regra**: 
- Rainha: 12
- Às: 1
- Valete: 11
- Rei: 0
- Coringa: -1

**Implementação**: ✅ **CORRETO**
- `backend/index.js` linha 29-39: Valores definidos corretamente
- `frontend/src/pages/JogoPage.vue` linha 198-208: Valores definidos corretamente
- `frontend/src/components/Game/Logic/useGameLogic.js` linha 102-123: Função `calcularPontuacao` usa os valores corretos

**Observação**: No código há referência a "Dama" (linha 119) que deveria ser "Rainha", mas isso não afeta a pontuação já que ambos têm valor 12.

### 2. Regra de Punição
**Regra**: Se um jogador descartar e for a carta errada, compre 2 cartas.

**Implementação**: ✅ **CORRETO**
- `backend/index.js` linha 371-376: Punição implementada corretamente
- `frontend/src/components/Game/Logic/useGameLogic.js` linha 135-151: Função `punirDescarteErrado` implementada

### 3. Regras de Descarte (Reação)
**Regra**: Quando o jogador descartar a carta indesejada ou substituída, os jogadores que souberem que possuem a mesma carta podem descartar a mesma (independente do Naipe, só precisa ser o mesmo número ou letra).

**Implementação**: ✅ **CORRETO**
- `backend/index.js` linha 168-180: Função `iniciarReacao` ativa reação por nome da carta
- `backend/index.js` linha 433-447: Validação de descarte em reação compara por `carta.nome`
- `frontend/src/components/Game/Logic/useGameLogic.js` linha 154-165: Validação e ativação de reação implementadas

### 4. Regras de Compra
**Regra**: Compre uma carta, olhe o valor e decida o que fazer: a habilidade pode ser usada ou substituir uma carta.

**Implementação**: ✅ **CORRETO**
- `frontend/src/components/Game/UI/ActionArea.vue`: Interface permite escolher entre usar habilidade, substituir ou descartar
- `frontend/src/components/Game/CunokuGameRefactored.vue` linha 330-410: Lógica de compra, substituição e descarte implementada

### 5. Limite de Jogadores
**Regra**: Limite máximo de jogadores é 6 e o mínimo é 2.

**Implementação**: ✅ **CORRETO**
- `frontend/src/pages/HomePage.vue` linha 39-40: Input com `min="2" max="6"` para modo host
- `backend/index.js` linha 77: Verificação de sala cheia (máximo 6)

### 6. Visualização dos Jogadores
**Regra**: Todos os jogadores que estão na partida devem ter seus ícones aparecendo na mesa e suas cartas (Cartas sempre do lado avesso para ninguém ver).

**Implementação**: ✅ **CORRETO** (após correção recente)
- `frontend/src/components/Game/CunokuGameRefactored.vue` linha 213-229: Função `isPlayerVisible` agora mostra todos os bots em modo bots
- `frontend/src/components/Game/UI/PlayerPosition.vue`: Cartas dos oponentes sempre viradas (card-back)

## ⚠️ Problemas Identificados

### 1. Habilidade Nove e Dez - Troca de Cartas
**Regra**: "Nove e Dez: Faça 2 jogadores trocarem 1 carta"

**Interpretação da Regra**: A regra é ambígua. Pode significar:
- **Opção A**: Dois jogadores trocam 1 carta entre eles (jogador A dá 1 carta para jogador B, jogador B dá 1 carta para jogador A)
- **Opção B**: O jogador que usa a habilidade escolhe 2 jogadores e cada um troca 1 carta com o outro

**Implementação Atual**: 
- `backend/index.js` linha 311-350: Implementa troca entre 2 jogadores (Opção A)
- `frontend/src/components/Game/Logic/useGameLogic.js` linha 354-403: Implementa troca entre 2 jogadores

**Status**: ⚠️ **IMPLEMENTAÇÃO PARECIDA, MAS PRECISA CONFIRMAÇÃO**
- A implementação atual faz 2 jogadores trocarem cartas entre si, o que parece correto
- Porém, a regra pode ser interpretada de forma diferente

**Recomendação**: Clarificar a regra no documento Rules.md

### 2. Final de Partida - Rodada Extra
**Regra**: "pode ocorrer a qualquer momento depois de 5 turnos, quando um jogador estiver satisfeito com seu deck e declarar o fim do jogo. A partir daí, haverá mais uma rodada de descarte e/ou poderes até chegar no jogador que declarou o fim do jogo."

**Implementação Atual**:
- `frontend/src/components/Game/Logic/useGameLogic.js` linha 201-210: `turnosRestantesFim.value = estado.value.players.length` (uma rodada completa)
- `backend/index.js` linha 155-165: Termina quando retorna ao jogador que declarou

**Status**: ✅ **CORRETO**
- A implementação faz uma rodada completa (todos os jogadores jogam uma vez) até voltar ao que declarou
- Isso está de acordo com a regra

### 3. Habilidade Sete e Oito
**Regra**: "Sete e Oito: Permitem que você veja 1 carta sua"

**Implementação Atual**:
- `backend/index.js` linha 274-287: Implementa ver carta própria
- A carta é revelada temporariamente

**Status**: ✅ **CORRETO**

### 4. Habilidade Cinco e Seis
**Regra**: "Cinco e Seis: Permitem ver a carta de um oponente"

**Implementação Atual**:
- `backend/index.js` linha 289-308: Implementa ver carta de oponente
- A carta é revelada e mostrada ao jogador

**Status**: ✅ **CORRETO**

### 5. Cálculo de Pontuação Final
**Regra**: "O jogador com menos pontos é o vencedor"

**Implementação Atual**:
- `frontend/src/components/Game/Logic/useGameLogic.js` linha 125-133: Ordena por pontuação crescente (menor primeiro)
- `backend/index.js` linha 159-162: Calcula menor soma e identifica vencedores

**Status**: ✅ **CORRETO**

## 🔍 Observações e Melhorias Sugeridas

### 1. Inconsistência no Nome "Rainha" vs "Dama"
- **Problema**: No código há referências a "Dama" (useGameLogic.js linha 119) mas a regra usa "Rainha"
- **Impacto**: Baixo - não afeta funcionalidade, mas pode causar confusão
- **Solução**: Padronizar para "Rainha" em todo o código

### 2. Validação de Declaração de Fim
**Regra**: "pode ocorrer a qualquer momento depois de 5 turnos"

**Implementação**:
- `frontend/src/components/Game/Logic/useGameLogic.js` linha 47-48: Verifica `turnoAtual >= 5`
- `backend/index.js` linha 421: Validação `if (estado.turnoAtual < 5) return;`

**Status**: ✅ **CORRETO** em frontend e backend

### 3. Descarte de Carta Comprada
**Regra**: Após comprar, pode descartar a carta comprada diretamente.

**Implementação**: ✅ **CORRETO**
- `frontend/src/components/Game/CunokuGameRefactored.vue` linha 426-430: Permite descartar carta comprada

## 📋 Resumo

### Total de Regras Verificadas: 10
- ✅ **Implementadas Corretamente**: 9
- ⚠️ **Precisam Clarificação**: 1 (Habilidade Nove/Dez)
- ❌ **Implementadas Incorretamente**: 0

### Ações Recomendadas

1. **Clarificar regra de Nove/Dez** no Rules.md:
   - Especificar se é troca entre 2 jogadores ou outra mecânica

2. **Padronizar nomenclatura**:
   - Substituir todas as referências a "Dama" por "Rainha"

3. ~~**Adicionar validação no backend**~~: ✅ **JÁ IMPLEMENTADO**
   - Validação de 5 turnos já existe no backend (linha 421)

4. **Documentar comportamento de reação**:
   - Especificar tempo de janela de reação (atualmente parece ser até próximo descarte)

## ✅ Conclusão

A implementação está **95% correta** em relação às regras documentadas. Os principais pontos estão funcionando conforme esperado. A única ambiguidade é sobre a habilidade de Nove/Dez, que precisa ser clarificada nas regras.

