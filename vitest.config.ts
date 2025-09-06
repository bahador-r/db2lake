import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // ignore compiled outputs so vitest doesn't try to require() its own ESM API
    exclude: ['**/lib/**', 'node_modules']
  }
});
