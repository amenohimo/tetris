import { defineConfig } from 'vite';

const VERSION = '1.2.0';
const GIT_HASH = 'f80b04c';

export default defineConfig({
  base: './',
  define: {
    __VERSION__: JSON.stringify(`${VERSION}-${GIT_HASH}`),
  },
});