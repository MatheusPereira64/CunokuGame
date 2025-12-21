# Guia de Deploy - Cunoku Game

Este guia explica como fazer deploy do jogo para que outras pessoas possam jogar online, mesmo que não estejam na sua rede local.

## 📋 Pré-requisitos

1. **Conta no GitHub** (já tem o código lá)
2. **Banco de dados PostgreSQL** (gratuito disponível)
3. **Serviço de hospedagem** (opções gratuitas abaixo)

---

## 🚀 Opção 1: Railway (Recomendado - Mais Fácil)

Railway é uma plataforma que facilita o deploy de aplicações Node.js.

### Passos:

1. **Criar conta no Railway**
   - Acesse: https://railway.app
   - Faça login com GitHub

2. **Criar novo projeto**
   - Clique em "New Project"
   - Selecione "Deploy from GitHub repo"
   - Escolha seu repositório `CunokuGame`

3. **Configurar banco de dados**
   - No projeto, clique em "New" → "Database" → "PostgreSQL"
   - Railway criará automaticamente um banco PostgreSQL
   - Copie a `DATABASE_URL` que aparece (será usada depois)

4. **Configurar variáveis de ambiente**
   - No projeto, vá em "Variables"
   - Adicione:
     ```
     NODE_ENV=production
     DATABASE_URL=<cole a URL do banco aqui>
     PORT=5000
     ```

5. **Configurar build e start**
   - Railway detecta automaticamente o `package.json`
   - Certifique-se de que os scripts estão corretos:
     - `build`: `tsx script/build.ts`
     - `start`: `cross-env NODE_ENV=production node dist/index.cjs`

6. **Deploy**
   - Railway fará o deploy automaticamente
   - Após o deploy, você receberá uma URL (ex: `https://cunoku-game.up.railway.app`)

7. **Configurar domínio (opcional)**
   - No projeto, vá em "Settings" → "Domains"
   - Adicione um domínio personalizado se quiser

---

## 🌐 Opção 2: Render

Render também oferece hospedagem gratuita.

### Passos:

1. **Criar conta no Render**
   - Acesse: https://render.com
   - Faça login com GitHub

2. **Criar banco de dados PostgreSQL**
   - Clique em "New" → "PostgreSQL"
   - Escolha o plano gratuito
   - Copie a `Internal Database URL`

3. **Criar Web Service**
   - Clique em "New" → "Web Service"
   - Conecte seu repositório GitHub
   - Configure:
     - **Build Command**: `npm run build`
     - **Start Command**: `npm start`
     - **Environment**: `Node`

4. **Adicionar variáveis de ambiente**
   ```
   NODE_ENV=production
   DATABASE_URL=<URL do banco criado>
   PORT=10000
   ```

5. **Deploy**
   - Render fará o deploy automaticamente
   - Você receberá uma URL (ex: `https://cunoku-game.onrender.com`)

---

## 🗄️ Opção 3: Neon Database (Banco de Dados Gratuito)

Se quiser usar apenas o banco de dados gratuito do Neon:

1. **Criar conta no Neon**
   - Acesse: https://neon.tech
   - Crie uma conta gratuita

2. **Criar projeto**
   - Crie um novo projeto PostgreSQL
   - Copie a `Connection String` (DATABASE_URL)

3. **Usar com Railway ou Render**
   - Use a `DATABASE_URL` do Neon nas variáveis de ambiente

---

## 🔧 Configurações Importantes

### Variáveis de Ambiente Necessárias:

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:port/database
PORT=5000  # ou a porta que o serviço fornecer
```

### Scripts do package.json (já configurados):

```json
{
  "scripts": {
    "build": "tsx script/build.ts",
    "start": "cross-env NODE_ENV=production node dist/index.cjs"
  }
}
```

---

## 📝 Passos Adicionais Após Deploy

1. **Executar migrações do banco de dados**
   - O servidor agora cria as tabelas automaticamente na primeira inicialização
   - Se isso não funcionar, você pode executar manualmente:
   ```bash
   npm run db:push
   ```
   - Ou usar o script de inicialização:
   ```bash
   npm run db:init
   ```

2. **Verificar logs do servidor**
   - Verifique os logs do Railway/Render para ver se há erros
   - Procure por mensagens como "Database tables created successfully" ou "Database tables verified"

3. **Testar a aplicação**
   - Acesse a URL fornecida
   - Crie uma sala de jogo
   - Compartilhe o código da sala com outra pessoa
   - Teste se ambos conseguem se conectar

4. **WebSocket**
   - Certifique-se de que o serviço suporta WebSockets
   - Railway e Render suportam WebSockets nativamente

---

## 🐛 Troubleshooting

### Erro: "DATABASE_URL must be set"
- Verifique se a variável `DATABASE_URL` está configurada corretamente
- Certifique-se de que o banco de dados está ativo
- No Railway: Vá em "Variables" e verifique se `DATABASE_URL` está presente

### Erro 400 ao criar sala
- **Problema mais comum**: Tabelas do banco de dados não foram criadas
- **Solução**: O servidor agora cria as tabelas automaticamente na primeira inicialização
- Verifique os logs do servidor para ver se há erros de banco de dados
- Procure por mensagens como "Database tables created successfully" ou "Database tables verified"
- Se persistir, execute manualmente: `npm run db:push` ou `npm run db:init`
- Verifique se a `DATABASE_URL` está correta e o banco está acessível
- Verifique os logs detalhados no console do servidor (Railway/Render)

### Erro: "Connection refused" no WebSocket
- Verifique se o serviço suporta WebSockets
- Railway e Render suportam, mas alguns serviços podem precisar de configuração adicional

### Erro: "Port already in use"
- Use a porta fornecida pelo serviço (geralmente via variável `PORT`)
- Railway e Render definem automaticamente a porta

---

## 🎮 Como Jogar Após Deploy

1. **Acesse a URL do seu jogo** (ex: `https://cunoku-game.up.railway.app`)

2. **Crie uma sala** ou **entre em uma sala existente**

3. **Compartilhe o código da sala** com outra pessoa

4. **A outra pessoa acessa a mesma URL** e entra com o código

5. **Ambos podem jogar juntos!**

---

## 💡 Dicas

- **Railway** oferece $5 grátis por mês (suficiente para testes)
- **Render** oferece plano gratuito (pode ficar "dormindo" após inatividade)
- Para produção, considere serviços pagos para melhor performance
- Sempre use HTTPS em produção (Railway e Render fornecem automaticamente)

---

## 📚 Recursos

- [Railway Docs](https://docs.railway.app)
- [Render Docs](https://render.com/docs)
- [Neon Database](https://neon.tech/docs)

