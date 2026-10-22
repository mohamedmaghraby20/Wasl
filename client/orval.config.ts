import { defineConfig } from 'orval';

export default defineConfig({
  wasl: {
    input: { target: '../server/openapi.json' },
    output: {
      mode: 'tags-split',
      target: './src/api/generated/wasl-client.ts',
      client: 'react-query',
      httpClient: 'fetch',
      clean: true,
      mock: {
        indexMockFiles: true,
        path: './src/api/mocks',
        generators: [{ type: 'msw', delay: false }],
      },
      override: {
        mutator: { path: './src/api/fetcher.ts', name: 'waslFetch' },
        fetch: { includeHttpResponseReturnType: false },
      },
    },
  },
});
