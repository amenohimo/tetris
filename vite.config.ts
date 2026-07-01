import { defineConfig } from 'vite';
import { execSync } from 'child_process';

const pkg = JSON.parse(execSync('node -e "process.stdout.write(JSON.stringify(require(\'./package.json\')))"', { encoding: 'utf-8' }));
const gitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();

export default defineConfig({
  base: './',
  define: {
    __VERSION__: JSON.stringify(`${pkg.version}-${gitHash}`),
  },
});