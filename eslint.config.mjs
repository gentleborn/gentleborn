import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
  ]),

  // ============================================================
  // HIPAA: PHI access boundary
  // ============================================================
  // Code OUTSIDE src/lib/phi.ts and src/lib/crypto/** must not import
  // the raw Supabase client or call PHI tables directly. The audit-log
  // contract depends on every PHI read/write going through lib/phi.ts.
  //
  // Allowed importers of @/lib/db/client and @/lib/crypto/*:
  //   - src/lib/phi.ts (the only PHI accessor)
  //   - src/lib/crypto/** (internal)
  //   - scripts/** (server-only scripts; manual review path)
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/lib/phi.ts",
      "src/lib/db/**",
      "src/lib/crypto/**",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/db/client",
              message:
                "Direct DB client access is not allowed. Use lib/phi.ts so PHI reads/writes are audited.",
            },
            {
              name: "@/lib/crypto/provider",
              message:
                "Direct crypto access is not allowed. Use lib/phi.ts.",
            },
            {
              name: "@supabase/supabase-js",
              importNames: ["createClient"],
              message:
                "Do not create Supabase clients directly. Use lib/phi.ts (server) or lib/db/browser (client, when added).",
            },
          ],
          patterns: [
            {
              group: ["**/lib/db/client", "**/lib/crypto/*"],
              message:
                "Direct DB / crypto access is not allowed. Use lib/phi.ts.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
