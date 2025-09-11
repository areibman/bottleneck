const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Building Bottleneck...');

// Clean previous builds
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true });
}

// Build main process
console.log('Building main process...');
execSync('tsc -p tsconfig.main.json', { stdio: 'inherit' });

// Build renderer process
console.log('Building renderer process...');
execSync('webpack --config webpack.renderer.config.js --mode production', { stdio: 'inherit' });

// Copy preload script
fs.copyFileSync(
  path.join('dist', 'preload.js'),
  path.join('dist', 'preload.js')
);

console.log('Build completed successfully!');