import { defineConfig } from 'orval'

// Codegen against ../api/swagger.json (gitignored — regenerate with
// `npm run swagger:generate --workspace=api` first).
//
// Two outputs:
//   - api    : react-query hooks + TS types using existing apiFetch mutator
//   - zod    : runtime zod schemas mirroring API DTOs (used for form
//              validation parity with server-side createZodDto)
export default defineConfig({
  api: {
    input: {
      target: '../api/swagger.json',
    },
    output: {
      target: './src/generated/api.ts',
      client: 'react-query',
      mode: 'single',
      override: {
        mutator: {
          path: './src/lib/orval-mutator.ts',
          name: 'orvalMutator',
        },
      },
    },
  },
  zod: {
    input: {
      target: '../api/swagger.json',
    },
    output: {
      target: './src/generated/zod.ts',
      client: 'zod',
      mode: 'single',
    },
  },
})
