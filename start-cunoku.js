#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('\x1b[33m========================================\x1b[0m');
console.log('\x1b[33m       CUNOKU ONLINE - INICIALIZADOR\x1b[0m');
console.log('\x1b[33m========================================\x1b[0m');
console.log('');
console.log('\x1b[32mIniciando todos os serviços...\x1b[0m');
console.log('');
console.log('\x1b[36mFrontend (Vite): http://localhost:5173\x1b[0m');
console.log('\x1b[36mBackend API: http://localhost:3000\x1b[0m');
console.log('\x1b[36mSignaling Server: http://localhost:3001\x1b[0m');
console.log('');
console.log('\x1b[31mPressione Ctrl+C para parar todos os serviços\x1b[0m');
console.log('\x1b[33m========================================\x1b[0m');
console.log('');

// Detectar sistema operacional para usar o comando correto
const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? 'npm.cmd' : 'npm';

// Executar npm run dev:all
const child = spawn(npmCommand, ['run', 'dev:all'], {
  stdio: 'inherit',
  shell: true,
  cwd: __dirname
});

// Lidar com sinais de interrupção
process.on('SIGINT', () => {
  console.log('\n\x1b[31mParando todos os serviços...\x1b[0m');
  child.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\x1b[31mParando todos os serviços...\x1b[0m');
  child.kill('SIGTERM');
  process.exit(0);
});

child.on('close', (code) => {
  console.log(`\n\x1b[33mServiços finalizados com código: ${code}\x1b[0m`);
  process.exit(code);
});
