// Script para iniciar Expo en Render
const { spawn } = require('child_process');

const port = process.env.PORT || 8081;

console.log(`🚀 Iniciando Expo Metro Bundler en puerto ${port}...`);

const expo = spawn('npx', ['expo', 'start', '--host', '0.0.0.0', '--port', port.toString()], {
  stdio: 'inherit',
  shell: true
});

expo.on('error', (error) => {
  console.error('Error al iniciar Expo:', error);
  process.exit(1);
});

expo.on('exit', (code) => {
  console.log(`Expo terminó con código ${code}`);
  process.exit(code);
});

