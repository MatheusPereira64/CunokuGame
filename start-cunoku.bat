@echo off
cd /d "%~dp0"
title CUNOKU ONLINE - Inicializador
color 0A

:MENU
cls
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    🎴 CUNOKU ONLINE 🎴                       ║
echo ║                      INICIALIZADOR                           ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║                                                              ║
echo ║  [1] ▶️  INICIAR TODOS OS SERVIÇOS                          ║
echo ║                                                              ║
echo ║  [2] 🌐 INICIAR APENAS FRONTEND (Vite)                      ║
echo ║                                                              ║
echo ║  [3] ⚙️  INICIAR APENAS BACKEND (API)                       ║
echo ║                                                              ║
echo ║  [4] 📡 INICIAR APENAS SIGNALING (WebRTC)                   ║
echo ║                                                              ║
echo ║  [5] 📋 VER STATUS DOS SERVIÇOS                             ║
echo ║                                                              ║
echo ║  [0] ❌ SAIR                                                ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo 🌐 URLs dos Serviços:
echo    Frontend: http://localhost:5173
echo    Backend:  http://localhost:3000
echo    Signaling: http://localhost:3001
echo.
set /p choice="👆 Escolha uma opção (0-5): "

if "%choice%"=="1" goto START_ALL
if "%choice%"=="2" goto START_FRONTEND
if "%choice%"=="3" goto START_BACKEND
if "%choice%"=="4" goto START_SIGNALING
if "%choice%"=="5" goto STATUS
if "%choice%"=="0" goto EXIT
goto MENU

:START_ALL
cls
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                🚀 INICIANDO TODOS OS SERVIÇOS 🚀             ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo ⏳ Carregando...
echo.
npm run dev
echo.
echo ✅ Pressione qualquer tecla para voltar ao menu...
pause >nul
goto MENU

:START_FRONTEND
cls
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                🌐 INICIANDO FRONTEND (Vite) 🌐               ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
cd frontend
npm run dev
echo.
echo ✅ Pressione qualquer tecla para voltar ao menu...
pause >nul
goto MENU

:START_BACKEND
cls
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                ⚙️ INICIANDO BACKEND (API) ⚙️                 ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
cd backend
npm run start
echo.
echo ✅ Pressione qualquer tecla para voltar ao menu...
pause >nul
goto MENU

:START_SIGNALING
cls
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║             📡 INICIANDO SIGNALING (WebRTC) 📡               ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
cd backend
npm run signaling
echo.
echo ✅ Pressione qualquer tecla para voltar ao menu...
pause >nul
goto MENU

:STATUS
cls
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                📋 STATUS DOS SERVIÇOS 📋                     ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo 🔍 Verificando portas...
echo.
netstat -an | findstr ":5173" >nul && echo ✅ Frontend (5173): ATIVO || echo ❌ Frontend (5173): INATIVO
netstat -an | findstr ":3000" >nul && echo ✅ Backend (3000): ATIVO || echo ❌ Backend (3000): INATIVO  
netstat -an | findstr ":3001" >nul && echo ✅ Signaling (3001): ATIVO || echo ❌ Signaling (3001): INATIVO
echo.
echo 📊 Processes Node.js ativos:
tasklist | findstr "node.exe" 2>nul || echo   Nenhum processo Node.js encontrado
echo.
echo ✅ Pressione qualquer tecla para voltar ao menu...
pause >nul
goto MENU

:EXIT
cls
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                      👋 ATÉ LOGO! 👋                        ║
echo ║                   Obrigado por jogar!                        ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
timeout 2 >nul
exit
