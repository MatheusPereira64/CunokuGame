# Script PowerShell para iniciar Cunoku Online
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "       CUNOKU ONLINE - INICIALIZADOR" -ForegroundColor Yellow  
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Iniciando todos os serviços..." -ForegroundColor Green
Write-Host ""
Write-Host "Frontend (Vite): http://localhost:5173" -ForegroundColor Cyan
Write-Host "Backend API: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Signaling Server: http://localhost:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pressione Ctrl+C para parar todos os serviços" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

try {
    npm run dev
}
catch {
    Write-Host "Erro ao executar os serviços. Verifique se o Node.js e npm estão instalados." -ForegroundColor Red
    Read-Host "Pressione Enter para sair"
}
