import { defineConfig } from 'vite';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
const gitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();

export default defineConfig({
  base: './',
  define: {
    __VERSION__: JSON.stringify(`${pkg.version}-${gitHash}`),
  },
});