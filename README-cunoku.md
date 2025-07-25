# Cunoku Online 🎴

Um jogo de cartas online multiplayer desenvolvido com Vue.js e Node.js, com tema de cassino japonês luxuoso.

## 🚀 Início Rápido

### Opção 1: Scripts Automatizados (Recomendado)

#### Windows - Arquivo Batch:
```bash
# Duplo clique no arquivo ou execute no terminal:
start-cunoku.bat
```

#### Windows - PowerShell:
```powershell
.\start-cunoku.ps1
```

#### Multiplataforma - Node.js:
```bash
node start-cunoku.js
```

#### NPM Script:
```bash
npm start
# ou
npm run dev:all
```

### Opção 2: Execução Manual

1. **Terminal 1 - Frontend:**
```bash
npm run dev
```

2. **Terminal 2 - Backend API:**
```bash
npm run backend
```

3. **Terminal 3 - Signaling Server:**
```bash
npm run signaling
```

## 🌐 URLs dos Serviços

- **Frontend (Vue.js):** http://localhost:5173
- **Backend API:** http://localhost:3000
- **Signaling Server:** http://localhost:3001

## 🎮 Funcionalidades

- ✅ Multiplayer online em tempo real
- ✅ Jogo contra bots com 3 níveis de dificuldade
- ✅ Sistema de salas/lobbies
- ✅ Comunicação P2P via WebRTC
- ✅ Interface temática cassino/japonês
- ✅ Sistema de tradução (Português/Inglês)
- ✅ Design responsivo mobile-first
- ✅ Efeitos sonoros e animações

## 🛠️ Tecnologias

### Frontend
- **Vue.js 3.5.17** - Framework principal
- **Vite 7.0.4** - Build tool e dev server
- **Socket.IO Client** - Comunicação em tempo real
- **WebRTC** - Comunicação P2P
- **CSS Animations** - Efeitos visuais

### Backend
- **Node.js** - Runtime
- **Express.js** - API server
- **Socket.IO** - WebSocket server
- **WebRTC Signaling** - Servidor de sinalização

## 📱 Responsividade

O jogo é totalmente responsivo e otimizado para:
- 🖥️ Desktop (1024px+)
- 📱 Tablet (768px-1023px)
- 📱 Mobile (320px-767px)

## 🌍 Internacionalização

- 🇧🇷 Português (padrão)
- 🇺🇸 English

Troque o idioma clicando nas bandeiras no menu superior.

## ⚙️ Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Inicia apenas o frontend |
| `npm run backend` | Inicia apenas o backend API |
| `npm run signaling` | Inicia apenas o signaling server |
| `npm run dev:all` | Inicia todos os serviços simultaneamente |
| `npm start` | Alias para `dev:all` |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build |

## 📦 Dependências

### Produção
- vue: ^3.5.17
- socket.io: ^4.8.1
- socket.io-client: ^4.8.1
- animate.css: ^4.1.1

### Desenvolvimento
- @vitejs/plugin-vue: ^6.0.0
- vite: ^7.0.4
- concurrently: ^9.2.0

## 🎨 Tema Visual

O jogo utiliza uma paleta de cores inspirada em:
- 🏮 **Japonês:** Cores tradicionais como azul marinho, dourado e vermelho
- 🎰 **Cassino:** Gradientes luxuosos e efeitos dourados
- ⭐ **Elementos:** Animações suaves e transições elegantes

## 🔧 Desenvolvimento

Para contribuir ou modificar o projeto:

1. Clone o repositório
2. Instale as dependências: `npm install`
3. Execute: `npm start`
4. Abra http://localhost:5173

## 📝 Estrutura do Projeto

```
├── src/
│   ├── components/     # Componentes Vue
│   ├── pages/         # Páginas principais
│   ├── i18n/          # Sistema de traduções
│   ├── assets/        # Recursos estáticos
│   └── style.css      # Estilos globais
├── backend/
│   ├── index.js       # Servidor principal
│   └── signaling-server.js  # Servidor WebRTC
├── public/            # Arquivos públicos
└── scripts de inicialização
```

---

**Desenvolvido com ❤️ para uma experiência de jogo premium**
